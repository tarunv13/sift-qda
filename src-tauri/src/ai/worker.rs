//! Background embedding. Runs whenever sources are imported (the application-level
//! equivalent of an "after insert" trigger: SQLite triggers cannot call a model).

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use super::{config, ollama::Embedder, vectors};
use crate::db::{self, collect};
use crate::error::AppResult;

const BATCH: i64 = 16;
static RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingStatus {
    pub state: &'static str,
    pub remaining: i64,
    pub message: Option<String>,
}

pub fn is_running() -> bool {
    RUNNING.load(Ordering::SeqCst)
}

/// Starts the worker unless one is already running.
pub fn spawn(app: AppHandle, db_path: PathBuf) {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(move || {
        let result = run(&app, &db_path);
        RUNNING.store(false, Ordering::SeqCst);
        let remaining = db::open(&db_path)
            .and_then(|c| count_pending(&c))
            .unwrap_or(0);
        match result {
            // Chunks added between the last check and now: go round again.
            Ok(()) if remaining > 0 => spawn(app, db_path),
            Ok(()) => emit(&app, "idle", 0, None),
            Err(e) => emit(&app, "offline", remaining, Some(e.to_string())),
        }
    });
}

fn emit(app: &AppHandle, state: &'static str, remaining: i64, message: Option<String>) {
    let _ = app.emit(
        "embedding-status",
        EmbeddingStatus {
            state,
            remaining,
            message,
        },
    );
}

fn run(app: &AppHandle, db_path: &Path) -> AppResult<()> {
    let conn = db::open(db_path)?;
    vectors::ensure_table(&conn)?;
    if count_pending(&conn)? == 0 {
        return Ok(());
    }
    let embedder = Embedder::new(&config::load(&conn)?);
    loop {
        let batch = next_batch(&conn)?;
        if batch.is_empty() {
            return Ok(());
        }
        let texts: Vec<String> = batch.iter().map(|(_, _, text)| text.clone()).collect();
        let embeddings = embedder.embed_documents(&texts)?;

        let tx = conn.unchecked_transaction()?;
        for ((chunk_id, project_id, _), vector) in batch.iter().zip(&embeddings) {
            vectors::insert(&tx, *chunk_id, *project_id, vector)?;
            tx.execute("UPDATE chunks SET embedded = 1 WHERE id = ?1", [chunk_id])?;
        }
        tx.commit()?;
        emit(app, "running", count_pending(&conn)?, None);
    }
}

/// `(chunk_id, project_id, text)` for the next chunks awaiting embeddings.
fn next_batch(conn: &Connection) -> AppResult<Vec<(i64, i64, String)>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, s.project_id, substr(s.content, c.start_offset + 1, c.end_offset - c.start_offset)
         FROM chunks c JOIN sources s ON s.id = c.source_id
         WHERE c.embedded = 0 ORDER BY c.id LIMIT ?1",
    )?;
    let rows = stmt.query_map([BATCH], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))?;
    collect(rows)
}

pub fn count_pending(conn: &Connection) -> AppResult<i64> {
    Ok(
        conn.query_row("SELECT COUNT(*) FROM chunks WHERE embedded = 0", [], |r| {
            r.get(0)
        })?,
    )
}
