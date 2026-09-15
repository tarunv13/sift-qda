//! The text an analysis reads: a whole project, one source, or the passages coded at one code.

use std::collections::hash_map::Entry;
use std::collections::HashMap;

use rusqlite::{params, Connection};
use serde::Deserialize;

use crate::db::sources;
use crate::error::AppResult;
use crate::text::char_slice;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Scope {
    Project,
    Source { id: i64 },
    Code { id: i64 },
}

/// A stretch of source text; `offset` is where it starts in the source, in code points.
pub struct Span {
    pub source_id: i64,
    pub source_name: String,
    pub offset: i64,
    pub text: String,
}

pub fn spans(conn: &Connection, project_id: i64, scope: Scope) -> AppResult<Vec<Span>> {
    match scope {
        Scope::Project => whole_sources(conn, project_id, None),
        Scope::Source { id } => whole_sources(conn, project_id, Some(id)),
        Scope::Code { id } => coded_passages(conn, project_id, id),
    }
}

fn whole_sources(
    conn: &Connection,
    project_id: i64,
    source_id: Option<i64>,
) -> AppResult<Vec<Span>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, content FROM sources
         WHERE project_id = ?1 AND (?2 IS NULL OR id = ?2)
         ORDER BY name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map(params![project_id, source_id], |r| {
        Ok(Span {
            source_id: r.get(0)?,
            source_name: r.get(1)?,
            offset: 0,
            text: r.get(2)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Passages coded at a code. Overlapping passages in one source are merged so no word counts twice.
fn coded_passages(conn: &Connection, project_id: i64, node_id: i64) -> AppResult<Vec<Span>> {
    let mut stmt = conn.prepare(
        "SELECT r.source_id, s.name, r.start_index, r.end_index
         FROM coding_references r JOIN sources s ON s.id = r.source_id
         WHERE r.node_id = ?1 AND s.project_id = ?2
         ORDER BY s.name COLLATE NOCASE, r.source_id, r.start_index",
    )?;
    let rows = stmt.query_map(params![node_id, project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, i64>(2)?,
            r.get::<_, i64>(3)?,
        ))
    })?;

    let mut merged: Vec<(i64, String, i64, i64)> = Vec::new();
    for row in rows {
        let (source_id, name, start, end) = row?;
        match merged.last_mut() {
            Some(last) if last.0 == source_id && start <= last.3 => last.3 = last.3.max(end),
            _ => merged.push((source_id, name, start, end)),
        }
    }

    let mut contents: HashMap<i64, String> = HashMap::new();
    let mut out = Vec::with_capacity(merged.len());
    for (source_id, source_name, start, end) in merged {
        let content = match contents.entry(source_id) {
            Entry::Occupied(entry) => entry.into_mut(),
            Entry::Vacant(entry) => entry.insert(sources::content(conn, source_id)?),
        };
        out.push(Span {
            source_id,
            source_name,
            offset: start,
            text: char_slice(content, start, end),
        });
    }
    Ok(out)
}
