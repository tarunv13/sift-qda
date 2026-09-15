//! Matrix columns: each source, each case (through its linked source), or each value of one attribute.

use std::collections::BTreeMap;

use rusqlite::{params, Connection};

use super::matrix::{Columns, MatrixColumn};
use crate::db::collect;
use crate::error::AppResult;

const NO_VALUE: &str = "(no value)";

fn column(label: String, mut source_ids: Vec<i64>) -> MatrixColumn {
    source_ids.sort_unstable();
    source_ids.dedup();
    MatrixColumn {
        label,
        source_ids,
        total: 0,
    }
}

/// The columns, plus how many cases had no linked source and so could not be counted.
pub fn load(
    conn: &Connection,
    project_id: i64,
    kind: Columns,
) -> AppResult<(Vec<MatrixColumn>, i64)> {
    match kind {
        Columns::Sources => {
            let mut stmt = conn.prepare(
                "SELECT id, name FROM sources WHERE project_id = ?1 ORDER BY name COLLATE NOCASE",
            )?;
            let rows = collect(stmt.query_map([project_id], |r| {
                Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
            })?)?;
            Ok((
                rows.into_iter()
                    .map(|(id, name)| column(name, vec![id]))
                    .collect(),
                0,
            ))
        }
        Columns::Cases => {
            let mut stmt = conn.prepare(
                "SELECT name, source_id FROM cases WHERE project_id = ?1 ORDER BY name COLLATE NOCASE",
            )?;
            let rows = collect(stmt.query_map([project_id], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, Option<i64>>(1)?))
            })?)?;
            let unlinked = rows.iter().filter(|(_, s)| s.is_none()).count() as i64;
            let columns = rows
                .into_iter()
                .filter_map(|(name, source)| source.map(|id| column(name, vec![id])))
                .collect();
            Ok((columns, unlinked))
        }
        Columns::Attribute { id } => attribute_columns(conn, project_id, id),
    }
}

fn attribute_columns(
    conn: &Connection,
    project_id: i64,
    attribute_id: i64,
) -> AppResult<(Vec<MatrixColumn>, i64)> {
    let mut stmt = conn.prepare(
        "SELECT c.source_id, COALESCE(v.value, '') FROM cases c
         LEFT JOIN case_attribute_values v ON v.case_id = c.id AND v.attribute_id = ?2
         WHERE c.project_id = ?1",
    )?;
    let rows = collect(stmt.query_map(params![project_id, attribute_id], |r| {
        Ok((r.get::<_, Option<i64>>(0)?, r.get::<_, String>(1)?))
    })?)?;

    let mut unlinked = 0;
    let mut groups: BTreeMap<String, Vec<i64>> = BTreeMap::new();
    for (source, value) in rows {
        let value = value.trim().to_string();
        match source {
            Some(id) => groups.entry(value).or_default().push(id),
            None => unlinked += 1,
        }
    }

    let mut entries: Vec<(String, Vec<i64>)> = groups.into_iter().collect();
    let numeric = entries
        .iter()
        .all(|(v, _)| v.is_empty() || v.parse::<f64>().is_ok());
    entries.sort_by(|(a, _), (b, _)| {
        // Blank values go last; numbers sort by value; everything else alphabetically.
        (a.is_empty(), b.is_empty())
            .cmp(&(false, false))
            .then_with(|| match (a.is_empty(), b.is_empty()) {
                (true, false) => std::cmp::Ordering::Greater,
                (false, true) => std::cmp::Ordering::Less,
                _ if numeric => a
                    .parse::<f64>()
                    .unwrap_or(0.0)
                    .total_cmp(&b.parse::<f64>().unwrap_or(0.0)),
                _ => a.to_lowercase().cmp(&b.to_lowercase()),
            })
    });

    let columns = entries
        .into_iter()
        .map(|(value, ids)| {
            let label = if value.is_empty() {
                NO_VALUE.to_string()
            } else {
                value
            };
            column(label, ids)
        })
        .collect();
    Ok((columns, unlinked))
}
