//! A one-sheet workbook of a coding matrix with row and column totals.

use std::path::Path;

use office_oxide::xlsx::write::{CellData, CellStyle, XlsxWriter};

use crate::analysis::matrix::CodingMatrix;
use crate::error::{AppError, AppResult};

fn header() -> CellStyle {
    CellStyle {
        background_color: Some("E9E3D5".into()),
        ..CellStyle::new().bold()
    }
}

fn text(value: &str) -> CellData {
    CellData::String(value.to_string())
}

fn number(value: i64) -> CellData {
    CellData::Number(value as f64)
}

pub fn export(matrix: &CodingMatrix, dest: &Path) -> AppResult<()> {
    let mut book = XlsxWriter::new();
    {
        let mut sheet = book.add_sheet("Coding matrix");
        let corner = if matrix.themes_only { "Theme" } else { "Code" };
        sheet.set_cell_styled(0, 0, text(corner), header());
        sheet.set_column_width(0, 36.0);
        for (c, column) in matrix.columns.iter().enumerate() {
            sheet.set_cell_styled(0, c + 1, text(&column.label), header());
            sheet.set_column_width(c + 1, 16.0);
        }
        let total_col = matrix.columns.len() + 1;
        sheet.set_cell_styled(0, total_col, text("Total"), header());

        for (r, row) in matrix.rows.iter().enumerate() {
            sheet.set_cell(r + 1, 0, text(&row.label));
            for (c, value) in matrix.cells[r].iter().enumerate() {
                if *value > 0 {
                    sheet.set_cell(r + 1, c + 1, number(*value));
                }
            }
            sheet.set_cell_styled(r + 1, total_col, number(row.total), CellStyle::new().bold());
        }

        let total_row = matrix.rows.len() + 1;
        sheet.set_cell_styled(total_row, 0, text("Total"), header());
        for (c, column) in matrix.columns.iter().enumerate() {
            sheet.set_cell_styled(
                total_row,
                c + 1,
                number(column.total),
                CellStyle::new().bold(),
            );
        }
    }
    book.save(dest)
        .map_err(|e| AppError::Office(format!("could not write {}: {e}", dest.display())))
}
