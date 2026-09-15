//! Audio transcription with a transcriber already installed on this computer: a folder holding
//! `transcribe.py` and its Python environment in `.venv`. Sift QDA runs it on an audio file,
//! follows its progress, and imports the Markdown transcript as a text source linked to the audio.
//! Audio and transcripts never leave the computer.

pub mod config;
pub mod markdown;
pub mod progress;
pub mod runner;

use std::path::Path;

pub const AUDIO_EXTENSIONS: &[&str] = &["wav", "mp3", "m4a", "flac", "ogg", "opus", "aac", "wma"];

pub fn is_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| AUDIO_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
}
