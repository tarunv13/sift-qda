//! Blocking client for Ollama's `/api/chat`, used for summaries and code suggestions.

use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::config::EmbeddingConfig;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
struct Message<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Serialize)]
struct Options {
    /// Low temperature keeps summaries close to the text.
    temperature: f32,
    /// Room for the clipped material plus the answer.
    num_ctx: u32,
}

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'a str,
    messages: [Message<'a>; 2],
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<&'a Value>,
    options: Options,
}

#[derive(Deserialize)]
struct ChatResponse {
    message: Reply,
}

#[derive(Deserialize)]
struct Reply {
    content: String,
}

pub struct Chat {
    agent: ureq::Agent,
    url: String,
    model: String,
}

impl Chat {
    pub fn new(config: &EmbeddingConfig) -> Self {
        // A small model on a laptop CPU can take minutes on a long transcript.
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .timeout_global(Some(Duration::from_secs(600)))
            .build()
            .into();
        Self {
            agent,
            url: config.url.clone(),
            model: config.chat_model.clone(),
        }
    }

    /// Sends one system and one user message; `format` is an optional JSON schema for the reply.
    pub fn ask(&self, system: &str, user: &str, format: Option<&Value>) -> AppResult<String> {
        let body = ChatRequest {
            model: &self.model,
            messages: [
                Message {
                    role: "system",
                    content: system,
                },
                Message {
                    role: "user",
                    content: user,
                },
            ],
            stream: false,
            format,
            options: Options {
                temperature: 0.2,
                num_ctx: 8192,
            },
        };
        let mut response = self
            .agent
            .post(&format!("{}/api/chat", self.url))
            .send_json(&body)
            .map_err(|e| self.describe(e))?;
        let parsed: ChatResponse = response
            .body_mut()
            .read_json()
            .map_err(|e| AppError::Ai(format!("unexpected response from Ollama: {e}")))?;
        let answer = parsed.message.content.trim().to_string();
        if answer.is_empty() {
            return Err(AppError::Ai("the model returned an empty answer".into()));
        }
        Ok(answer)
    }

    fn describe(&self, error: ureq::Error) -> AppError {
        AppError::Ai(match error {
            ureq::Error::StatusCode(404) => format!(
                "model '{0}' is not installed; run `ollama pull {0}`",
                self.model
            ),
            ureq::Error::StatusCode(code) => format!("Ollama answered with HTTP {code}"),
            other => format!(
                "Ollama is not reachable at {} ({other}). Install it from ollama.com and keep it running",
                self.url
            ),
        })
    }
}
