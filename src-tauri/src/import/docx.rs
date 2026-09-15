//! Word documents via office_oxide's format-agnostic IR. Each paragraph, heading,
//! list item and table row becomes one line of `content`, so paragraph structure
//! survives into the coding editor.

use std::path::Path;

use office_oxide::ir::{Element, InlineContent, List};
use office_oxide::Document;

use super::Parsed;
use crate::error::{AppError, AppResult};
use crate::text::ParagraphWriter;

pub fn parse(path: &Path) -> AppResult<Parsed> {
    let doc = Document::open(path).map_err(|e| AppError::Office(e.to_string()))?;
    let ir = doc.to_ir();

    let mut writer = ParagraphWriter::default();
    for section in &ir.sections {
        write_elements(&mut writer, &section.elements);
    }

    let m = &ir.metadata;
    let metadata = serde_json::json!({
        "title": m.title,
        "author": m.author,
        "subject": m.subject,
        "keywords": m.keywords,
        "created": m.created,
        "modified": m.modified,
    });
    Ok(Parsed {
        kind: "docx",
        content: writer.finish(),
        metadata,
        pages: Vec::new(),
        table: None,
    })
}

fn write_elements(writer: &mut ParagraphWriter, elements: &[Element]) {
    for element in elements {
        match element {
            Element::Heading(h) => writer.push(&inline_text(&h.content)),
            Element::Paragraph(p) => writer.push(&inline_text(&p.content)),
            Element::List(list) => write_list(writer, list),
            Element::Table(table) => {
                for row in &table.rows {
                    let cells: Vec<String> = row
                        .cells
                        .iter()
                        .map(|cell| {
                            let mut inner = ParagraphWriter::default();
                            write_elements(&mut inner, &cell.content);
                            inner.finish().replace('\n', " ")
                        })
                        .collect();
                    writer.push(&cells.join(" | "));
                }
            }
            _ => {}
        }
    }
}

fn write_list(writer: &mut ParagraphWriter, list: &List) {
    for item in &list.items {
        let mut inner = ParagraphWriter::default();
        write_elements(&mut inner, &item.content);
        writer.push(&format!("• {}", inner.finish().replace('\n', " ")));
        if let Some(nested) = &item.nested {
            write_list(writer, nested);
        }
    }
}

fn inline_text(content: &[InlineContent]) -> String {
    let mut out = String::new();
    for inline in content {
        match inline {
            InlineContent::Text(span) => out.push_str(&span.text),
            InlineContent::LineBreak => out.push(' '),
            _ => {}
        }
    }
    out
}
