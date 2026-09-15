//! Coding queries: passages coded at one code on their own, and/or/but-not/near another,
//! optionally limited to sources whose case has a given attribute value.

use std::collections::{HashMap, HashSet};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::matrix::{children_of, subtree};
use super::ranges::{self, Range};
use crate::db::{collect, nodes};
use crate::error::AppResult;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Operator {
    Only,
    And,
    Or,
    Not,
    Near,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributeFilter {
    pub attribute_id: i64,
    pub value: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuerySpec {
    pub a: i64,
    pub operator: Operator,
    pub b: Option<i64>,
    /// Characters allowed between passages for `near`.
    pub distance: i64,
    pub include_sub_codes: bool,
    pub filter: Option<AttributeFilter>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryHit {
    pub source_id: i64,
    pub source_name: String,
    pub start: i64,
    pub end: i64,
    pub text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub hits: Vec<QueryHit>,
    pub sources: i64,
    pub truncated: bool,
}

fn code_set(conn: &Connection, project_id: i64, id: i64, include: bool) -> AppResult<Vec<i64>> {
    if !include {
        return Ok(vec![id]);
    }
    Ok(subtree(id, &children_of(&nodes::list(conn, project_id)?)))
}

/// Merged coded ranges per source for a set of codes.
fn ranges_for(
    conn: &Connection,
    project_id: i64,
    codes: &[i64],
) -> AppResult<HashMap<i64, Vec<Range>>> {
    let mut stmt = conn.prepare(
        "SELECT r.source_id, r.start_index, r.end_index FROM coding_references r
         JOIN sources s ON s.id = r.source_id WHERE r.node_id = ?1 AND s.project_id = ?2",
    )?;
    let mut map: HashMap<i64, Vec<Range>> = HashMap::new();
    for code in codes {
        let rows = collect(stmt.query_map(params![code, project_id], |r| {
            Ok((r.get::<_, i64>(0)?, (r.get(1)?, r.get(2)?)))
        })?)?;
        for (source, range) in rows {
            map.entry(source).or_default().push(range);
        }
    }
    Ok(map
        .into_iter()
        .map(|(k, v)| (k, ranges::merge(v)))
        .collect())
}

fn allowed_sources(
    conn: &Connection,
    project_id: i64,
    filter: &AttributeFilter,
) -> AppResult<HashSet<i64>> {
    let mut stmt = conn.prepare(
        "SELECT c.source_id FROM cases c JOIN case_attribute_values v ON v.case_id = c.id
         WHERE c.project_id = ?1 AND v.attribute_id = ?2 AND c.source_id IS NOT NULL
           AND lower(trim(v.value)) = lower(trim(?3))",
    )?;
    let rows = collect(stmt.query_map(
        params![project_id, filter.attribute_id, filter.value],
        |r| r.get(0),
    )?)?;
    Ok(rows.into_iter().collect())
}

/// Every matching stretch as (source, range), before any text is attached.
pub fn matching(
    conn: &Connection,
    project_id: i64,
    spec: &QuerySpec,
) -> AppResult<Vec<(i64, Range)>> {
    let a = ranges_for(
        conn,
        project_id,
        &code_set(conn, project_id, spec.a, spec.include_sub_codes)?,
    )?;
    let b = match spec.b {
        Some(id) => ranges_for(
            conn,
            project_id,
            &code_set(conn, project_id, id, spec.include_sub_codes)?,
        )?,
        None => HashMap::new(),
    };
    let allowed = spec
        .filter
        .as_ref()
        .map(|f| allowed_sources(conn, project_id, f))
        .transpose()?;
    let sources: HashSet<i64> = match spec.operator {
        Operator::Or => a.keys().chain(b.keys()).copied().collect(),
        _ => a.keys().copied().collect(),
    };

    let empty = Vec::new();
    let mut out = Vec::new();
    for source in sources {
        if allowed.as_ref().is_some_and(|set| !set.contains(&source)) {
            continue;
        }
        let ra = a.get(&source).unwrap_or(&empty);
        let rb = b.get(&source).unwrap_or(&empty);
        let found = match (spec.operator, spec.b.is_some()) {
            (Operator::Only, _) | (_, false) => ra.clone(),
            (Operator::And, true) => ranges::intersect(ra, rb),
            (Operator::Or, true) => ranges::merge(ra.iter().chain(rb).copied().collect()),
            (Operator::Not, true) => ranges::subtract(ra, rb),
            (Operator::Near, true) => ranges::near(ra, rb, spec.distance.max(0)),
        };
        out.extend(found.into_iter().map(|range| (source, range)));
    }
    Ok(out)
}
