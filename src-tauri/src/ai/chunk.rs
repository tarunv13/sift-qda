use rusqlite::{params, Connection};

use crate::error::AppResult;

/// Chunks grow paragraph by paragraph until they pass this many characters.
const TARGET_CHARS: i64 = 700;
/// Paragraphs longer than this are cut into fixed windows.
const MAX_CHARS: i64 = 1200;

/// Splits content into `[start, end)` code-point spans aligned to paragraph boundaries.
pub fn spans(content: &str) -> Vec<(i64, i64)> {
    let mut spans = Vec::new();
    let mut open: Option<i64> = None;
    let mut end = 0;
    let mut pos = 0;

    for paragraph in content.split('\n') {
        let len = paragraph.chars().count() as i64;
        let (p_start, p_end) = (pos, pos + len);
        pos = p_end + 1;
        if paragraph.trim().is_empty() {
            continue;
        }
        if len > MAX_CHARS {
            if let Some(start) = open.take() {
                spans.push((start, end));
            }
            let mut s = p_start;
            while s < p_end {
                let e = (s + MAX_CHARS).min(p_end);
                spans.push((s, e));
                s = e;
            }
            continue;
        }
        match open {
            Some(start) if p_end - start > TARGET_CHARS => {
                spans.push((start, end));
                open = Some(p_start);
            }
            None => open = Some(p_start),
            _ => {}
        }
        end = p_end;
    }
    if let Some(start) = open {
        spans.push((start, end));
    }
    spans
}

/// Records chunks for a source; the embedding worker picks them up later.
pub fn store(conn: &Connection, source_id: i64, content: &str) -> AppResult<usize> {
    let mut stmt = conn
        .prepare("INSERT INTO chunks (source_id, start_offset, end_offset) VALUES (?1, ?2, ?3)")?;
    let spans = spans(content);
    for (start, end) in &spans {
        stmt.execute(params![source_id, start, end])?;
    }
    Ok(spans.len())
}

#[cfg(test)]
mod tests {
    use super::spans;

    #[test]
    fn groups_short_paragraphs() {
        let text = "one\n\ntwo\nthree";
        assert_eq!(spans(text), vec![(0, 14)]);
    }

    #[test]
    fn splits_long_paragraphs() {
        let long = "a".repeat(2500);
        let s = spans(&format!("intro\n{long}"));
        assert_eq!(s[0], (0, 5));
        assert_eq!(s[1], (6, 1206));
        assert_eq!(s.last().unwrap().1, 2506);
    }
}
