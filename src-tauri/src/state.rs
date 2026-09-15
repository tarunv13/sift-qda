use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

/// Shared application state. Background workers open their own connection to `db_path`.
pub struct AppState {
    pub db: Mutex<Connection>,
    pub db_path: PathBuf,
}

impl AppState {
    pub fn conn(&self) -> MutexGuard<'_, Connection> {
        // A panic in another command must not brick the database handle.
        self.db
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}
