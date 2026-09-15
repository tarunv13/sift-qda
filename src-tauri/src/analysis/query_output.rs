//! What a coding query produces: result passages with their text, or a new code holding them.

use std::collections::{HashMap, HashSet};

use rusqlite::Connection;

use super::query::{matching, QueryHit, QueryResult, QuerySpec};
use crate::db::nodes::{self, NewNode};
use crate::db::{collect, references};
use crate::error::{AppError, AppResult};
use crate::text::char_slice;

const MAX_HITS: usize = 1_000;
const MAX_CHARS: usize = 1_200;

pub fn run(conn: &Connection, project_id: i64, spec: &QuerySpec) -> AppResult<QueryResult> {
    let found = matching(conn, project_id, spec)?;
    let wanted: HashSet<i64> = found.iter().map(|(s, _)| *s).collect();
    let mut stmt = conn.prepare("SELECT id, name, content FROM sources WHERE project_id = ?1")?;
    let sources: HashMap<i64, (String, String)> = collect(stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            (r.get::<_, String>(1)?, r.get::<_, String>(2)?),
        ))
    })?)?
    .into_iter()
    .filter(|(id, _)| wanted.contains(id))
    .collect();

    let mut hits: Vec<QueryHit> = found
        .into_iter()
        .filter_map(|(source_id, (start, end))| {
            let (name, content) = sources.get(&source_id)?;
            let mut text = char_slice(content, start, end);
            if text.chars().count() > MAX_CHARS {
                text = text.chars().take(MAX_CHARS).collect::<String>() + "…";
            }
            Some(QueryHit {
                source_id,
                source_name: name.clone(),
                start,
                end,
                text,
            })
        })
        .collect();
    hits.sort_by(|x, y| {
        x.source_name
            .to_lowercase()
            .cmp(&y.source_name.to_lowercase())
            .then(x.source_id.cmp(&y.source_id))
            .then(x.start.cmp(&y.start))
    });
    let truncated = hits.len() > MAX_HITS;
    hits.truncate(MAX_HITS);
    Ok(QueryResult {
        hits,
        sources: wanted.len() as i64,
        truncated,
    })
}

/// Codes every matching stretch at a new top-level code, in one transaction.
pub fn save_as_code(
    conn: &Connection,
    project_id: i64,
    spec: &QuerySpec,
    name: &str,
    color: &str,
) -> AppResult<i64> {
    let found = matching(conn, project_id, spec)?;
    if found.is_empty() {
        return Err(AppError::Invalid(
            "the query found no passages to code".into(),
        ));
    }
    let tx = conn.unchecked_transaction()?;
    let node = nodes::create(
        &tx,
        &NewNode {
            project_id,
            guid: None,
            parent_id: None,
            name: name.trim(),
            color,
            description: "Created from a coding query",
        },
    )?;
    for (source, (start, end)) in found {
        references::insert(&tx, source, node, start, end, None)?;
    }
    tx.commit()?;
    Ok(node)
}
