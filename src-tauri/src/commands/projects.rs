use tauri::State;

use crate::ai::vectors;
use crate::db::projects::{self, Project};
use crate::error::{AppError, AppResult};
use crate::state::AppState;

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> AppResult<Vec<Project>> {
    projects::list(&state.conn())
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> AppResult<Project> {
    if name.trim().is_empty() {
        return Err(AppError::Invalid("project name cannot be empty".into()));
    }
    projects::create(
        &state.conn(),
        name.trim(),
        description.as_deref().unwrap_or(""),
    )
}

#[tauri::command]
pub fn rename_project(state: State<'_, AppState>, id: i64, name: String) -> AppResult<Project> {
    projects::rename(&state.conn(), id, name.trim())
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    let conn = state.conn();
    vectors::delete_for_project(&conn, id)?;
    projects::delete(&conn, id)
}
