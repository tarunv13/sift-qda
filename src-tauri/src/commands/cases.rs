use tauri::State;

use crate::db::cases::{self, CaseTable};
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
pub fn get_case_table(state: State<'_, AppState>, project_id: i64) -> AppResult<CaseTable> {
    cases::table(&state.conn(), project_id)
}
