//! Columns added after 0.1.0, applied to databases created by earlier versions.

use rusqlite::Connection;

use crate::error::AppResult;

pub fn run(conn: &Connection) -> AppResult<()> {
    add_column(
        conn,
        "memos",
        "case_id",
        "INTEGER REFERENCES cases(id) ON DELETE SET NULL",
    )
}

fn add_column(conn: &Connection, table: &str, column: &str, definition: &str) -> AppResult<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let names = super::collect(stmt.query_map([], |r| r.get::<_, String>(1))?)?;
    if !names.iter().any(|name| name == column) {
        conn.execute_batch(&format!(
            "ALTER TABLE {table} ADD COLUMN {column} {definition}"
        ))?;
    }
    Ok(())
}
