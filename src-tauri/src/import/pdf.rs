//! PDF text via pdf-extract, page by page, so each visual page maps to a
//! character range of `content` (stored in `source_pages`).

use std::path::Path;

use super::Parsed;
use crate::db::sources::PageRange;
use crate::error::{AppError, AppResult};
use crate::text::ParagraphWriter;

pub fn parse(path: &Path) -> AppResult<Parsed> {
    let owned = path.to_path_buf();
    // pdf-extract panics on some malformed files; keep that from taking down the app.
    let pages = std::panic::catch_unwind(move || pdf_extract::extract_text_by_pages(&owned))
        .map_err(|_| AppError::Pdf("the PDF could not be parsed".into()))?
        .map_err(|e| AppError::Pdf(e.to_string()))?;

    let mut writer = ParagraphWriter::default();
    let mut ranges = Vec::with_capacity(pages.len());
    for (index, page) in pages.iter().enumerate() {
        let before = writer.len();
        for paragraph in paragraphs(page) {
            writer.push(&paragraph);
        }
        // Skip the '\n' separator the writer inserts before this page's first paragraph.
        let start = if before == 0 {
            0
        } else {
            (before + 1).min(writer.len())
        };
        ranges.push(PageRange {
            page: index as i64 + 1,
            start,
            end: writer.len(),
        });
    }

    if writer.len() == 0 {
        return Err(AppError::Pdf(
            "no extractable text (the PDF may be scanned images; OCR it first)".into(),
        ));
    }
    let metadata = serde_json::json!({ "pageCount": pages.len() });
    Ok(Parsed {
        kind: "pdf",
        content: writer.finish(),
        metadata,
        pages: ranges,
        table: None,
    })
}

/// pdf-extract emits hard-wrapped lines; blank lines separate paragraphs.
fn paragraphs(page: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    for line in page.lines().map(str::trim) {
        if line.is_empty() {
            if !current.is_empty() {
                out.push(std::mem::take(&mut current));
            }
            continue;
        }
        if current.ends_with('-') && !current.ends_with(" -") {
            current.pop(); // re-join a hyphenated line break
        } else if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(line);
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::paragraphs;

    #[test]
    fn joins_wrapped_lines() {
        let p = paragraphs("Climate anx-\niety is rising\n\nSecond para\n");
        assert_eq!(p, vec!["Climate anxiety is rising", "Second para"]);
    }
}
