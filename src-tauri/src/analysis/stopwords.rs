//! Common words to leave out of word counts.

use std::collections::HashSet;

/// Sounds that fill spoken English transcripts but carry no topic.
const ENGLISH_FILLERS: &[&str] = &[
    "uh", "um", "umm", "hmm", "mm", "mhm", "ah", "oh", "yeah", "okay", "ok",
];

/// Stop words for `language` ("en", "hi", "en+hi" or "none"), plus words the user chose to hide.
pub fn set(language: &str, extra: &[String]) -> HashSet<String> {
    let mut words = HashSet::new();
    for code in language.split('+') {
        match code {
            "en" => {
                words.extend(stop_words::get("en").iter().map(|w| w.to_lowercase()));
                words.extend(ENGLISH_FILLERS.iter().map(|w| w.to_string()));
            }
            "hi" => words.extend(stop_words::get("hi").iter().map(|w| w.to_lowercase())),
            _ => {}
        }
    }
    words.extend(
        extra
            .iter()
            .map(|w| w.trim().to_lowercase())
            .filter(|w| !w.is_empty()),
    );
    words
}
