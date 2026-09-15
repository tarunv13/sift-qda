//! Excel workbook for thematic analysis: every coded extract with its theme and page,
//! the codebook, a code × document frequency matrix, documents and memos.
//! Written with office_oxide's XLSX writer, so no extra dependency.

pub mod matrix;
mod sheets;

use std::collections::HashMap;
use std::path::Path;

use office_oxide::xlsx::write::XlsxWriter;
use rusqlite::Connection;

use crate::db::collect;
use crate::db::nodes::{self, Node};
use crate::error::{AppError, AppResult};

/// Excel rejects cells longer than 32,767 characters.
const MAX_CELL_CHARS: usize = 32_000;

pub struct Extract {
    pub theme: String,
    pub code: String,
    pub code_path: String,
    pub document: String,
    pub page: Option<i64>,
    pub text: String,
    pub start: i64,
    pub end: i64,
}

pub struct DocumentRow {
    pub id: i64,
    pub name: String,
    pub kind: &'static str,
    pub words: usize,
    pub references: i64,
    pub imported: String,
}

pub struct MemoRow {
    pub title: String,
    pub document: Option<String>,
    pub code: Option<String>,
    pub updated: String,
    pub body: String,
}

pub fn export(conn: &Connection, project_id: i64, dest: &Path) -> AppResult<()> {
    let mut nodes = nodes::list(conn, project_id)?;
    let paths = code_paths(&nodes);
    nodes.sort_by_key(|n| paths[&n.id].join("\u{0}").to_lowercase());

    let extracts = load_extracts(conn, project_id, &nodes, &paths)?;
    let documents = load_documents(conn, project_id)?;
    let matrix = load_matrix(conn, project_id)?;
    let memos = load_memos(conn, project_id)?;

    let mut book = XlsxWriter::new();
    sheets::extracts(&mut book, &extracts);
    sheets::codebook(&mut book, &nodes, &paths);
    sheets::matrix(&mut book, &nodes, &paths, &documents, &matrix);
    sheets::documents(&mut book, &documents);
    sheets::memos(&mut book, &memos);
    book.save(dest)
        .map_err(|e| AppError::Office(format!("could not write {}: {e}", dest.display())))
}

/// Names from the top-level theme down to each code.
pub(crate) fn code_paths(nodes: &[Node]) -> HashMap<i64, Vec<String>> {
    let by_id: HashMap<i64, &Node> = nodes.iter().map(|n| (n.id, n)).collect();
    nodes
        .iter()
        .map(|node| {
            let mut path = vec![node.name.clone()];
            let mut parent = node.parent_id;
            while let Some(p) = parent.and_then(|id| by_id.get(&id)) {
                if path.len() > 64 {
                    break; // defensive: a corrupt cycle must not hang the export
                }
                path.push(p.name.clone());
                parent = p.parent_id;
            }
            path.reverse();
            (node.id, path)
        })
        .collect()
}

fn load_extracts(
    conn: &Connection,
    project_id: i64,
    nodes: &[Node],
    paths: &HashMap<i64, Vec<String>>,
) -> AppResult<Vec<Extract>> {
    let mut stmt = conn.prepare(
        "SELECT r.node_id, s.name, r.start_index, r.end_index,
                substr(s.content, r.start_index + 1, r.end_index - r.start_index),
                (SELECT p.page FROM source_pages p
                  WHERE p.source_id = r.source_id AND p.start_offset <= r.start_index
                  ORDER BY p.page DESC LIMIT 1)
         FROM coding_references r JOIN sources s ON s.id = r.source_id
         WHERE s.project_id = ?1",
    )?;
    let rows = collect(stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get(2)?,
            r.get(3)?,
            r.get::<_, String>(4)?,
            r.get(5)?,
        ))
    })?)?;

    let order: HashMap<i64, usize> = nodes.iter().enumerate().map(|(i, n)| (n.id, i)).collect();
    let mut extracts: Vec<(usize, Extract)> = rows
        .into_iter()
        .filter_map(|(node_id, document, start, end, text, page)| {
            let path = paths.get(&node_id)?;
            Some((
                order[&node_id],
                Extract {
                    theme: path[0].clone(),
                    code: path[path.len() - 1].clone(),
                    code_path: path.join(" › "),
                    document,
                    page,
                    text: text.chars().take(MAX_CELL_CHARS).collect(),
                    start,
                    end,
                },
            ))
        })
        .collect();
    extracts.sort_by(|(a, x), (b, y)| {
        a.cmp(b)
            .then_with(|| x.document.cmp(&y.document))
            .then(x.start.cmp(&y.start))
    });
    Ok(extracts.into_iter().map(|(_, e)| e).collect())
}

fn load_documents(conn: &Connection, project_id: i64) -> AppResult<Vec<DocumentRow>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.kind, s.content, s.created_at,
                (SELECT COUNT(*) FROM coding_references r WHERE r.source_id = s.id)
         FROM sources s WHERE s.project_id = ?1 ORDER BY s.name COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([project_id], |r| {
        let kind: String = r.get(2)?;
        let content: String = r.get(3)?;
        Ok(DocumentRow {
            id: r.get(0)?,
            name: r.get(1)?,
            kind: match kind.as_str() {
                "docx" => "Word document",
                "pdf" => "PDF",
                "xlsx" => "Spreadsheet",
                _ => "Text",
            },
            words: content.split_whitespace().count(),
            imported: r.get(4)?,
            references: r.get(5)?,
        })
    })?;
    collect(rows)
}

/// `(node_id, source_id) → reference count`.
fn load_matrix(conn: &Connection, project_id: i64) -> AppResult<HashMap<(i64, i64), i64>> {
    let mut stmt = conn.prepare(
        "SELECT r.node_id, r.source_id, COUNT(*) FROM coding_references r
         JOIN sources s ON s.id = r.source_id WHERE s.project_id = ?1 GROUP BY r.node_id, r.source_id",
    )?;
    let rows = collect(stmt.query_map([project_id], |r| Ok(((r.get(0)?, r.get(1)?), r.get(2)?)))?)?;
    Ok(rows.into_iter().collect())
}

fn load_memos(conn: &Connection, project_id: i64) -> AppResult<Vec<MemoRow>> {
    let mut stmt = conn.prepare(
        "SELECT m.title, s.name, n.name, m.updated_at, m.body FROM memos m
         LEFT JOIN sources s ON s.id = m.source_id LEFT JOIN nodes n ON n.id = m.node_id
         WHERE m.project_id = ?1 ORDER BY m.updated_at DESC",
    )?;
    let rows = stmt.query_map([project_id], |r| {
        let body: String = r.get(4)?;
        Ok(MemoRow {
            title: r.get(0)?,
            document: r.get(1)?,
            code: r.get(2)?,
            updated: r.get(3)?,
            body: body.chars().take(MAX_CELL_CHARS).collect(),
        })
    })?;
    collect(rows)
}
