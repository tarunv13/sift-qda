//! Where the user's transcriber lives. The folder is chosen in the app and kept in the local
//! settings table only.

use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::Serialize;

use crate::db::settings;
use crate::error::{AppError, AppResult};

const FOLDER_KEY: &str = "transcriber.folder";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriberStatus {
    pub folder: Option<String>,
    pub ready: bool,
    pub problem: Option<String>,
}

/// The script and the Python interpreter that runs it.
pub struct Tool {
    pub folder: PathBuf,
    pub script: PathBuf,
    pub python: PathBuf,
}

pub fn locate(folder: &Path) -> Result<Tool, String> {
    let script = folder.join("transcribe.py");
    if !script.is_file() {
        return Err("This folder has no transcribe.py.".into());
    }
    let venv = folder.join(".venv");
    let python = if cfg!(windows) {
        venv.join("Scripts").join("python.exe")
    } else {
        venv.join("bin").join("python")
    };
    if !python.is_file() {
        return Err("No Python environment was found in .venv inside this folder.".into());
    }
    Ok(Tool {
        folder: folder.to_path_buf(),
        script,
        python,
    })
}

pub fn status(conn: &Connection) -> AppResult<TranscriberStatus> {
    let folder = settings::get(conn, FOLDER_KEY)?;
    let problem = match &folder {
        None => Some("Choose the folder that contains your transcriber.".to_string()),
        Some(path) => locate(Path::new(path)).err(),
    };
    Ok(TranscriberStatus {
        ready: problem.is_none(),
        folder,
        problem,
    })
}

pub fn set_folder(conn: &Connection, folder: &str) -> AppResult<TranscriberStatus> {
    locate(Path::new(folder)).map_err(AppError::Invalid)?;
    settings::set(conn, FOLDER_KEY, folder)?;
    status(conn)
}

pub fn tool(conn: &Connection) -> AppResult<Tool> {
    let folder = settings::get(conn, FOLDER_KEY)?.ok_or_else(|| {
        AppError::Invalid("choose the folder that contains your transcriber first".into())
    })?;
    locate(Path::new(&folder)).map_err(AppError::Invalid)
}
