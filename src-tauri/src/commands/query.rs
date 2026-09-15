//! Coding query commands. They run off the UI thread so large projects never freeze the window.

use tauri::State;

use crate::analysis::query::{QueryResult, QuerySpec};
use crate::analysis::query_output;
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
pub async fn coding_query(
    state: State<'_, AppState>,
    project_id: i64,
    spec: QuerySpec,
) -> AppResult<QueryResult> {
    query_output::run(&state.conn(), project_id, &spec)
}

/// Codes every result passage at a new code and returns its id.
#[tauri::command]
pub async fn code_query_results(
    state: State<'_, AppState>,
    project_id: i64,
    spec: QuerySpec,
    name: String,
    color: String,
) -> AppResult<i64> {
    query_output::save_as_code(&state.conn(), project_id, &spec, &name, &color)
}
