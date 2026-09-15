//! Matrix coding commands. They run off the UI thread so large projects never freeze the window.

use std::path::Path;

use tauri::State;

use crate::analysis::matrix::{self, CodingMatrix, MatrixSpec};
use crate::analysis::matrix_cells::{self, CellPassage};
use crate::error::AppResult;
use crate::excel;
use crate::state::AppState;

#[tauri::command]
pub async fn coding_matrix(
    state: State<'_, AppState>,
    project_id: i64,
    spec: MatrixSpec,
) -> AppResult<CodingMatrix> {
    matrix::build(&state.conn(), project_id, &spec)
}

#[tauri::command]
pub async fn matrix_cell_passages(
    state: State<'_, AppState>,
    project_id: i64,
    code_id: i64,
    rolled_up: bool,
    source_ids: Vec<i64>,
) -> AppResult<Vec<CellPassage>> {
    matrix_cells::passages(&state.conn(), project_id, code_id, rolled_up, &source_ids)
}

#[tauri::command]
pub async fn export_matrix_excel(
    state: State<'_, AppState>,
    project_id: i64,
    spec: MatrixSpec,
    path: String,
) -> AppResult<()> {
    let result = matrix::build(&state.conn(), project_id, &spec)?;
    excel::matrix::export(&result, Path::new(&path))
}
