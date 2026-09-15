use serde::Serialize;
use tauri::{AppHandle, State};

use crate::ai::config::{self, EmbeddingConfig};
use crate::ai::{ollama::Embedder, vectors, worker};
use crate::error::AppResult;
use crate::state::AppState;
use crate::text::{char_slice, find_all_ci};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub source_id: i64,
    pub source_name: String,
    pub start: i64,
    pub end: i64,
    pub snippet: String,
    pub score: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStatus {
    pub total: i64,
    pub pending: i64,
    pub running: bool,
}

/// Meaning-based search across every source in a project.
#[tauri::command]
pub async fn semantic_search(
    state: State<'_, AppState>,
    project_id: i64,
    query: String,
    limit: Option<i64>,
) -> AppResult<Vec<SearchHit>> {
    let settings = config::load(&state.conn())?;
    // Embed the query without holding the database lock.
    let vector = Embedder::new(&settings).embed_query(&query)?;

    let conn = state.conn();
    vectors::ensure_table(&conn)?;
    let hits = vectors::knn(
        &conn,
        project_id,
        &vector,
        limit.unwrap_or(20).clamp(1, 100),
    )?;
    let mut stmt = conn.prepare(
        "SELECT c.source_id, s.name, c.start_offset, c.end_offset,
                substr(s.content, c.start_offset + 1, c.end_offset - c.start_offset)
         FROM chunks c JOIN sources s ON s.id = c.source_id WHERE c.id = ?1",
    )?;
    hits.into_iter()
        .map(|(chunk_id, distance)| {
            Ok(stmt.query_row([chunk_id], |r| {
                Ok(SearchHit {
                    source_id: r.get(0)?,
                    source_name: r.get(1)?,
                    start: r.get(2)?,
                    end: r.get(3)?,
                    snippet: r.get(4)?,
                    score: 1.0 - distance,
                })
            })?)
        })
        .collect()
}

/// Exact (case-insensitive) phrase search; works without Ollama.
#[tauri::command]
pub fn text_search(
    state: State<'_, AppState>,
    project_id: i64,
    query: String,
) -> AppResult<Vec<SearchHit>> {
    const CONTEXT: i64 = 80;
    const LIMIT: usize = 200;
    let conn = state.conn();
    let mut stmt =
        conn.prepare("SELECT id, name, content FROM sources WHERE project_id = ?1 ORDER BY name")?;
    let rows = stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })?;

    let mut hits = Vec::new();
    for row in rows {
        let (source_id, source_name, content) = row?;
        for (start, end) in find_all_ci(&content, &query, LIMIT - hits.len()) {
            let snippet = char_slice(&content, start - CONTEXT, end + CONTEXT).replace('\n', " ");
            hits.push(SearchHit {
                source_id,
                source_name: source_name.clone(),
                start,
                end,
                snippet,
                score: 1.0,
            });
        }
        if hits.len() >= LIMIT {
            break;
        }
    }
    Ok(hits)
}

#[tauri::command]
pub fn embedding_status(state: State<'_, AppState>) -> AppResult<IndexStatus> {
    let conn = state.conn();
    let total = conn.query_row("SELECT COUNT(*) FROM chunks", [], |r| r.get(0))?;
    Ok(IndexStatus {
        total,
        pending: worker::count_pending(&conn)?,
        running: worker::is_running(),
    })
}

#[tauri::command]
pub fn get_embedding_config(state: State<'_, AppState>) -> AppResult<EmbeddingConfig> {
    config::load(&state.conn())
}

#[tauri::command]
pub fn set_embedding_config(
    app: AppHandle,
    state: State<'_, AppState>,
    config: EmbeddingConfig,
) -> AppResult<()> {
    config::save(&state.conn(), &config)?;
    worker::spawn(app, state.db_path.clone());
    Ok(())
}

/// Drops all vectors and embeds every chunk again (e.g. after changing the model).
#[tauri::command]
pub fn reindex_embeddings(app: AppHandle, state: State<'_, AppState>) -> AppResult<()> {
    vectors::reset(&state.conn())?;
    worker::spawn(app, state.db_path.clone());
    Ok(())
}
