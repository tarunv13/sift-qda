//! OpenDocument text (.odt) via zip + roxmltree: office_oxide does not read ODF.
//! Mirrors docx.rs: one line per paragraph, heading, list item and table row.

use std::fs::File;
use std::io::Read;
use std::path::Path;

use roxmltree::{Document, Node};
use zip::ZipArchive;

use super::Parsed;
use crate::error::{AppError, AppResult};
use crate::text::ParagraphWriter;

pub fn parse(path: &Path) -> AppResult<Parsed> {
    let mut zip = ZipArchive::new(File::open(path)?).map_err(odt_err)?;
    let content = read_entry(&mut zip, "content.xml")?
        .ok_or_else(|| AppError::Office("not an OpenDocument file (content.xml missing)".into()))?;
    let doc = Document::parse(&content).map_err(odt_err)?;

    let mut writer = ParagraphWriter::default();
    if let Some(body) = doc.descendants().find(|n| {
        n.is_element()
            && n.tag_name().name() == "text"
            && n.parent_element()
                .is_some_and(|p| p.tag_name().name() == "body")
    }) {
        write_blocks(&mut writer, body, false);
    }

    let meta_xml = read_entry(&mut zip, "meta.xml")?.unwrap_or_default();
    let metadata = Document::parse(&meta_xml)
        .map(|meta| {
            let field = |name: &str| {
                meta.descendants()
                    .find(|n| n.tag_name().name() == name)
                    .and_then(|n| n.text())
                    .map(str::to_owned)
            };
            serde_json::json!({
                "title": field("title"),
                "author": field("initial-creator").or_else(|| field("creator")),
                "subject": field("subject"),
                "created": field("creation-date"),
                "modified": field("date"),
                "format": "odt",
            })
        })
        .unwrap_or_else(|_| serde_json::json!({ "format": "odt" }));

    Ok(Parsed {
        kind: "docx",
        content: writer.finish(),
        metadata,
        pages: Vec::new(),
        table: None,
    })
}

fn read_entry(zip: &mut ZipArchive<File>, name: &str) -> AppResult<Option<String>> {
    let Ok(mut entry) = zip.by_name(name) else {
        return Ok(None);
    };
    let mut text = String::new();
    entry.read_to_string(&mut text)?;
    Ok(Some(text))
}

fn odt_err(e: impl std::fmt::Display) -> AppError {
    AppError::Office(e.to_string())
}

fn write_blocks(writer: &mut ParagraphWriter, parent: Node, in_list: bool) {
    for node in parent.children().filter(Node::is_element) {
        match node.tag_name().name() {
            "p" | "h" => {
                let text = inline_text(node);
                writer.push(&if in_list { format!("• {text}") } else { text });
            }
            "list" | "list-item" | "list-header" => write_blocks(writer, node, true),
            "table" | "table-header-rows" | "table-rows" | "section" => {
                write_blocks(writer, node, in_list)
            }
            "table-row" => {
                let cells: Vec<String> = node
                    .children()
                    .filter(|c| c.is_element() && c.tag_name().name() == "table-cell")
                    .map(|cell| {
                        let mut inner = ParagraphWriter::default();
                        write_blocks(&mut inner, cell, false);
                        inner.finish().replace('\n', " ")
                    })
                    .collect();
                writer.push(&cells.join(" | "));
            }
            _ => {}
        }
    }
}

/// Paragraph text, expanding ODF whitespace elements and skipping footnote bodies.
fn inline_text(node: Node) -> String {
    let mut out = String::new();
    for child in node.children() {
        if child.is_text() {
            out.push_str(child.text().unwrap_or_default());
            continue;
        }
        match child.tag_name().name() {
            "s" => {
                let count = child
                    .attributes()
                    .find(|a| a.name() == "c")
                    .and_then(|a| a.value().parse().ok())
                    .unwrap_or(1);
                out.push_str(&" ".repeat(count));
            }
            "tab" => out.push('\t'),
            "line-break" => out.push(' '),
            "note" | "annotation" | "bookmark" | "bookmark-start" | "bookmark-end" => {}
            _ => out.push_str(&inline_text(child)),
        }
    }
    out
}
