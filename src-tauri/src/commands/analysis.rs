//! Explore view commands. They run off the UI thread so large projects never freeze the window.

use std::collections::HashSet;

use serde::Deserialize;
use tauri::State;

use crate::analysis::kwic::{self, KeywordContext};
use crate::analysis::scope::{spans, Scope};
use crate::analysis::stopwords;
use crate::analysis::words::{self, Filter, WordFrequency};
use crate::error::AppResult;
use crate::state::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WordOptions {
    pub min_length: usize,
    pub language: String,
    pub extra_stop_words: Vec<String>,
    pub skip_speakers: bool,
    pub limit: usize,
}

#[tauri::command]
pub async fn word_frequency(
    state: State<'_, AppState>,
    project_id: i64,
    scope: Scope,
    options: WordOptions,
) -> AppResult<WordFrequency> {
    let text = spans(&state.conn(), project_id, scope)?;
    let stop_words = stopwords::set(&options.language, &options.extra_stop_words);
    let filter = Filter {
        min_length: options.min_length.max(1),
        stop_words: &stop_words,
        skip_speakers: options.skip_speakers,
    };
    Ok(words::frequency(
        &text,
        &filter,
        options.limit.clamp(10, 500),
    ))
}

#[tauri::command]
pub async fn keyword_contexts(
    state: State<'_, AppState>,
    project_id: i64,
    scope: Scope,
    word: String,
    skip_speakers: bool,
) -> AppResult<Vec<KeywordContext>> {
    let text = spans(&state.conn(), project_id, scope)?;
    let no_stop_words = HashSet::new();
    let filter = Filter {
        min_length: 1,
        stop_words: &no_stop_words,
        skip_speakers,
    };
    Ok(kwic::contexts(&text, &word, &filter, 200))
}
