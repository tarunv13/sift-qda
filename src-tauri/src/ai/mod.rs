//! Local semantic search: sources are split into paragraph-aligned chunks, embedded
//! by a local Ollama model in a background worker, and stored int8-quantised in a
//! sqlite-vec table that is kept separate from the qualitative data.

pub mod chunk;
pub mod config;
pub mod ollama;
pub mod vectors;
pub mod worker;
