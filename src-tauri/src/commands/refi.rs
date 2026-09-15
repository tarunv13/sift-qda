use std::path::PathBuf;

use tauri::{AppHandle, State};

use crate::ai::worker;
use crate::error::AppResult;
use crate::refi::{self, ImportSummary};
use crate::state::AppState;

/// Imports a REFI-QDA project (.qdpx, e.g. exported from NVivo, ATLAS.ti or MAXQDA) as a new project.
#[tauri::command]
pub async fn import_qdpx(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> AppResult<ImportSummary> {
    let summary = {
        let mut conn = state.conn();
        let tx = conn.transaction()?;
        let summary = refi::import::import(&tx, &PathBuf::from(path))?;
        tx.commit()?;
        summary
    };
    worker::spawn(app, state.db_path.clone());
    Ok(summary)
}

/// Writes a project to a REFI-QDA .qdpx file.
#[tauri::command]
pub async fn export_qdpx(
    state: State<'_, AppState>,
    project_id: i64,
    path: String,
) -> AppResult<()> {
    refi::export::export(&state.conn(), project_id, &PathBuf::from(path))
}
