use tauri::State;

use crate::db::memos::{self, Memo, NewMemo};
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
pub fn list_memos(state: State<'_, AppState>, project_id: i64) -> AppResult<Vec<Memo>> {
    memos::list(&state.conn(), project_id)
}

#[tauri::command]
pub fn create_memo(
    state: State<'_, AppState>,
    project_id: i64,
    title: String,
    body: Option<String>,
    source_id: Option<i64>,
    node_id: Option<i64>,
) -> AppResult<Memo> {
    memos::create(
        &state.conn(),
        &NewMemo {
            project_id,
            guid: None,
            source_id,
            node_id,
            title: &title,
            body: body.as_deref().unwrap_or(""),
        },
    )
}

#[tauri::command]
pub fn update_memo(
    state: State<'_, AppState>,
    id: i64,
    title: String,
    body: String,
) -> AppResult<Memo> {
    memos::update(&state.conn(), id, &title, &body)
}

#[tauri::command]
pub fn delete_memo(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    memos::delete(&state.conn(), id)
}
