//! Word counts for the word cloud, frequency chart and table.

use std::collections::{HashMap, HashSet};

use serde::Serialize;
use unicode_segmentation::UnicodeSegmentation;

use super::scope::Span;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordCount {
    pub word: String,
    pub count: i64,
    /// How many different sources the word appears in.
    pub sources: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordFrequency {
    pub words: Vec<WordCount>,
    pub total_words: i64,
    pub distinct_words: i64,
}

/// Which words count.
pub struct Filter<'a> {
    pub min_length: usize,
    pub stop_words: &'a HashSet<String>,
    /// Skip transcript speaker labels such as "P01:" or "Interviewer:" at the start of a line.
    pub skip_speakers: bool,
}

/// Length in bytes of a speaker label at the start of `line`, including its colon; 0 when there is none.
pub fn speaker_label_len(line: &str) -> usize {
    match line.find(':') {
        Some(colon) if colon <= 40 && line[..colon].split_whitespace().count() <= 4 => colon + 1,
        _ => 0,
    }
}

/// Every counted word in `text`: (byte index, the word as written, the word lower-cased).
pub fn words<'t>(
    text: &'t str,
    filter: &'t Filter<'t>,
) -> impl Iterator<Item = (usize, &'t str, String)> + 't {
    let mut line_start = 0;
    text.split_inclusive('\n').flat_map(move |line| {
        let base = line_start;
        line_start += line.len();
        let skip = if filter.skip_speakers {
            speaker_label_len(line)
        } else {
            0
        };
        line[skip..]
            .unicode_word_indices()
            .filter_map(move |(index, word)| {
                let lower = word.to_lowercase();
                let keep = word.chars().any(char::is_alphabetic)
                    && lower.chars().count() >= filter.min_length
                    && !filter.stop_words.contains(&lower);
                keep.then_some((base + skip + index, word, lower))
            })
    })
}

pub fn frequency(spans: &[Span], filter: &Filter, limit: usize) -> WordFrequency {
    let mut counts: HashMap<String, (i64, HashSet<i64>)> = HashMap::new();
    let mut total = 0;
    for span in spans {
        for (_, _, word) in words(&span.text, filter) {
            total += 1;
            let entry = counts.entry(word).or_default();
            entry.0 += 1;
            entry.1.insert(span.source_id);
        }
    }

    let distinct = counts.len() as i64;
    let mut list: Vec<WordCount> = counts
        .into_iter()
        .map(|(word, (count, sources))| WordCount {
            word,
            count,
            sources: sources.len() as i64,
        })
        .collect();
    list.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.word.cmp(&b.word)));
    list.truncate(limit);
    WordFrequency {
        words: list,
        total_words: total,
        distinct_words: distinct,
    }
}
