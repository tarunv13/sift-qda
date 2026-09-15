use std::path::PathBuf;

use serde::Serialize;
use tauri::{ipc::Response, AppHandle, State};

use crate::ai::{vectors, worker};
use crate::db::sources::{self, Source, SourceSummary};
use crate::error::{AppError, AppResult};
use crate::import;
use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportOutcome {
    pub path: String,
    pub name: String,
    pub source_id: Option<i64>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn list_sources(state: State<'_, AppState>, project_id: i64) -> AppResult<Vec<SourceSummary>> {
    sources::list(&state.conn(), project_id)
}

#[tauri::command]
pub fn get_source(state: State<'_, AppState>, id: i64) -> AppResult<Source> {
    sources::get(&state.conn(), id)
}

/// Original file bytes (for the PDF viewer), sent as a raw binary IPC response.
#[tauri::command]
pub async fn read_source_bytes(state: State<'_, AppState>, id: i64) -> AppResult<Response> {
    let path = sources::get(&state.conn(), id)?
        .file_path
        .ok_or_else(|| AppError::Invalid("this source has no original file".into()))?;
    Ok(Response::new(std::fs::read(path)?))
}

/// Parses each file in the Rust backend and stores it. One bad file does not stop the rest.
#[tauri::command]
pub async fn import_source_files(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: i64,
    paths: Vec<String>,
) -> AppResult<Vec<ImportOutcome>> {
    let mut outcomes = Vec::with_capacity(paths.len());
    for path in paths {
        let file = PathBuf::from(&path);
        let name = import::display_name(&file);
        // Parse without holding the database lock.
        let result = import::parse(&file).and_then(|parsed| {
            let mut conn = state.conn();
            let tx = conn.transaction()?;
            let id = import::store(&tx, project_id, &name, &path, &parsed)?;
            tx.commit()?;
            Ok(id)
        });
        let (source_id, error) = match result {
            Ok(id) => (Some(id), None),
            Err(e) => (None, Some(e.to_string())),
        };
        outcomes.push(ImportOutcome {
            path,
            name,
            source_id,
            error,
        });
    }
    worker::spawn(app, state.db_path.clone());
    Ok(outcomes)
}

#[tauri::command]
pub fn rename_source(state: State<'_, AppState>, id: i64, name: String) -> AppResult<()> {
    sources::rename(&state.conn(), id, name.trim())
}

#[tauri::command]
pub fn delete_source(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let conn = state.conn();
    vectors::delete_for_source(&conn, id)?;
    sources::delete(&conn, id)
}
