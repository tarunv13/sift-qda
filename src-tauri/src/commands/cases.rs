use tauri::State;

use crate::db::case_edit;
use crate::db::cases::{self, CaseTable};
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
pub fn get_case_table(state: State<'_, AppState>, project_id: i64) -> AppResult<CaseTable> {
    cases::table(&state.conn(), project_id)
}

#[tauri::command]
pub fn create_case(
    state: State<'_, AppState>,
    project_id: i64,
    name: String,
    source_id: Option<i64>,
) -> AppResult<i64> {
    case_edit::create_case(&state.conn(), project_id, &name, source_id)
}

#[tauri::command]
pub fn rename_case(state: State<'_, AppState>, id: i64, name: String) -> AppResult<()> {
    case_edit::rename_case(&state.conn(), id, &name)
}

#[tauri::command]
pub fn link_case_source(
    state: State<'_, AppState>,
    id: i64,
    source_id: Option<i64>,
) -> AppResult<()> {
    case_edit::link_source(&state.conn(), id, source_id)
}

#[tauri::command]
pub fn delete_case(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    case_edit::delete_case(&state.conn(), id)
}

#[tauri::command]
pub fn create_attribute(
    state: State<'_, AppState>,
    project_id: i64,
    name: String,
) -> AppResult<i64> {
    case_edit::create_attribute(&state.conn(), project_id, &name)
}

#[tauri::command]
pub fn rename_attribute(state: State<'_, AppState>, id: i64, name: String) -> AppResult<()> {
    case_edit::rename_attribute(&state.conn(), id, &name)
}

#[tauri::command]
pub fn delete_attribute(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    case_edit::delete_attribute(&state.conn(), id)
}

#[tauri::command]
pub fn set_case_value(
    state: State<'_, AppState>,
    case_id: i64,
    attribute_id: i64,
    value: String,
) -> AppResult<()> {
    case_edit::set_value(&state.conn(), case_id, attribute_id, &value)
}

/// Creates a case for every source without one; returns how many were created.
#[tauri::command]
pub fn create_cases_for_sources(state: State<'_, AppState>, project_id: i64) -> AppResult<usize> {
    case_edit::cases_for_sources(&state.conn(), project_id)
}
