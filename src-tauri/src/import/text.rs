use std::path::Path;

use super::Parsed;
use crate::error::AppResult;
use crate::text::ParagraphWriter;

pub fn parse(path: &Path) -> AppResult<Parsed> {
    let bytes = std::fs::read(path)?;
    let raw = String::from_utf8_lossy(bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(&bytes));
    let mut writer = ParagraphWriter::default();
    for line in raw.lines() {
        writer.push(line);
    }
    Ok(Parsed {
        kind: "text",
        content: writer.finish(),
        metadata: serde_json::json!({}),
        pages: Vec::new(),
        table: None,
    })
}
