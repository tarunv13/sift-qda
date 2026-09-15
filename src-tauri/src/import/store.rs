use rusqlite::Connection;

use super::{Parsed, SheetTable};
use crate::ai::chunk;
use crate::db::cases;
use crate::db::sources::{self, NewSource};
use crate::error::AppResult;

/// Persists a parsed file as a source, with its pages, cases and search chunks.
pub fn store(
    conn: &Connection,
    project_id: i64,
    name: &str,
    file_path: &str,
    parsed: &Parsed,
) -> AppResult<i64> {
    let source_id = sources::insert(
        conn,
        &NewSource {
            project_id,
            guid: None,
            name,
            kind: parsed.kind,
            file_path: Some(file_path),
            content: &parsed.content,
            metadata: &parsed.metadata,
        },
    )?;
    sources::insert_pages(conn, source_id, &parsed.pages)?;
    if let Some(table) = &parsed.table {
        store_cases(conn, project_id, source_id, table)?;
    }
    chunk::store(conn, source_id, &parsed.content)?;
    Ok(source_id)
}

fn store_cases(
    conn: &Connection,
    project_id: i64,
    source_id: i64,
    table: &SheetTable,
) -> AppResult<()> {
    let attribute_ids = table
        .headers
        .iter()
        .zip(&table.value_types)
        .skip(1)
        .map(|(name, value_type)| cases::ensure_attribute(conn, project_id, name, value_type, None))
        .collect::<AppResult<Vec<i64>>>()?;

    for row in &table.rows {
        let case_id = cases::create_case(conn, project_id, Some(source_id), &row[0], None)?;
        for (attribute_id, value) in attribute_ids.iter().zip(row.iter().skip(1)) {
            if !value.is_empty() {
                cases::set_value(conn, case_id, *attribute_id, value)?;
            }
        }
    }
    Ok(())
}
