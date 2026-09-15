use serde::{Serialize, Serializer};

/// Every command returns this error; it serialises to a plain message for the UI.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("database: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("file: {0}")]
    Io(#[from] std::io::Error),
    #[error("word document: {0}")]
    Office(String),
    #[error("spreadsheet: {0}")]
    Sheet(String),
    #[error("pdf: {0}")]
    Pdf(String),
    #[error("REFI-QDA: {0}")]
    Refi(String),
    #[error("embedding: {0}")]
    Embed(String),
    #[error("local AI: {0}")]
    Ai(String),
    #[error("{0}")]
    Invalid(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
