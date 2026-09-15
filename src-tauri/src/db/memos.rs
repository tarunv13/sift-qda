use rusqlite::{params, Connection, Row};
use serde::Serialize;

use super::{collect, new_guid};
use crate::error::AppResult;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Memo {
    pub id: i64,
    pub project_id: i64,
    pub source_id: Option<i64>,
    pub node_id: Option<i64>,
    pub title: String,
    pub body: String,
    pub updated_at: String,
}

const SELECT: &str =
    "SELECT id, project_id, source_id, node_id, title, body, updated_at FROM memos";

fn from_row(r: &Row) -> rusqlite::Result<Memo> {
    Ok(Memo {
        id: r.get(0)?,
        project_id: r.get(1)?,
        source_id: r.get(2)?,
        node_id: r.get(3)?,
        title: r.get(4)?,
        body: r.get(5)?,
        updated_at: r.get(6)?,
    })
}

pub fn list(conn: &Connection, project_id: i64) -> AppResult<Vec<Memo>> {
    let mut stmt = conn.prepare(&format!(
        "{SELECT} WHERE project_id = ?1 ORDER BY updated_at DESC"
    ))?;
    let rows = stmt.query_map([project_id], from_row)?;
    collect(rows)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Memo> {
    Ok(conn.query_row(&format!("{SELECT} WHERE id = ?1"), [id], from_row)?)
}

pub struct NewMemo<'a> {
    pub project_id: i64,
    pub guid: Option<&'a str>,
    pub source_id: Option<i64>,
    pub node_id: Option<i64>,
    pub title: &'a str,
    pub body: &'a str,
}

pub fn create(conn: &Connection, m: &NewMemo) -> AppResult<Memo> {
    let guid = m.guid.map(str::to_owned).unwrap_or_else(new_guid);
    conn.execute(
        "INSERT INTO memos (guid, project_id, source_id, node_id, title, body)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![guid, m.project_id, m.source_id, m.node_id, m.title, m.body],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update(conn: &Connection, id: i64, title: &str, body: &str) -> AppResult<Memo> {
    conn.execute(
        "UPDATE memos SET title = ?1, body = ?2, updated_at = datetime('now') WHERE id = ?3",
        params![title, body, id],
    )?;
    get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM memos WHERE id = ?1", [id])?;
    Ok(())
}
