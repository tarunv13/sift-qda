use roxmltree::Node;
use rusqlite::Connection;

use super::import::Context;
use super::{child, elements};
use crate::db::cases;
use crate::db::memos::{self, NewMemo};
use crate::db::nodes::{self, NewNode};
use crate::error::AppResult;

const FALLBACK_COLOR: &str = "#f5c542";

/// Recursively imports `<Code>` elements, preserving the hierarchy.
pub fn import_codes(
    conn: &Connection,
    ctx: &mut Context,
    parent: Node,
    parent_id: Option<i64>,
) -> AppResult<()> {
    for code in elements(parent, "Code") {
        let color = code
            .attribute("color")
            .filter(|c| c.len() == 7 && c.starts_with('#'))
            .unwrap_or(FALLBACK_COLOR);
        let description = child(code, "Description")
            .and_then(|d| d.text())
            .unwrap_or("");
        let id = nodes::create(
            conn,
            &NewNode {
                project_id: ctx.project_id,
                guid: None,
                parent_id,
                name: code.attribute("name").unwrap_or("Unnamed code"),
                color,
                description,
            },
        )?;
        ctx.summary.codes += 1;
        if let Some(guid) = code.attribute("guid") {
            ctx.codes.insert(guid.to_string(), id);
        }
        import_codes(conn, ctx, code, Some(id))?;
    }
    Ok(())
}

pub fn import_variables(conn: &Connection, ctx: &mut Context, variables: Node) -> AppResult<()> {
    for variable in elements(variables, "Variable") {
        let value_type = match variable.attribute("typeOfVariable") {
            Some("Integer") => "Integer",
            Some("Float") => "Float",
            Some("Boolean") => "Boolean",
            Some("Date" | "DateTime") => "Date",
            _ => "Text",
        };
        let name = variable.attribute("name").unwrap_or("Variable");
        let id = cases::ensure_attribute(conn, ctx.project_id, name, value_type, None)?;
        if let Some(guid) = variable.attribute("guid") {
            ctx.attributes.insert(guid.to_string(), id);
        }
    }
    Ok(())
}

pub fn import_cases(conn: &Connection, ctx: &mut Context, cases_el: Node) -> AppResult<()> {
    for case in elements(cases_el, "Case") {
        let source_id = elements(case, "SourceRef")
            .filter_map(|r| r.attribute("targetGUID"))
            .find_map(|g| ctx.sources.get(g).copied());
        let name = case.attribute("name").unwrap_or("Case");
        let case_id = cases::create_case(conn, ctx.project_id, source_id, name, None)?;
        ctx.summary.cases += 1;

        for value in elements(case, "VariableValue") {
            let attribute_id = child(value, "VariableRef")
                .and_then(|r| r.attribute("targetGUID"))
                .and_then(|g| ctx.attributes.get(g));
            let text = value
                .children()
                .find(|c| c.is_element() && c.tag_name().name().ends_with("Value"))
                .and_then(|c| c.text());
            if let (Some(attribute_id), Some(text)) = (attribute_id, text) {
                cases::set_value(conn, case_id, *attribute_id, text.trim())?;
            }
        }
    }
    Ok(())
}

pub fn import_notes(conn: &Connection, ctx: &mut Context, notes: Node) -> AppResult<()> {
    for note in elements(notes, "Note") {
        let body = child(note, "PlainTextContent")
            .and_then(|n| n.text())
            .unwrap_or("");
        let source_id = note
            .attribute("guid")
            .and_then(|g| ctx.note_sources.get(g))
            .copied();
        memos::create(
            conn,
            &NewMemo {
                project_id: ctx.project_id,
                guid: None,
                source_id,
                node_id: None,
                title: note.attribute("name").unwrap_or("Note"),
                body,
            },
        )?;
        ctx.summary.memos += 1;
    }
    Ok(())
}
