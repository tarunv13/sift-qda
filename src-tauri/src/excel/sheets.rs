use std::collections::HashMap;

use office_oxide::xlsx::write::{CellData, CellStyle, SheetData, XlsxWriter};

use super::{DocumentRow, Extract, MemoRow};
use crate::db::nodes::Node;

fn header_style() -> CellStyle {
    CellStyle {
        background_color: Some("E9E3D5".into()),
        ..CellStyle::new().bold()
    }
}

fn wrap_style() -> CellStyle {
    CellStyle {
        wrap_text: true,
        ..CellStyle::new()
    }
}

fn text(value: impl Into<String>) -> CellData {
    CellData::String(value.into())
}

fn number(value: i64) -> CellData {
    CellData::Number(value as f64)
}

fn write_header(sheet: &mut SheetData<'_>, columns: &[(&str, f64)]) {
    for (col, (title, width)) in columns.iter().enumerate() {
        sheet.set_cell_styled(0, col, text(*title), header_style());
        sheet.set_column_width(col, *width);
    }
}

/// One row per coded passage: the sheet to sort, filter and pivot for themes.
pub fn extracts(book: &mut XlsxWriter, rows: &[Extract]) {
    let mut sheet = book.add_sheet("Coded extracts");
    write_header(
        &mut sheet,
        &[
            ("Theme", 22.0),
            ("Code", 24.0),
            ("Code path", 34.0),
            ("Document", 28.0),
            ("Page", 7.0),
            ("Extract", 90.0),
            ("Start", 8.0),
            ("End", 8.0),
        ],
    );
    for (i, r) in rows.iter().enumerate() {
        let row = i + 1;
        sheet.set_cell(row, 0, text(&r.theme));
        sheet.set_cell(row, 1, text(&r.code));
        sheet.set_cell(row, 2, text(&r.code_path));
        sheet.set_cell(row, 3, text(&r.document));
        sheet.set_cell(row, 4, r.page.map_or(CellData::Empty, number));
        sheet.set_cell_styled(row, 5, text(&r.text), wrap_style());
        sheet.set_cell(row, 6, number(r.start));
        sheet.set_cell(row, 7, number(r.end));
    }
}

pub fn codebook(book: &mut XlsxWriter, nodes: &[Node], paths: &HashMap<i64, Vec<String>>) {
    let mut sheet = book.add_sheet("Codebook");
    write_header(
        &mut sheet,
        &[
            ("Code path", 34.0),
            ("Code", 24.0),
            ("Theme", 22.0),
            ("Description", 60.0),
            ("References", 11.0),
            ("Documents", 11.0),
            ("Colour", 9.0),
        ],
    );
    for (i, node) in nodes.iter().enumerate() {
        let row = i + 1;
        let path = &paths[&node.id];
        sheet.set_cell(row, 0, text(path.join(" › ")));
        sheet.set_cell(row, 1, text(&node.name));
        sheet.set_cell(row, 2, text(&path[0]));
        sheet.set_cell_styled(row, 3, text(&node.description), wrap_style());
        sheet.set_cell(row, 4, number(node.reference_count));
        sheet.set_cell(row, 5, number(node.source_count));
        let swatch = CellStyle {
            background_color: Some(node.color.trim_start_matches('#').to_uppercase()),
            ..CellStyle::new()
        };
        sheet.set_cell_styled(row, 6, text(&node.color), swatch);
    }
}

/// How often each code appears in each document, with row totals.
pub fn matrix(
    book: &mut XlsxWriter,
    nodes: &[Node],
    paths: &HashMap<i64, Vec<String>>,
    documents: &[DocumentRow],
    counts: &HashMap<(i64, i64), i64>,
) {
    let mut sheet = book.add_sheet("Codes by document");
    sheet.set_cell_styled(0, 0, text("Code"), header_style());
    sheet.set_column_width(0, 34.0);
    for (col, doc) in documents.iter().enumerate() {
        sheet.set_cell_styled(0, col + 1, text(&doc.name), header_style());
        sheet.set_column_width(col + 1, 16.0);
    }
    let total_col = documents.len() + 1;
    sheet.set_cell_styled(0, total_col, text("Total"), header_style());

    for (i, node) in nodes.iter().enumerate() {
        let row = i + 1;
        sheet.set_cell(row, 0, text(paths[&node.id].join(" › ")));
        let mut total = 0;
        for (col, doc) in documents.iter().enumerate() {
            let count = counts.get(&(node.id, doc.id)).copied().unwrap_or(0);
            total += count;
            if count > 0 {
                sheet.set_cell(row, col + 1, number(count));
            }
        }
        sheet.set_cell_styled(row, total_col, number(total), CellStyle::new().bold());
    }
}

pub fn documents(book: &mut XlsxWriter, rows: &[DocumentRow]) {
    let mut sheet = book.add_sheet("Documents");
    write_header(
        &mut sheet,
        &[
            ("Document", 34.0),
            ("Type", 16.0),
            ("Words", 10.0),
            ("Coded references", 16.0),
            ("Imported", 20.0),
        ],
    );
    for (i, doc) in rows.iter().enumerate() {
        let row = i + 1;
        sheet.set_cell(row, 0, text(&doc.name));
        sheet.set_cell(row, 1, text(doc.kind));
        sheet.set_cell(row, 2, number(doc.words as i64));
        sheet.set_cell(row, 3, number(doc.references));
        sheet.set_cell(row, 4, text(&doc.imported));
    }
}

pub fn memos(book: &mut XlsxWriter, rows: &[MemoRow]) {
    let mut sheet = book.add_sheet("Memos");
    write_header(
        &mut sheet,
        &[
            ("Title", 28.0),
            ("Document", 26.0),
            ("Code", 22.0),
            ("Updated", 20.0),
            ("Memo", 90.0),
        ],
    );
    for (i, memo) in rows.iter().enumerate() {
        let row = i + 1;
        sheet.set_cell(row, 0, text(&memo.title));
        sheet.set_cell(
            row,
            1,
            memo.document.as_deref().map_or(CellData::Empty, text),
        );
        sheet.set_cell(row, 2, memo.code.as_deref().map_or(CellData::Empty, text));
        sheet.set_cell(row, 3, text(&memo.updated));
        sheet.set_cell_styled(row, 4, text(&memo.body), wrap_style());
    }
}
