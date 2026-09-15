//! Local AI through Ollama. Semantic search: sources are split into paragraph-aligned
//! chunks, embedded by a local model in a background worker, and stored int8-quantised in
//! a sqlite-vec table kept separate from the qualitative data. The assistant: a local chat
//! model drafts summaries and sub-code suggestions from the project's own text.

pub mod assist;
pub mod chat;
pub mod chunk;
pub mod config;
pub mod ollama;
pub mod suggest;
pub mod vectors;
pub mod worker;

#[cfg(test)]
mod assist_tests;
