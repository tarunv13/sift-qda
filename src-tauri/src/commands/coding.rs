use tauri::State;

use crate::db::nodes::{self, NewNode, Node};
use crate::db::references::{self, CodingReference, QuotedReference};
use crate::error::AppResult;
use crate::state::AppState;

#[tauri::command]
pub fn list_nodes(state: State<'_, AppState>, project_id: i64) -> AppResult<Vec<Node>> {
    nodes::list(&state.conn(), project_id)
}

#[tauri::command]
pub fn create_node(
    state: State<'_, AppState>,
    project_id: i64,
    name: String,
    color: String,
    parent_id: Option<i64>,
    description: Option<String>,
) -> AppResult<Node> {
    let conn = state.conn();
    let id = nodes::create(
        &conn,
        &NewNode {
            project_id,
            guid: None,
            parent_id,
            name: &name,
            color: &color,
            description: description.as_deref().unwrap_or(""),
        },
    )?;
    nodes::get(&conn, id)
}

#[tauri::command]
pub fn update_node(
    state: State<'_, AppState>,
    id: i64,
    name: String,
    color: String,
    description: String,
    parent_id: Option<i64>,
) -> AppResult<Node> {
    nodes::update(&state.conn(), id, &name, &color, &description, parent_id)
}

#[tauri::command]
pub fn delete_node(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    nodes::delete(&state.conn(), id)
}

/// Codes the span `[start_index, end_index)` of a source (code-point offsets).
/// Returns the stored reference so the UI can update without a reload.
#[tauri::command]
pub fn save_coding_reference(
    state: State<'_, AppState>,
    source_id: i64,
    start_index: i64,
    end_index: i64,
    code_id: i64,
) -> AppResult<CodingReference> {
    references::insert(
        &state.conn(),
        source_id,
        code_id,
        start_index,
        end_index,
        None,
    )
}

#[tauri::command]
pub fn list_source_references(
    state: State<'_, AppState>,
    source_id: i64,
) -> AppResult<Vec<CodingReference>> {
    references::for_source(&state.conn(), source_id)
}

#[tauri::command]
pub fn list_node_references(
    state: State<'_, AppState>,
    node_id: i64,
) -> AppResult<Vec<QuotedReference>> {
    references::for_node(&state.conn(), node_id)
}

#[tauri::command]
pub fn delete_coding_reference(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    references::delete(&state.conn(), id)
}
