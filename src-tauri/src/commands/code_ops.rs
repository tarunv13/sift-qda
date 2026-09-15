use tauri::State;

use crate::db::code_ops;
use crate::error::AppResult;
use crate::state::AppState;

/// Merges one code into another; returns how many coded passages moved.
#[tauri::command]
pub fn merge_nodes(state: State<'_, AppState>, from_id: i64, into_id: i64) -> AppResult<usize> {
    code_ops::merge(&state.conn(), from_id, into_id)
}

/// Moves a coded passage to another code; true when it was already coded there.
#[tauri::command]
pub fn recode_reference(state: State<'_, AppState>, id: i64, node_id: i64) -> AppResult<bool> {
    code_ops::recode(&state.conn(), id, node_id)
}
