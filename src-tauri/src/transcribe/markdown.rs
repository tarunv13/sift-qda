//! Reads the transcriber's Markdown: a header, then paragraphs such as `**[00:01:02]** text` or
//! `**[00:01:02] Speaker 1:** text`. Each paragraph becomes one paragraph of the source, and its
//! start time is kept so the audio can play from any passage.

use serde_json::json;

use crate::error::{AppError, AppResult};
use crate::import::Parsed;
use crate::text::{clean_line, ParagraphWriter};

#[derive(Debug, PartialEq)]
pub struct Segment {
    pub seconds: u32,
    pub speaker: Option<String>,
    pub text: String,
}

fn seconds(clock: &str) -> Option<u32> {
    let parts = clock
        .split(':')
        .map(|p| p.trim().parse::<u32>().ok())
        .collect::<Option<Vec<u32>>>()?;
    match parts[..] {
        [h, m, s] => Some(h * 3600 + m * 60 + s),
        [m, s] => Some(m * 60 + s),
        _ => None,
    }
}

/// `rest` is a line after its leading `**[`.
fn segment(rest: &str) -> Option<Segment> {
    let (clock, after) = rest.split_once(']')?;
    let seconds = seconds(clock)?;
    if let Some(text) = after.strip_prefix("**") {
        return Some(Segment {
            seconds,
            speaker: None,
            text: text.trim().to_string(),
        });
    }
    let (label, text) = after.split_once(":**")?;
    Some(Segment {
        seconds,
        speaker: Some(label.trim().to_string()).filter(|s| !s.is_empty()),
        text: text.trim().to_string(),
    })
}

/// Timestamped paragraphs in order. Untimed lines continue the paragraph before them; the header
/// table, notes, headings and rules are skipped.
pub fn segments(markdown: &str) -> Vec<Segment> {
    let mut out: Vec<Segment> = Vec::new();
    for line in markdown.lines() {
        let line = line.trim();
        if let Some(found) = line.strip_prefix("**[").and_then(segment) {
            out.push(found);
            continue;
        }
        let skip = line.is_empty() || line.starts_with(['|', '>', '#']) || line.starts_with("---");
        if let (false, Some(last)) = (skip, out.last_mut()) {
            last.text.push(' ');
            last.text.push_str(line);
        }
    }
    out
}

/// A transcript ready to store as a text source, with paragraph start times in its metadata.
pub fn parse(markdown: &str, mode: &str) -> AppResult<Parsed> {
    let mut writer = ParagraphWriter::default();
    let mut starts = Vec::new();
    for found in segments(markdown) {
        let paragraph = match &found.speaker {
            Some(speaker) => format!("{speaker}: {}", found.text),
            None => found.text,
        };
        let length = clean_line(&paragraph).chars().count() as i64;
        if clean_line(&paragraph).trim().is_empty() {
            continue;
        }
        writer.push(&paragraph);
        starts.push(json!([writer.len() - length, found.seconds]));
    }
    if starts.is_empty() {
        return Err(AppError::Transcribe(
            "the transcript has no timestamped paragraphs".into(),
        ));
    }
    Ok(Parsed {
        kind: "text",
        content: writer.finish(),
        metadata: json!({ "transcript": { "mode": mode, "starts": starts } }),
        pages: Vec::new(),
        table: None,
    })
}
