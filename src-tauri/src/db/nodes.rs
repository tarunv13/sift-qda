use rusqlite::{params, Connection, Row};
use serde::Serialize;

use super::{collect, new_guid};
use crate::error::{AppError, AppResult};

/// A thematic code. Nodes form a tree through `parent_id`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: i64,
    pub guid: String,
    pub parent_id: Option<i64>,
    pub name: String,
    pub color: String,
    pub description: String,
    pub reference_count: i64,
    pub source_count: i64,
}

const SELECT: &str = "SELECT n.id, n.guid, n.parent_id, n.name, n.color, n.description,
        (SELECT COUNT(*) FROM coding_references r WHERE r.node_id = n.id),
        (SELECT COUNT(DISTINCT r.source_id) FROM coding_references r WHERE r.node_id = n.id)
    FROM nodes n";

fn from_row(r: &Row) -> rusqlite::Result<Node> {
    Ok(Node {
        id: r.get(0)?,
        guid: r.get(1)?,
        parent_id: r.get(2)?,
        name: r.get(3)?,
        color: r.get(4)?,
        description: r.get(5)?,
        reference_count: r.get(6)?,
        source_count: r.get(7)?,
    })
}

pub fn list(conn: &Connection, project_id: i64) -> AppResult<Vec<Node>> {
    let sql = format!("{SELECT} WHERE n.project_id = ?1 ORDER BY n.name COLLATE NOCASE");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([project_id], from_row)?;
    collect(rows)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Node> {
    Ok(conn.query_row(&format!("{SELECT} WHERE n.id = ?1"), [id], from_row)?)
}

pub struct NewNode<'a> {
    pub project_id: i64,
    pub guid: Option<&'a str>,
    pub parent_id: Option<i64>,
    pub name: &'a str,
    pub color: &'a str,
    pub description: &'a str,
}

pub fn create(conn: &Connection, n: &NewNode) -> AppResult<i64> {
    if n.name.trim().is_empty() {
        return Err(AppError::Invalid("code name cannot be empty".into()));
    }
    let guid = n.guid.map(str::to_owned).unwrap_or_else(new_guid);
    conn.execute(
        "INSERT INTO nodes (guid, project_id, parent_id, name, color, description)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            guid,
            n.project_id,
            n.parent_id,
            n.name.trim(),
            n.color,
            n.description
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update(
    conn: &Connection,
    id: i64,
    name: &str,
    color: &str,
    description: &str,
    parent_id: Option<i64>,
) -> AppResult<Node> {
    if parent_id == Some(id)
        || parent_id.is_some_and(|p| is_descendant(conn, p, id).unwrap_or(true))
    {
        return Err(AppError::Invalid(
            "a code cannot be moved inside itself".into(),
        ));
    }
    conn.execute(
        "UPDATE nodes SET name = ?1, color = ?2, description = ?3, parent_id = ?4 WHERE id = ?5",
        params![name.trim(), color, description, parent_id, id],
    )?;
    get(conn, id)
}

/// True when `candidate` sits somewhere below `ancestor` in the tree.
fn is_descendant(conn: &Connection, candidate: i64, ancestor: i64) -> AppResult<bool> {
    let found: i64 = conn.query_row(
        "WITH RECURSIVE sub(id) AS (
             SELECT id FROM nodes WHERE parent_id = ?1
             UNION SELECT n.id FROM nodes n JOIN sub ON n.parent_id = sub.id)
         SELECT COUNT(*) FROM sub WHERE id = ?2",
        params![ancestor, candidate],
        |r| r.get(0),
    )?;
    Ok(found > 0)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM nodes WHERE id = ?1", [id])?;
    Ok(())
}
