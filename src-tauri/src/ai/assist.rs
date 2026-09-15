//! What the local assistant reads for each request, and how summaries become memos.

use rusqlite::Connection;
use serde::Deserialize;

use crate::db::{cases, nodes, references, sources};
use crate::error::{AppError, AppResult};

/// About 6,000 tokens: leaves room for the answer inside an 8,192-token context.
pub const MAX_CHARS: usize = 24_000;

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Target {
    Source { id: i64 },
    Code { id: i64 },
    Case { id: i64 },
}

/// The text behind a request, and where a memo about it belongs.
pub struct Material {
    pub label: &'static str,
    pub name: String,
    pub text: String,
    pub project_id: i64,
    pub source_id: Option<i64>,
    pub node_id: Option<i64>,
    pub case_id: Option<i64>,
}

pub fn gather(conn: &Connection, target: &Target) -> AppResult<Material> {
    match *target {
        Target::Source { id } => {
            let source = sources::get(conn, id)?;
            Ok(Material {
                label: "Source",
                name: source.name,
                text: source.content,
                project_id: source.project_id,
                source_id: Some(id),
                node_id: None,
                case_id: None,
            })
        }
        Target::Code { id } => {
            let node = nodes::get(conn, id)?;
            let project_id =
                conn.query_row("SELECT project_id FROM nodes WHERE id = ?1", [id], |r| {
                    r.get(0)
                })?;
            let quotes: Vec<String> = references::for_node(conn, id)?
                .into_iter()
                .map(|r| format!("[{}] {}", r.source_name, r.text.trim()))
                .collect();
            if quotes.is_empty() {
                return Err(AppError::Invalid(format!(
                    "nothing is coded at “{}” yet",
                    node.name
                )));
            }
            Ok(Material {
                label: "Passages coded at",
                name: node.name,
                text: quotes.join("\n\n"),
                project_id,
                source_id: None,
                node_id: Some(id),
                case_id: None,
            })
        }
        Target::Case { id } => case_material(conn, id),
    }
}

fn case_material(conn: &Connection, id: i64) -> AppResult<Material> {
    let (project_id, source_id): (i64, Option<i64>) = conn.query_row(
        "SELECT project_id, source_id FROM cases WHERE id = ?1",
        [id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    let table = cases::table(conn, project_id)?;
    let case = table
        .cases
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| AppError::Invalid("case not found".into()))?;
    let mut text: Vec<String> = table
        .attributes
        .iter()
        .zip(&case.values)
        .filter(|(_, value)| !value.is_empty())
        .map(|(attribute, value)| format!("{}: {value}", attribute.name))
        .collect();
    if let Some(source) = source_id {
        text.push(sources::get(conn, source)?.content);
    }
    if text.is_empty() {
        return Err(AppError::Invalid(format!(
            "the case “{}” has no attribute values or linked source to summarise",
            case.name
        )));
    }
    Ok(Material {
        label: "Case",
        name: case.name.clone(),
        text: text.join("\n\n"),
        project_id,
        source_id: None,
        node_id: None,
        case_id: Some(id),
    })
}

/// The first `max` characters, and whether anything was cut.
pub fn clip(text: &str, max: usize) -> (String, bool) {
    match text.char_indices().nth(max) {
        Some((byte, _)) => (text[..byte].to_string(), true),
        None => (text.to_string(), false),
    }
}

pub fn summary_prompt(material: &Material, text: &str) -> (String, String) {
    let system = "You help a qualitative researcher. Summarise only what the material says; never invent facts, \
        quotes, names or numbers. Write two or three short paragraphs in plain English, then a list of 3 to 5 key \
        themes as bullet points. Quote a few words where it helps, marked with quotation marks.";
    (
        system.into(),
        format!("{} “{}”:\n\n{text}", material.label, material.name),
    )
}

pub fn memo_body(summary: &str, model: &str, truncated: bool) -> String {
    let scope = if truncated {
        ", from the first part of the material only"
    } else {
        ""
    };
    let summary = tidy(summary);
    format!("{summary}\n\n---\nDrafted by {model} running on this computer{scope}. Check it against the data before relying on it.")
}

/// Drops a lead-in such as "Here's a summary of the passages:" that small models like to add.
fn tidy(summary: &str) -> &str {
    let summary = summary.trim();
    match summary.split_once('\n') {
        Some((first, rest)) => {
            let lead = first.trim().to_lowercase();
            let preamble =
                lead.ends_with(':') && (lead.starts_with("here") || lead.starts_with("summary"));
            if preamble && !rest.trim().is_empty() {
                rest.trim()
            } else {
                summary
            }
        }
        None => summary,
    }
}

pub fn memo_title(material: &Material) -> String {
    match material.label {
        "Passages coded at" => format!("AI summary: code “{}”", material.name),
        "Case" => format!("AI summary: case “{}”", material.name),
        _ => format!("AI summary: {}", material.name),
    }
}
