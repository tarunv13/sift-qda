//! Reorganising the codebook: merging codes and moving a passage to another code.

use rusqlite::{params, Connection};

use super::nodes::is_descendant;
use crate::error::{AppError, AppResult};

/// True when both codes exist and belong to the same project.
fn same_project(conn: &Connection, a: i64, b: i64) -> AppResult<bool> {
    let same: Option<bool> = conn.query_row(
        "SELECT (SELECT project_id FROM nodes WHERE id = ?1) = (SELECT project_id FROM nodes WHERE id = ?2)",
        params![a, b],
        |r| r.get(0),
    )?;
    Ok(same.unwrap_or(false))
}

/// Merges `from` into `into`: its coded passages, sub-codes and memos move to `into`, then `from`
/// is deleted. Returns how many passages moved; a passage already coded at `into` is not duplicated.
pub fn merge(conn: &Connection, from: i64, into: i64) -> AppResult<usize> {
    if from == into {
        return Err(AppError::Invalid(
            "a code cannot be merged into itself".into(),
        ));
    }
    if !same_project(conn, from, into)? {
        return Err(AppError::Invalid(
            "both codes must be in the same project".into(),
        ));
    }
    if is_descendant(conn, into, from)? {
        return Err(AppError::Invalid(
            "a code cannot be merged into one of its own sub-codes".into(),
        ));
    }
    let tx = conn.unchecked_transaction()?;
    let moved = tx.execute(
        "UPDATE OR IGNORE coding_references SET node_id = ?1 WHERE node_id = ?2",
        params![into, from],
    )?;
    tx.execute(
        "UPDATE nodes SET parent_id = ?1 WHERE parent_id = ?2",
        params![into, from],
    )?;
    tx.execute(
        "UPDATE memos SET node_id = ?1 WHERE node_id = ?2",
        params![into, from],
    )?;
    tx.execute("DELETE FROM nodes WHERE id = ?1", [from])?;
    tx.commit()?;
    Ok(moved)
}

/// Moves one coded passage to another code. Returns true when the passage was already coded at
/// that code, in which case this duplicate is removed instead.
pub fn recode(conn: &Connection, reference_id: i64, node_id: i64) -> AppResult<bool> {
    let current: i64 = conn.query_row(
        "SELECT node_id FROM coding_references WHERE id = ?1",
        [reference_id],
        |r| r.get(0),
    )?;
    if current == node_id {
        return Ok(false);
    }
    if !same_project(conn, current, node_id)? {
        return Err(AppError::Invalid(
            "both codes must be in the same project".into(),
        ));
    }
    let changed = conn.execute(
        "UPDATE OR IGNORE coding_references SET node_id = ?1 WHERE id = ?2",
        params![node_id, reference_id],
    )?;
    if changed == 0 {
        conn.execute(
            "DELETE FROM coding_references WHERE id = ?1",
            [reference_id],
        )?;
        return Ok(true);
    }
    Ok(false)
}
