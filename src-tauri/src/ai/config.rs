use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

pub const DEFAULT_URL: &str = "http://127.0.0.1:11434";
pub const DEFAULT_MODEL: &str = "nomic-embed-text";

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingConfig {
    pub url: String,
    pub model: String,
}

fn get(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    Ok(conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [key], |r| {
            r.get(0)
        })
        .optional()?)
}

fn set(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn load(conn: &Connection) -> AppResult<EmbeddingConfig> {
    Ok(EmbeddingConfig {
        url: get(conn, "embedding.url")?.unwrap_or_else(|| DEFAULT_URL.into()),
        model: get(conn, "embedding.model")?.unwrap_or_else(|| DEFAULT_MODEL.into()),
    })
}

pub fn save(conn: &Connection, config: &EmbeddingConfig) -> AppResult<()> {
    set(conn, "embedding.url", config.url.trim_end_matches('/'))?;
    set(conn, "embedding.model", config.model.trim())
}
