//! Annotations: comments attached to a stretch of a source.

use rusqlite::{params, Connection};
use serde::Serialize;

use super::{collect, new_guid, sources};
use crate::error::{AppError, AppResult};
use crate::text::char_slice;

/// Longest quoted passage returned with a note; the reader shows the rest.
pub const MAX_QUOTE: usize = 400;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    pub id: i64,
    pub source_id: i64,
    pub start: i64,
    pub end: i64,
    pub body: String,
    pub text: String,
    pub created_at: String,
}

/// The source text, after checking that `[start, end)` lies inside it.
pub fn checked_content(
    conn: &Connection,
    source_id: i64,
    start: i64,
    end: i64,
) -> AppResult<String> {
    let content = sources::content(conn, source_id)?;
    let length = content.chars().count() as i64;
    if start < 0 || end <= start || end > length {
        return Err(AppError::Invalid(format!(
            "selection {start}..{end} is outside the source (length {length})"
        )));
    }
    Ok(content)
}

/// The quoted passage, shortened for lists.
pub fn quote(content: &str, start: i64, end: i64) -> String {
    let text = char_slice(content, start, end);
    if text.chars().count() > MAX_QUOTE {
        text.chars().take(MAX_QUOTE).collect::<String>() + "…"
    } else {
        text
    }
}

pub fn create(
    conn: &Connection,
    source_id: i64,
    start: i64,
    end: i64,
    body: &str,
) -> AppResult<i64> {
    checked_content(conn, source_id, start, end)?;
    conn.execute(
        "INSERT INTO annotations (guid, source_id, start_index, end_index, body)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![new_guid(), source_id, start, end, body.trim()],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update(conn: &Connection, id: i64, body: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE annotations SET body = ?1 WHERE id = ?2",
        params![body, id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM annotations WHERE id = ?1", [id])?;
    Ok(())
}

pub fn for_source(conn: &Connection, source_id: i64) -> AppResult<Vec<Annotation>> {
    let content = sources::content(conn, source_id)?;
    let mut stmt = conn.prepare(
        "SELECT id, source_id, start_index, end_index, body, created_at FROM annotations
         WHERE source_id = ?1 ORDER BY start_index, id",
    )?;
    let rows = collect(stmt.query_map([source_id], |r| {
        Ok(Annotation {
            id: r.get(0)?,
            source_id: r.get(1)?,
            start: r.get(2)?,
            end: r.get(3)?,
            body: r.get(4)?,
            text: String::new(),
            created_at: r.get(5)?,
        })
    })?)?;
    Ok(rows
        .into_iter()
        .map(|mut a| {
            a.text = quote(&content, a.start, a.end);
            a
        })
        .collect())
}
