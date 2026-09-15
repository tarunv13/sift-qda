use rusqlite::{params, Connection, Row};
use serde::Serialize;

use super::{collect, new_guid};
use crate::error::AppResult;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub guid: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
}

const COLUMNS: &str = "id, guid, name, description, created_at";

fn from_row(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        guid: row.get(1)?,
        name: row.get(2)?,
        description: row.get(3)?,
        created_at: row.get(4)?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<Project>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM projects ORDER BY created_at DESC"
    ))?;
    let rows = stmt.query_map([], from_row)?;
    collect(rows)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Project> {
    let sql = format!("SELECT {COLUMNS} FROM projects WHERE id = ?1");
    Ok(conn.query_row(&sql, [id], from_row)?)
}

pub fn create(conn: &Connection, name: &str, description: &str) -> AppResult<Project> {
    conn.execute(
        "INSERT INTO projects (guid, name, description) VALUES (?1, ?2, ?3)",
        params![new_guid(), name, description],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn rename(conn: &Connection, id: i64, name: &str) -> AppResult<Project> {
    conn.execute(
        "UPDATE projects SET name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}
