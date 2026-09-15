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
    case_id: Option<i64>,
) -> AppResult<Memo> {
    let conn = state.conn();
    let memo = memos::create(
        &conn,
        &NewMemo {
            project_id,
            guid: None,
            source_id,
            node_id,
            title: &title,
            body: body.as_deref().unwrap_or(""),
        },
    )?;
    if case_id.is_none() {
        return Ok(memo);
    }
    memos::link_case(&conn, memo.id, case_id)?;
    memos::get(&conn, memo.id)
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
