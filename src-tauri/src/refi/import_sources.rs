use roxmltree::Node;
use rusqlite::{params, Connection};

use super::import::Context;
use super::{child, elements};
use crate::ai::chunk;
use crate::db::sources::{self, NewSource};
use crate::error::AppResult;

pub fn import_sources(conn: &Connection, ctx: &mut Context, sources_el: Node) -> AppResult<()> {
    let mut insert_ref = conn.prepare(
        "INSERT INTO coding_references (guid, source_id, node_id, start_index, end_index)
         VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT DO NOTHING",
    )?;

    for el in sources_el.children().filter(Node::is_element) {
        // PDF sources carry their plain text (and text codings) in a Representation.
        let (holder, kind) = match el.tag_name().name() {
            "TextSource" => (Some(el), "text"),
            "PDFSource" => (child(el, "Representation"), "pdf"),
            _ => (None, ""),
        };
        let Some(holder) = holder else {
            ctx.summary.skipped += 1;
            continue;
        };
        let Some(text) = source_text(ctx, holder) else {
            ctx.summary.skipped += 1;
            continue;
        };
        // Replacing '\r' with a space keeps every code-point offset valid.
        let content = text.replace('\r', " ");
        let name = el.attribute("name").unwrap_or("Untitled source");
        let source_id = sources::insert(
            conn,
            &NewSource {
                project_id: ctx.project_id,
                guid: None,
                name,
                kind,
                file_path: None,
                content: &content,
                metadata: &serde_json::json!({ "importedFrom": "REFI-QDA" }),
            },
        )?;
        ctx.summary.sources += 1;
        if let Some(guid) = el.attribute("guid") {
            ctx.sources.insert(guid.to_string(), source_id);
        }

        let length = content.chars().count() as i64;
        for selection in elements(holder, "PlainTextSelection") {
            let position = |name| {
                selection
                    .attribute(name)
                    .and_then(|v| v.trim().parse::<i64>().ok())
            };
            let (Some(start), Some(end)) = (position("startPosition"), position("endPosition"))
            else {
                ctx.summary.skipped += 1;
                continue;
            };
            for coding in elements(selection, "Coding") {
                for code_ref in elements(coding, "CodeRef") {
                    let node_id = code_ref
                        .attribute("targetGUID")
                        .and_then(|g| ctx.codes.get(g));
                    match node_id {
                        Some(node_id) if start >= 0 && start < end && end <= length => {
                            insert_ref.execute(params![
                                crate::db::new_guid(),
                                source_id,
                                node_id,
                                start,
                                end
                            ])?;
                            ctx.summary.references += 1;
                        }
                        _ => ctx.summary.skipped += 1,
                    }
                }
            }
        }
        for note_ref in elements(el, "NoteRef") {
            if let Some(target) = note_ref.attribute("targetGUID") {
                ctx.note_sources.insert(target.to_string(), source_id);
            }
        }
        chunk::store(conn, source_id, &content)?;
    }
    Ok(())
}

/// Text from an inline PlainTextContent element or from plainTextPath.
fn source_text(ctx: &Context, holder: Node) -> Option<String> {
    if let Some(text) = child(holder, "PlainTextContent").and_then(|n| n.text()) {
        return Some(text.to_string());
    }
    let path = holder.attribute("plainTextPath")?;
    if let Some(internal) = path.strip_prefix("internal://") {
        let file_name = internal.rsplit('/').next()?.to_ascii_lowercase();
        return ctx.texts.get(&file_name).cloned();
    }
    let file = if let Some(absolute) = path.strip_prefix("absolute://") {
        std::path::PathBuf::from(absolute)
    } else {
        ctx.base_dir
            .join(path.strip_prefix("relative://").unwrap_or(path))
    };
    std::fs::read_to_string(file).ok()
}
