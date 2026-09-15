//! Sub-code suggestions: the prompt, the JSON shape the model must answer in, and name cleaning.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};

#[derive(Serialize, Deserialize, Clone)]
pub struct Suggestion {
    pub name: String,
    pub description: String,
}

pub fn schema() -> Value {
    json!({
        "type": "object",
        "properties": { "codes": { "type": "array", "items": {
            "type": "object",
            "properties": { "name": { "type": "string" }, "description": { "type": "string" } },
            "required": ["name", "description"]
        }}},
        "required": ["codes"]
    })
}

pub fn prompt(
    code: &str,
    description: &str,
    existing: &[String],
    passages: &str,
) -> (String, String) {
    let system = "You help a qualitative researcher refine a codebook. Read the coded passages and propose 3 to 6 \
        sub-codes that sort them into distinct ideas found in the passages. Name each in plain language: 2 to 5 words, \
        sentence case, separated by spaces, never underscores. In the description, write one sentence saying when a \
        passage belongs under it; never just repeat the name. Answer in JSON.";
    let mut user = format!("Code: {code}\n");
    if !description.trim().is_empty() {
        user.push_str(&format!("Description: {description}\n"));
    }
    if !existing.is_empty() {
        user.push_str(&format!(
            "Existing sub-codes (do not repeat): {}\n",
            existing.join("; ")
        ));
    }
    user.push_str(&format!("\nPassages:\n\n{passages}"));
    (system.into(), user)
}

/// Readable code names in sentence case: "coping_strategies" and "Coping Strategies" both become
/// "Coping strategies". Acronyms such as "NGOs" are kept.
pub fn clean_name(raw: &str) -> String {
    let spaced = raw.replace('_', " ");
    let joined = spaced.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed = joined.trim_matches(|c: char| matches!(c, '"' | '\'' | '.' | '“' | '”'));
    let words: Vec<String> = trimmed
        .split(' ')
        .enumerate()
        .map(|(i, word)| {
            let mut chars = word.chars();
            let Some(first) = chars.next() else {
                return String::new();
            };
            let rest: String = chars.collect();
            if i == 0 {
                first.to_uppercase().chain(rest.chars()).collect()
            } else if first.is_uppercase() && !rest.chars().any(char::is_uppercase) {
                first.to_lowercase().chain(rest.chars()).collect()
            } else {
                word.to_string()
            }
        })
        .collect();
    words.join(" ").chars().take(60).collect()
}

/// Parses the model's JSON, cleaning names and dropping blanks and duplicates of existing codes.
pub fn parse(answer: &str, existing: &[String]) -> AppResult<Vec<Suggestion>> {
    #[derive(Deserialize)]
    struct Answer {
        codes: Vec<Suggestion>,
    }
    let parsed: Answer = serde_json::from_str(answer).map_err(|_| {
        AppError::Ai("the model's answer was not in the expected format; try again".into())
    })?;
    let mut seen: Vec<String> = existing.iter().map(|n| n.to_lowercase()).collect();
    let mut out = Vec::new();
    for suggestion in parsed.codes {
        let name = clean_name(&suggestion.name);
        if name.is_empty() || seen.contains(&name.to_lowercase()) {
            continue;
        }
        seen.push(name.to_lowercase());
        // A description that only repeats the name adds nothing.
        let description = suggestion.description.trim();
        let description = if description.eq_ignore_ascii_case(&name) {
            ""
        } else {
            description
        };
        out.push(Suggestion {
            description: description.to_string(),
            name,
        });
    }
    out.truncate(8);
    Ok(out)
}
