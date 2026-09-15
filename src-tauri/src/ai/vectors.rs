use rusqlite::{params, Connection};

use crate::db::collect;
use crate::error::AppResult;

/// nomic-embed-text v1.5 output size.
pub const DIMENSIONS: usize = 768;

/// int8 quantisation keeps each vector at 768 bytes instead of 3 KB.
pub fn ensure_table(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(&format!(
        "CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
             project_id integer,
             embedding int8[{DIMENSIONS}] distance_metric=cosine
         )"
    ))?;
    Ok(())
}

fn to_blob(vector: &[f32]) -> Vec<u8> {
    vector.iter().flat_map(|x| x.to_le_bytes()).collect()
}

pub fn insert(conn: &Connection, chunk_id: i64, project_id: i64, vector: &[f32]) -> AppResult<()> {
    conn.execute("DELETE FROM vec_chunks WHERE rowid = ?1", [chunk_id])?;
    conn.execute(
        "INSERT INTO vec_chunks (rowid, project_id, embedding)
         VALUES (?1, ?2, vec_quantize_int8(?3, 'unit'))",
        params![chunk_id, project_id, to_blob(vector)],
    )?;
    Ok(())
}

/// Nearest chunks in a project as `(chunk_id, cosine distance)`.
pub fn knn(
    conn: &Connection,
    project_id: i64,
    query: &[f32],
    k: i64,
) -> AppResult<Vec<(i64, f64)>> {
    let mut stmt = conn.prepare(
        "SELECT rowid, distance FROM vec_chunks
         WHERE embedding MATCH vec_quantize_int8(?1, 'unit') AND k = ?2 AND project_id = ?3
         ORDER BY distance",
    )?;
    let rows = stmt.query_map(params![to_blob(query), k, project_id], |r| {
        Ok((r.get(0)?, r.get(1)?))
    })?;
    collect(rows)
}

pub fn delete_for_source(conn: &Connection, source_id: i64) -> AppResult<()> {
    ensure_table(conn)?;
    conn.execute(
        "DELETE FROM vec_chunks WHERE rowid IN (SELECT id FROM chunks WHERE source_id = ?1)",
        [source_id],
    )?;
    Ok(())
}

pub fn delete_for_project(conn: &Connection, project_id: i64) -> AppResult<()> {
    ensure_table(conn)?;
    conn.execute(
        "DELETE FROM vec_chunks WHERE rowid IN
             (SELECT c.id FROM chunks c JOIN sources s ON s.id = c.source_id WHERE s.project_id = ?1)",
        [project_id],
    )?;
    Ok(())
}

pub fn reset(conn: &Connection) -> AppResult<()> {
    conn.execute_batch("DROP TABLE IF EXISTS vec_chunks; UPDATE chunks SET embedded = 0;")?;
    ensure_table(conn)
}
