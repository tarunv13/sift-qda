//! Transcribing audio with the user's local transcriber and importing the result.

use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::ai::worker;
use crate::error::{AppError, AppResult};
use crate::import;
use crate::state::AppState;
use crate::transcribe::config::{self, TranscriberStatus};
use crate::transcribe::progress::Progress;
use crate::transcribe::runner::{self, Options};
use crate::transcribe::{is_audio, markdown};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressEvent {
    job_id: String,
    progress: Progress,
}

#[tauri::command]
pub fn get_transcriber(state: State<'_, AppState>) -> AppResult<TranscriberStatus> {
    config::status(&state.conn())
}

#[tauri::command]
pub fn set_transcriber_folder(
    state: State<'_, AppState>,
    folder: String,
) -> AppResult<TranscriberStatus> {
    config::set_folder(&state.conn(), &folder)
}

/// Transcribes one audio file and imports the transcript as a source linked to the audio.
/// Progress arrives as `transcription-progress` events tagged with `job_id`.
#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    state: State<'_, AppState>,
    project_id: i64,
    path: String,
    job_id: String,
    options: Options,
) -> AppResult<i64> {
    let audio = PathBuf::from(&path);
    if !is_audio(&audio) {
        return Err(AppError::Invalid(
            "choose an audio file: wav, mp3, m4a, flac, ogg, opus, aac or wma".into(),
        ));
    }
    options.validate()?;
    let tool = config::tool(&state.conn())?;
    let out_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Transcribe(e.to_string()))?
        .join("transcripts")
        .join(&job_id);
    std::fs::create_dir_all(&out_dir)?;

    let events = app.clone();
    let mode = options.mode.clone();
    let job = job_id.clone();
    let transcript = tauri::async_runtime::spawn_blocking(move || {
        runner::run(&tool, &audio, &out_dir, &options, &job, |progress| {
            let _ = events.emit(
                "transcription-progress",
                ProgressEvent {
                    job_id: job.clone(),
                    progress,
                },
            );
        })
    })
    .await
    .map_err(|e| AppError::Transcribe(e.to_string()))??;

    let parsed = markdown::parse(&std::fs::read_to_string(&transcript)?, &mode)?;
    let name = import::display_name(Path::new(&path));
    let source_id = {
        let mut conn = state.conn();
        let tx = conn.transaction()?;
        let id = import::store(&tx, project_id, &name, &path, &parsed)?;
        tx.commit()?;
        id
    };
    worker::spawn(app, state.db_path.clone());
    Ok(source_id)
}

#[tauri::command]
pub fn cancel_transcription(job_id: String) -> bool {
    runner::cancel(&job_id)
}
