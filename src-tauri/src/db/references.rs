use rusqlite::{params, Connection, Row};
use serde::Serialize;

use super::{collect, new_guid, sources};
use crate::error::{AppError, AppResult};
use crate::text::char_slice;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodingReference {
    pub id: i64,
    pub source_id: i64,
    pub node_id: i64,
    pub start_index: i64,
    pub end_index: i64,
    pub node_name: String,
    pub color: String,
}

/// A reference with its quoted text, for the "all references of a code" view.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuotedReference {
    #[serde(flatten)]
    pub reference: CodingReference,
    pub source_name: String,
    pub text: String,
}

const SELECT: &str =
    "SELECT r.id, r.source_id, r.node_id, r.start_index, r.end_index, n.name, n.color
    FROM coding_references r JOIN nodes n ON n.id = r.node_id";

fn from_row(r: &Row) -> rusqlite::Result<CodingReference> {
    Ok(CodingReference {
        id: r.get(0)?,
        source_id: r.get(1)?,
        node_id: r.get(2)?,
        start_index: r.get(3)?,
        end_index: r.get(4)?,
        node_name: r.get(5)?,
        color: r.get(6)?,
    })
}

pub fn insert(
    conn: &Connection,
    source_id: i64,
    node_id: i64,
    start: i64,
    end: i64,
    guid: Option<&str>,
) -> AppResult<CodingReference> {
    let length = sources::content(conn, source_id)?.chars().count() as i64;
    if start < 0 || end <= start || end > length {
        return Err(AppError::Invalid(format!(
            "selection {start}..{end} is outside the source (length {length})"
        )));
    }
    let guid = guid.map(str::to_owned).unwrap_or_else(new_guid);
    // Coding the same span with the same code twice is a no-op, not an error.
    conn.execute(
        "INSERT INTO coding_references (guid, source_id, node_id, start_index, end_index)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (source_id, node_id, start_index, end_index) DO NOTHING",
        params![guid, source_id, node_id, start, end],
    )?;
    let sql = format!(
        "{SELECT} WHERE r.source_id = ?1 AND r.node_id = ?2 AND r.start_index = ?3 AND r.end_index = ?4"
    );
    Ok(conn.query_row(&sql, params![source_id, node_id, start, end], from_row)?)
}

pub fn for_source(conn: &Connection, source_id: i64) -> AppResult<Vec<CodingReference>> {
    let sql = format!("{SELECT} WHERE r.source_id = ?1 ORDER BY r.start_index");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([source_id], from_row)?;
    collect(rows)
}

pub fn for_node(conn: &Connection, node_id: i64) -> AppResult<Vec<QuotedReference>> {
    let sql = "SELECT r.id, r.source_id, r.node_id, r.start_index, r.end_index, n.name, n.color, s.name, s.content
         FROM coding_references r JOIN nodes n ON n.id = r.node_id JOIN sources s ON s.id = r.source_id
         WHERE r.node_id = ?1 ORDER BY s.name COLLATE NOCASE, r.start_index";
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([node_id], |r| {
        let reference = from_row(r)?;
        let content: String = r.get(8)?;
        let text = char_slice(&content, reference.start_index, reference.end_index);
        Ok(QuotedReference {
            reference,
            source_name: r.get(7)?,
            text,
        })
    })?;
    collect(rows)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM coding_references WHERE id = ?1", [id])?;
    Ok(())
}
