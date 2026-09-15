use std::path::PathBuf;

use tauri::State;

use crate::error::AppResult;
use crate::excel;
use crate::state::AppState;

/// Writes the project's coded extracts, codebook, code × document matrix and memos to .xlsx.
#[tauri::command]
pub async fn export_excel(
    state: State<'_, AppState>,
    project_id: i64,
    path: String,
) -> AppResult<()> {
    excel::export(&state.conn(), project_id, &PathBuf::from(path))
}
