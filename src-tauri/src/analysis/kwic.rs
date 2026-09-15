//! Keyword in context: every occurrence of a word with the text around it.

use serde::Serialize;

use super::scope::Span;
use super::words::{words, Filter};

/// Characters of context shown on each side of the word.
const SIDE: usize = 70;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordContext {
    pub source_id: i64,
    pub source_name: String,
    /// Code-point offsets of the word in its source, for jumping to it.
    pub start: i64,
    pub end: i64,
    pub before: String,
    pub matched: String,
    pub after: String,
}

pub fn contexts(spans: &[Span], word: &str, filter: &Filter, limit: usize) -> Vec<KeywordContext> {
    let target = word.to_lowercase();
    let mut out = Vec::new();
    for span in spans {
        // Matches arrive in order, so byte offsets convert to code points incrementally.
        let (mut byte, mut chars) = (0usize, 0i64);
        for (index, original, lower) in words(&span.text, filter) {
            if lower != target {
                continue;
            }
            chars += span.text[byte..index].chars().count() as i64;
            byte = index;
            let start = span.offset + chars;
            out.push(KeywordContext {
                source_id: span.source_id,
                source_name: span.source_name.clone(),
                start,
                end: start + original.chars().count() as i64,
                before: tail(&span.text[..index]),
                matched: original.to_string(),
                after: head(&span.text[index + original.len()..]),
            });
            if out.len() >= limit {
                return out;
            }
        }
    }
    out
}

fn tail(text: &str) -> String {
    let skip = text.chars().count().saturating_sub(SIDE);
    flatten(text.chars().skip(skip))
}

fn head(text: &str) -> String {
    flatten(text.chars().take(SIDE))
}

fn flatten(chars: impl Iterator<Item = char>) -> String {
    chars
        .map(|c| if c == '\n' || c == '\r' { ' ' } else { c })
        .collect()
}
