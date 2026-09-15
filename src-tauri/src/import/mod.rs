mod docx;
mod odt;
mod pdf;
mod store;
mod text;
mod xlsx;

use std::path::Path;

pub use store::store;

use crate::db::sources::PageRange;
use crate::error::{AppError, AppResult};

/// Tabular survey data: the first column names the case, the rest are attributes.
pub struct SheetTable {
    pub headers: Vec<String>,
    pub value_types: Vec<&'static str>,
    pub rows: Vec<Vec<String>>,
}

/// A parsed file, ready to be stored as a source.
pub struct Parsed {
    pub kind: &'static str,
    pub content: String,
    pub metadata: serde_json::Value,
    pub pages: Vec<PageRange>,
    pub table: Option<SheetTable>,
}

pub fn parse(path: &Path) -> AppResult<Parsed> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    match ext.as_str() {
        "txt" | "md" | "text" => text::parse(path),
        "docx" | "doc" => docx::parse(path),
        "odt" => odt::parse(path),
        "pdf" => pdf::parse(path),
        "xlsx" | "xls" | "xlsm" | "ods" => xlsx::parse(path),
        _ if crate::transcribe::is_audio(path) => Err(AppError::Invalid(
            "audio files are transcribed rather than imported: use Transcribe audio".into(),
        )),
        other => Err(AppError::Invalid(format!(
            "unsupported file type: .{other}"
        ))),
    }
}

/// File name without extension, used as the default source name.
pub fn display_name(path: &Path) -> String {
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string()
}
