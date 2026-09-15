//! REFI-QDA Project exchange (https://www.qdasoftware.org). A .qdpx file is a zip
//! holding `project.qde` (XML, namespace urn:QDA-XML:project:1.0) and a `sources/`
//! folder. Text positions are code-point offsets, the same unit Sift QDA stores.

pub mod export;
mod export_meta;
pub mod import;
mod import_meta;
mod import_sources;

use roxmltree::Node;
use serde::Serialize;

use crate::error::AppError;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub project_id: i64,
    pub sources: usize,
    pub codes: usize,
    pub references: usize,
    pub memos: usize,
    pub cases: usize,
    pub skipped: usize,
}

pub(crate) fn refi_err(e: impl std::fmt::Display) -> AppError {
    AppError::Refi(e.to_string())
}

/// Escapes text for XML and drops characters XML 1.0 cannot represent.
pub(crate) fn escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\t' | '\n' | '\r' => out.push(c),
            c if (c as u32) < 0x20 || c == '\u{FFFE}' || c == '\u{FFFF}' => {}
            c => out.push(c),
        }
    }
    out
}

pub(crate) fn attr(name: &str, value: &str) -> String {
    format!(" {name}=\"{}\"", escape(value))
}

/// SQLite `datetime('now')` text to xsd:dateTime.
pub(crate) fn xsd_datetime(sqlite: &str) -> String {
    format!("{}Z", sqlite.replacen(' ', "T", 1))
}

/// Direct element children with the given local name.
pub(crate) fn elements<'a, 'i>(
    node: Node<'a, 'i>,
    name: &'a str,
) -> impl Iterator<Item = Node<'a, 'i>> {
    node.children()
        .filter(move |c| c.is_element() && c.tag_name().name() == name)
}

pub(crate) fn child<'a, 'i>(node: Node<'a, 'i>, name: &'a str) -> Option<Node<'a, 'i>> {
    elements(node, name).next()
}

#[cfg(test)]
mod tests {
    #[test]
    fn escapes_markup() {
        assert_eq!(
            super::escape("a<b & \"c\"\u{1}"),
            "a&lt;b &amp; &quot;c&quot;"
        );
    }
}
