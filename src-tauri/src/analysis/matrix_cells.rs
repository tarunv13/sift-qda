//! The passages behind one matrix cell.

use std::collections::HashSet;

use rusqlite::{params, Connection};
use serde::Serialize;

use super::matrix::{children_of, subtree};
use crate::db::{collect, nodes};
use crate::error::AppResult;

/// Longest passage text returned to the list; the full text opens in the reader.
const MAX_CHARS: usize = 1_200;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CellPassage {
    pub source_id: i64,
    pub source_name: String,
    pub start: i64,
    pub end: i64,
    pub text: String,
    pub code_name: String,
    pub color: String,
}

pub fn passages(
    conn: &Connection,
    project_id: i64,
    code_id: i64,
    rolled_up: bool,
    source_ids: &[i64],
) -> AppResult<Vec<CellPassage>> {
    let codes = if rolled_up {
        subtree(code_id, &children_of(&nodes::list(conn, project_id)?))
    } else {
        vec![code_id]
    };
    let sources: HashSet<i64> = source_ids.iter().copied().collect();

    let mut stmt = conn.prepare(
        "SELECT r.source_id, s.name, r.start_index, r.end_index,
                substr(s.content, r.start_index + 1, r.end_index - r.start_index), n.name, n.color
         FROM coding_references r
         JOIN sources s ON s.id = r.source_id JOIN nodes n ON n.id = r.node_id
         WHERE r.node_id = ?1 AND s.project_id = ?2",
    )?;
    let mut out = Vec::new();
    let mut seen = HashSet::new();
    for code in codes {
        let rows = collect(stmt.query_map(params![code, project_id], |r| {
            Ok(CellPassage {
                source_id: r.get(0)?,
                source_name: r.get(1)?,
                start: r.get(2)?,
                end: r.get(3)?,
                text: r.get(4)?,
                code_name: r.get(5)?,
                color: r.get(6)?,
            })
        })?)?;
        for mut passage in rows {
            if sources.contains(&passage.source_id)
                && seen.insert((passage.source_id, passage.start, passage.end))
            {
                if passage.text.chars().count() > MAX_CHARS {
                    passage.text = passage.text.chars().take(MAX_CHARS).collect::<String>() + "…";
                }
                out.push(passage);
            }
        }
    }
    out.sort_by(|a, b| {
        a.source_name
            .to_lowercase()
            .cmp(&b.source_name.to_lowercase())
            .then(a.start.cmp(&b.start))
    });
    Ok(out)
}
