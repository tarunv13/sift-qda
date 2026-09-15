//! Spreadsheets as survey data: row 1 holds attribute names, every following row
//! is a case. The first column names the case. The rendered `content` lets
//! open-ended answers be coded like any other source.

use std::path::Path;

use calamine::{open_workbook_auto, Data, Reader};

use super::{Parsed, SheetTable};
use crate::error::{AppError, AppResult};
use crate::text::ParagraphWriter;

pub fn parse(path: &Path) -> AppResult<Parsed> {
    let mut workbook = open_workbook_auto(path).map_err(|e| AppError::Sheet(e.to_string()))?;
    let sheet_name = workbook.sheet_names().first().cloned().unwrap_or_default();
    let range = workbook
        .worksheet_range_at(0)
        .ok_or_else(|| AppError::Sheet("the workbook has no worksheets".into()))?
        .map_err(|e| AppError::Sheet(e.to_string()))?;

    let mut rows = range.rows();
    let headers: Vec<String> = rows
        .next()
        .ok_or_else(|| AppError::Sheet("the first worksheet is empty".into()))?
        .iter()
        .enumerate()
        .map(|(i, cell)| match cell_text(cell) {
            name if name.is_empty() => format!("Column {}", i + 1),
            name => name,
        })
        .collect();

    let mut value_types: Vec<Option<&'static str>> = vec![None; headers.len()];
    let mut table_rows = Vec::new();
    let mut writer = ParagraphWriter::default();

    for row in rows {
        let cells: Vec<String> = (0..headers.len())
            .map(|i| row.get(i).map(cell_text).unwrap_or_default())
            .collect();
        if cells.iter().all(|c| c.is_empty()) {
            continue;
        }
        for (i, cell) in row.iter().enumerate().take(headers.len()) {
            if value_types[i].is_none() && !matches!(cell, Data::Empty) {
                value_types[i] = Some(value_type(cell));
            }
        }
        let case_name = match cells[0].as_str() {
            "" => format!("Case {}", table_rows.len() + 1),
            name => name.to_string(),
        };
        writer.push(&case_name);
        for (header, value) in headers.iter().zip(&cells).skip(1) {
            if !value.is_empty() {
                writer.push(&format!("{header}: {value}"));
            }
        }
        let mut stored = cells;
        stored[0] = case_name;
        table_rows.push(stored);
    }

    let metadata = serde_json::json!({ "sheet": sheet_name, "caseCount": table_rows.len() });
    let table = SheetTable {
        headers,
        value_types: value_types
            .into_iter()
            .map(|t| t.unwrap_or("Text"))
            .collect(),
        rows: table_rows,
    };
    Ok(Parsed {
        kind: "xlsx",
        content: writer.finish(),
        metadata,
        pages: Vec::new(),
        table: Some(table),
    })
}

fn cell_text(cell: &Data) -> String {
    match cell {
        Data::Empty | Data::Error(_) => String::new(),
        other => other.to_string().trim().to_string(),
    }
}

/// REFI-QDA variable type for a cell value.
fn value_type(cell: &Data) -> &'static str {
    match cell {
        // Excel stores every number as a float; whole numbers are integers to a researcher.
        Data::Int(_) => "Integer",
        Data::Float(f) if f.fract() == 0.0 && f.abs() < 9.0e15 => "Integer",
        Data::Float(_) => "Float",
        Data::Bool(_) => "Boolean",
        Data::DateTime(_) | Data::DateTimeIso(_) => "Date",
        _ => "Text",
    }
}
