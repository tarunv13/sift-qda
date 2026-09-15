//! The local assistant. Material is read under the database lock; the model runs without it.

use tauri::State;

use crate::ai::assist::{self, Target, MAX_CHARS};
use crate::ai::chat::Chat;
use crate::ai::config;
use crate::ai::suggest::{self, Suggestion};
use crate::db::memos::{self, Memo, NewMemo};
use crate::db::nodes;
use crate::error::AppResult;
use crate::state::AppState;

/// Summarises a source, code or case with the local chat model and saves the result as a memo.
#[tauri::command]
pub async fn ai_summarise(state: State<'_, AppState>, target: Target) -> AppResult<Memo> {
    let (material, settings) = {
        let conn = state.conn();
        (assist::gather(&conn, &target)?, config::load(&conn)?)
    };
    let (text, truncated) = assist::clip(&material.text, MAX_CHARS);
    let (system, user) = assist::summary_prompt(&material, &text);
    let summary = Chat::new(&settings).ask(&system, &user, None)?;

    let conn = state.conn();
    let memo = memos::create(
        &conn,
        &NewMemo {
            project_id: material.project_id,
            guid: None,
            source_id: material.source_id,
            node_id: material.node_id,
            title: &assist::memo_title(&material),
            body: &assist::memo_body(&summary, &settings.chat_model, truncated),
        },
    )?;
    if material.case_id.is_none() {
        return Ok(memo);
    }
    memos::link_case(&conn, memo.id, material.case_id)?;
    memos::get(&conn, memo.id)
}

/// Proposes sub-codes for a code from its coded passages. Nothing is created until accepted.
#[tauri::command]
pub async fn ai_suggest_subcodes(
    state: State<'_, AppState>,
    node_id: i64,
) -> AppResult<Vec<Suggestion>> {
    let (node, material, existing, settings) = {
        let conn = state.conn();
        let node = nodes::get(&conn, node_id)?;
        let material = assist::gather(&conn, &Target::Code { id: node_id })?;
        let existing: Vec<String> = nodes::list(&conn, material.project_id)?
            .into_iter()
            .filter(|n| n.parent_id == Some(node_id))
            .map(|n| n.name)
            .collect();
        (node, material, existing, config::load(&conn)?)
    };
    let (passages, _) = assist::clip(&material.text, MAX_CHARS);
    let (system, user) = suggest::prompt(&node.name, &node.description, &existing, &passages);
    let answer = Chat::new(&settings).ask(&system, &user, Some(&suggest::schema()))?;
    suggest::parse(&answer, &existing)
}
