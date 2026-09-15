//! Editing cases and attributes by hand.

use rusqlite::{params, Connection};

use super::cases;
use crate::error::{AppError, AppResult};

fn required<'a>(name: &'a str, what: &str) -> AppResult<&'a str> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::Invalid(format!("{what} name cannot be empty")));
    }
    Ok(name)
}

pub fn create_case(
    conn: &Connection,
    project_id: i64,
    name: &str,
    source_id: Option<i64>,
) -> AppResult<i64> {
    let name = required(name, "case")?;
    let id = cases::create_case(conn, project_id, None, name, None)?;
    link_source(conn, id, source_id)?;
    Ok(id)
}

pub fn rename_case(conn: &Connection, id: i64, name: &str) -> AppResult<()> {
    let name = required(name, "case")?;
    conn.execute(
        "UPDATE cases SET name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

/// Links a case to a source of the same project, or unlinks it with `None`.
pub fn link_source(conn: &Connection, id: i64, source_id: Option<i64>) -> AppResult<()> {
    if let Some(source) = source_id {
        let same: Option<bool> = conn.query_row(
            "SELECT (SELECT project_id FROM cases WHERE id = ?1) = (SELECT project_id FROM sources WHERE id = ?2)",
            params![id, source],
            |r| r.get(0),
        )?;
        if same != Some(true) {
            return Err(AppError::Invalid(
                "the source is not in this case's project".into(),
            ));
        }
    }
    conn.execute(
        "UPDATE cases SET source_id = ?1 WHERE id = ?2",
        params![source_id, id],
    )?;
    Ok(())
}

pub fn delete_case(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM cases WHERE id = ?1", [id])?;
    Ok(())
}

fn attribute_taken(conn: &Connection, project_id: i64, name: &str, except: i64) -> AppResult<bool> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM attributes WHERE project_id = ?1 AND name = ?2 COLLATE NOCASE AND id <> ?3",
        params![project_id, name, except],
        |r| r.get(0),
    )?;
    Ok(count > 0)
}

pub fn create_attribute(conn: &Connection, project_id: i64, name: &str) -> AppResult<i64> {
    let name = required(name, "attribute")?;
    if attribute_taken(conn, project_id, name, 0)? {
        return Err(AppError::Invalid(format!(
            "an attribute called “{name}” already exists"
        )));
    }
    cases::ensure_attribute(conn, project_id, name, "Text", None)
}

pub fn rename_attribute(conn: &Connection, id: i64, name: &str) -> AppResult<()> {
    let name = required(name, "attribute")?;
    let project_id: i64 = conn.query_row(
        "SELECT project_id FROM attributes WHERE id = ?1",
        [id],
        |r| r.get(0),
    )?;
    if attribute_taken(conn, project_id, name, id)? {
        return Err(AppError::Invalid(format!(
            "an attribute called “{name}” already exists"
        )));
    }
    conn.execute(
        "UPDATE attributes SET name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

pub fn delete_attribute(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM attributes WHERE id = ?1", [id])?;
    Ok(())
}

/// Sets a case's value for an attribute; an empty value clears it.
pub fn set_value(conn: &Connection, case_id: i64, attribute_id: i64, value: &str) -> AppResult<()> {
    let value = value.trim();
    if value.is_empty() {
        conn.execute(
            "DELETE FROM case_attribute_values WHERE case_id = ?1 AND attribute_id = ?2",
            params![case_id, attribute_id],
        )?;
        return Ok(());
    }
    cases::set_value(conn, case_id, attribute_id, value)
}

/// Creates a case, named after its source, for every source that has no case yet.
pub fn cases_for_sources(conn: &Connection, project_id: i64) -> AppResult<usize> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name FROM sources s
         WHERE s.project_id = ?1 AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.source_id = s.id)
         ORDER BY s.name COLLATE NOCASE",
    )?;
    let missing = super::collect(stmt.query_map([project_id], |r| {
        Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
    })?)?;
    for (source_id, name) in &missing {
        cases::create_case(conn, project_id, Some(*source_id), name, None)?;
    }
    Ok(missing.len())
}
