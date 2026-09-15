use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::config::EmbeddingConfig;
use super::vectors::DIMENSIONS;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
struct EmbedRequest<'a> {
    model: &'a str,
    input: Vec<String>,
    truncate: bool,
}

#[derive(Deserialize)]
struct EmbedResponse {
    embeddings: Vec<Vec<f32>>,
}

/// Blocking client for Ollama's `/api/embed`. nomic-embed-text expects task prefixes.
pub struct Embedder {
    agent: ureq::Agent,
    config: EmbeddingConfig,
}

impl Embedder {
    pub fn new(config: &EmbeddingConfig) -> Self {
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(120)))
            .build()
            .into();
        Self {
            agent,
            config: config.clone(),
        }
    }

    pub fn embed_documents(&self, texts: &[String]) -> AppResult<Vec<Vec<f32>>> {
        self.embed(
            texts
                .iter()
                .map(|t| format!("search_document: {t}"))
                .collect(),
        )
    }

    pub fn embed_query(&self, query: &str) -> AppResult<Vec<f32>> {
        self.embed(vec![format!("search_query: {query}")])?
            .pop()
            .ok_or_else(|| AppError::Embed("the model returned no embedding".into()))
    }

    fn embed(&self, input: Vec<String>) -> AppResult<Vec<Vec<f32>>> {
        let expected = input.len();
        let url = format!("{}/api/embed", self.config.url);
        let body = EmbedRequest {
            model: &self.config.model,
            input,
            truncate: true,
        };
        let mut response = self
            .agent
            .post(&url)
            .send_json(&body)
            .map_err(|e| self.describe(e))?;
        let parsed: EmbedResponse = response
            .body_mut()
            .read_json()
            .map_err(|e| AppError::Embed(format!("unexpected response from Ollama: {e}")))?;

        if parsed.embeddings.len() != expected {
            return Err(AppError::Embed(
                "Ollama returned the wrong number of embeddings".into(),
            ));
        }
        if let Some(v) = parsed.embeddings.iter().find(|v| v.len() != DIMENSIONS) {
            return Err(AppError::Embed(format!(
                "model '{}' produces {}-dimensional vectors; Sift QDA needs {DIMENSIONS} (nomic-embed-text)",
                self.config.model,
                v.len()
            )));
        }
        Ok(parsed.embeddings)
    }

    fn describe(&self, error: ureq::Error) -> AppError {
        AppError::Embed(match error {
            ureq::Error::StatusCode(404) => format!(
                "model '{0}' is not installed; run `ollama pull {0}`",
                self.config.model
            ),
            ureq::Error::StatusCode(code) => format!("Ollama answered with HTTP {code}"),
            other => format!(
                "Ollama is not reachable at {} ({other}). Install it from ollama.com and keep it running",
                self.config.url
            ),
        })
    }
}
