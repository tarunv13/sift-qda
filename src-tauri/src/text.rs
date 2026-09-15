//! Text helpers. All offsets in Sift QDA are Unicode code-point indices.

/// Returns the characters in `[start, end)` of `s`, clamped to its length.
pub fn char_slice(s: &str, start: i64, end: i64) -> String {
    let start = start.max(0) as usize;
    let end = end.max(0) as usize;
    s.chars()
        .skip(start)
        .take(end.saturating_sub(start))
        .collect()
}

/// Collapses a run of text into a single line suitable for one editor paragraph.
pub fn clean_line(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for ch in s.chars() {
        match ch {
            '\r' | '\n' | '\u{2028}' | '\u{2029}' => out.push(' '),
            '\t' => out.push('\t'),
            c if c.is_control() => {}
            c => out.push(c),
        }
    }
    out.trim_end().to_string()
}

/// Accumulates paragraphs into `content`, one paragraph per line.
#[derive(Default)]
pub struct ParagraphWriter {
    pub content: String,
    chars: i64,
}

impl ParagraphWriter {
    /// Current length of the content in code points.
    pub fn len(&self) -> i64 {
        self.chars
    }

    /// Appends a paragraph; blank paragraphs are skipped.
    pub fn push(&mut self, paragraph: &str) {
        let line = clean_line(paragraph);
        if line.trim().is_empty() {
            return;
        }
        if !self.content.is_empty() {
            self.content.push('\n');
            self.chars += 1;
        }
        self.chars += line.chars().count() as i64;
        self.content.push_str(&line);
    }

    pub fn finish(self) -> String {
        self.content
    }
}

/// Case-insensitive search returning `[start, end)` code-point spans.
pub fn find_all_ci(haystack: &str, needle: &str, limit: usize) -> Vec<(i64, i64)> {
    let fold = |c: char| c.to_lowercase().next().unwrap_or(c);
    let hay: Vec<char> = haystack.chars().map(fold).collect();
    let pattern: Vec<char> = needle.trim().chars().map(fold).collect();
    let mut out = Vec::new();
    if pattern.is_empty() || pattern.len() > hay.len() {
        return out;
    }
    let mut i = 0;
    while i + pattern.len() <= hay.len() && out.len() < limit {
        if hay[i..i + pattern.len()] == pattern[..] {
            out.push((i as i64, (i + pattern.len()) as i64));
            i += pattern.len();
        } else {
            i += 1;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_case_insensitively() {
        assert_eq!(
            find_all_ci("Climate ANXIETY and anxiety", "anxiety", 10),
            vec![(8, 15), (20, 27)]
        );
    }

    #[test]
    fn slices_by_code_point() {
        assert_eq!(char_slice("héllo wörld", 6, 11), "wörld");
        assert_eq!(char_slice("abc", 2, 99), "c");
    }

    #[test]
    fn writer_tracks_length() {
        let mut w = ParagraphWriter::default();
        w.push("Ünïcode");
        w.push("   ");
        w.push("line\nbreak");
        assert_eq!(w.len(), w.content.chars().count() as i64);
        assert_eq!(w.finish(), "Ünïcode\nline break");
    }
}
