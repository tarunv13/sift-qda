use rusqlite::{params, Connection};
use serde::Serialize;

use super::{collect, new_guid};
use crate::error::AppResult;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Attribute {
    pub id: i64,
    pub name: String,
    pub value_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Case {
    pub id: i64,
    pub name: String,
    pub source_id: Option<i64>,
    /// Values aligned with `CaseTable::attributes`; empty string when unset.
    pub values: Vec<String>,
}

#[derive(Serialize)]
pub struct CaseTable {
    pub attributes: Vec<Attribute>,
    pub cases: Vec<Case>,
}

pub fn create_case(
    conn: &Connection,
    project_id: i64,
    source_id: Option<i64>,
    name: &str,
    guid: Option<&str>,
) -> AppResult<i64> {
    let guid = guid.map(str::to_owned).unwrap_or_else(new_guid);
    conn.execute(
        "INSERT INTO cases (guid, project_id, source_id, name) VALUES (?1, ?2, ?3, ?4)",
        params![guid, project_id, source_id, name],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Returns the attribute id, creating the attribute when it does not exist yet.
pub fn ensure_attribute(
    conn: &Connection,
    project_id: i64,
    name: &str,
    value_type: &str,
    guid: Option<&str>,
) -> AppResult<i64> {
    let guid = guid.map(str::to_owned).unwrap_or_else(new_guid);
    conn.execute(
        "INSERT INTO attributes (guid, project_id, name, value_type) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (project_id, name) DO NOTHING",
        params![guid, project_id, name, value_type],
    )?;
    Ok(conn.query_row(
        "SELECT id FROM attributes WHERE project_id = ?1 AND name = ?2",
        params![project_id, name],
        |r| r.get(0),
    )?)
}

pub fn set_value(conn: &Connection, case_id: i64, attribute_id: i64, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO case_attribute_values (case_id, attribute_id, value) VALUES (?1, ?2, ?3)
         ON CONFLICT (case_id, attribute_id) DO UPDATE SET value = excluded.value",
        params![case_id, attribute_id, value],
    )?;
    Ok(())
}

pub fn table(conn: &Connection, project_id: i64) -> AppResult<CaseTable> {
    let mut stmt = conn
        .prepare("SELECT id, name, value_type FROM attributes WHERE project_id = ?1 ORDER BY id")?;
    let attributes = collect(stmt.query_map([project_id], |r| {
        Ok(Attribute {
            id: r.get(0)?,
            name: r.get(1)?,
            value_type: r.get(2)?,
        })
    })?)?;

    let mut stmt = conn.prepare(
        "SELECT id, name, source_id FROM cases WHERE project_id = ?1 ORDER BY name COLLATE NOCASE",
    )?;
    let mut cases = collect(stmt.query_map([project_id], |r| {
        Ok(Case {
            id: r.get(0)?,
            name: r.get(1)?,
            source_id: r.get(2)?,
            values: Vec::new(),
        })
    })?)?;

    let mut stmt =
        conn.prepare("SELECT attribute_id, value FROM case_attribute_values WHERE case_id = ?1")?;
    for case in &mut cases {
        case.values = vec![String::new(); attributes.len()];
        let values = collect(stmt.query_map([case.id], |r| {
            Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
        })?)?;
        for (attribute_id, value) in values {
            if let Some(i) = attributes.iter().position(|a| a.id == attribute_id) {
                case.values[i] = value;
            }
        }
    }
    Ok(CaseTable { attributes, cases })
}
