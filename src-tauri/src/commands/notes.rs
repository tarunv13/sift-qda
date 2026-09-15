//! Annotations and "see also" links between passages.

use serde::Serialize;
use tauri::State;

use crate::db::annotations::{self, Annotation};
use crate::db::links::{self, PassageLink};
use crate::error::AppResult;
use crate::state::AppState;

#[derive(Serialize)]
pub struct SourceNotes {
    pub annotations: Vec<Annotation>,
    pub links: Vec<PassageLink>,
}

#[tauri::command]
pub fn list_source_notes(state: State<'_, AppState>, source_id: i64) -> AppResult<SourceNotes> {
    let conn = state.conn();
    Ok(SourceNotes {
        annotations: annotations::for_source(&conn, source_id)?,
        links: links::for_source(&conn, source_id)?,
    })
}

#[tauri::command]
pub fn create_annotation(
    state: State<'_, AppState>,
    source_id: i64,
    start: i64,
    end: i64,
    body: String,
) -> AppResult<i64> {
    annotations::create(&state.conn(), source_id, start, end, &body)
}

#[tauri::command]
pub fn update_annotation(state: State<'_, AppState>, id: i64, body: String) -> AppResult<()> {
    annotations::update(&state.conn(), id, &body)
}

#[tauri::command]
pub fn delete_annotation(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    annotations::delete(&state.conn(), id)
}

#[tauri::command]
pub fn create_passage_link(
    state: State<'_, AppState>,
    from_source: i64,
    from_start: i64,
    from_end: i64,
    to_source: i64,
    to_start: i64,
    to_end: i64,
) -> AppResult<i64> {
    links::create(
        &state.conn(),
        (from_source, from_start, from_end),
        (to_source, to_start, to_end),
    )
}

#[tauri::command]
pub fn delete_passage_link(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    links::delete(&state.conn(), id)
}
