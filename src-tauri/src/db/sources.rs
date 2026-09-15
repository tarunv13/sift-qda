use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use super::{collect, new_guid};
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceSummary {
    pub id: i64,
    pub name: String,
    pub kind: String,
    pub reference_count: i64,
    pub created_at: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PageRange {
    pub page: i64,
    pub start: i64,
    pub end: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    pub id: i64,
    pub guid: String,
    pub project_id: i64,
    pub name: String,
    pub kind: String,
    pub file_path: Option<String>,
    pub content: String,
    pub metadata: serde_json::Value,
    pub pages: Vec<PageRange>,
}

pub struct NewSource<'a> {
    pub project_id: i64,
    pub guid: Option<&'a str>,
    pub name: &'a str,
    pub kind: &'a str,
    pub file_path: Option<&'a str>,
    pub content: &'a str,
    pub metadata: &'a serde_json::Value,
}

pub fn insert(conn: &Connection, s: &NewSource) -> AppResult<i64> {
    let guid = s.guid.map(str::to_owned).unwrap_or_else(new_guid);
    conn.execute(
        "INSERT INTO sources (guid, project_id, name, kind, file_path, content, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            guid,
            s.project_id,
            s.name,
            s.kind,
            s.file_path,
            s.content,
            s.metadata.to_string()
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn insert_pages(conn: &Connection, source_id: i64, pages: &[PageRange]) -> AppResult<()> {
    let mut stmt = conn.prepare(
        "INSERT INTO source_pages (source_id, page, start_offset, end_offset) VALUES (?1, ?2, ?3, ?4)",
    )?;
    for p in pages {
        stmt.execute(params![source_id, p.page, p.start, p.end])?;
    }
    Ok(())
}

pub fn list(conn: &Connection, project_id: i64) -> AppResult<Vec<SourceSummary>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.kind, s.created_at,
                (SELECT COUNT(*) FROM coding_references r WHERE r.source_id = s.id)
         FROM sources s WHERE s.project_id = ?1 ORDER BY s.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([project_id], |r| {
        Ok(SourceSummary {
            id: r.get(0)?,
            name: r.get(1)?,
            kind: r.get(2)?,
            created_at: r.get(3)?,
            reference_count: r.get(4)?,
        })
    })?;
    collect(rows)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Source> {
    let source = conn
        .query_row(
            "SELECT id, guid, project_id, name, kind, file_path, content, metadata FROM sources WHERE id = ?1",
            [id],
            |r| {
                let metadata: String = r.get(7)?;
                Ok(Source {
                    id: r.get(0)?,
                    guid: r.get(1)?,
                    project_id: r.get(2)?,
                    name: r.get(3)?,
                    kind: r.get(4)?,
                    file_path: r.get(5)?,
                    content: r.get(6)?,
                    metadata: serde_json::from_str(&metadata).unwrap_or_default(),
                    pages: Vec::new(),
                })
            },
        )
        .optional()?
        .ok_or_else(|| AppError::Invalid(format!("source {id} not found")))?;
    Ok(Source {
        pages: pages(conn, id)?,
        ..source
    })
}

pub fn pages(conn: &Connection, source_id: i64) -> AppResult<Vec<PageRange>> {
    let mut stmt = conn.prepare(
        "SELECT page, start_offset, end_offset FROM source_pages WHERE source_id = ?1 ORDER BY page",
    )?;
    let rows = stmt.query_map([source_id], |r| {
        Ok(PageRange {
            page: r.get(0)?,
            start: r.get(1)?,
            end: r.get(2)?,
        })
    })?;
    collect(rows)
}

pub fn content(conn: &Connection, id: i64) -> AppResult<String> {
    Ok(
        conn.query_row("SELECT content FROM sources WHERE id = ?1", [id], |r| {
            r.get(0)
        })?,
    )
}

pub fn rename(conn: &Connection, id: i64, name: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE sources SET name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM sources WHERE id = ?1", [id])?;
    Ok(())
}
