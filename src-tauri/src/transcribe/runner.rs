//! Runs the transcriber as a child process, reports its progress, and supports cancelling.

use std::collections::{HashMap, HashSet};
use std::ffi::OsString;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc::{channel, Sender};
use std::sync::{LazyLock, Mutex};

use serde::Deserialize;

use super::config::Tool;
use super::progress::{self, Progress};
use crate::error::{AppError, AppResult};

const MODES: &[&str] = &["en", "hi", "hi-en", "hi-both"];
static RUNNING: LazyLock<Mutex<HashMap<String, u32>>> = LazyLock::new(Default::default);
static CANCELLED: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(Default::default);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Options {
    pub mode: String,
    /// Label speakers; `Some(n)` fixes how many there are.
    pub speakers: Option<u32>,
    pub speaker_names: Option<String>,
    /// Names and terms that help the model spell things right.
    pub prompt: Option<String>,
}

impl Options {
    pub fn validate(&self) -> AppResult<()> {
        if !MODES.contains(&self.mode.as_str()) {
            return Err(AppError::Invalid(format!(
                "unknown language mode “{}”",
                self.mode
            )));
        }
        Ok(())
    }
}

pub fn args(tool: &Tool, audio: &Path, out_dir: &Path, options: &Options) -> Vec<OsString> {
    let mut args: Vec<OsString> = vec![
        tool.script.clone().into(),
        audio.into(),
        "--mode".into(),
        options.mode.clone().into(),
    ];
    if let Some(count) = options.speakers {
        args.extend([
            "--speakers".into(),
            "--num-speakers".into(),
            count.to_string().into(),
        ]);
        if let Some(names) = options
            .speaker_names
            .as_deref()
            .map(str::trim)
            .filter(|n| !n.is_empty())
        {
            args.extend(["--speaker-names".into(), names.into()]);
        }
    }
    if let Some(prompt) = options
        .prompt
        .as_deref()
        .map(str::trim)
        .filter(|p| !p.is_empty())
    {
        args.extend(["--prompt".into(), prompt.into()]);
    }
    args.extend(["--out".into(), out_dir.into(), "--force".into()]);
    args
}

/// Forwards output split on carriage returns and newlines, so in-place progress lines arrive one by one.
fn pump(mut reader: impl Read + Send + 'static, lines: Sender<String>) {
    std::thread::spawn(move || {
        let mut buffer = [0u8; 4096];
        let mut pending = Vec::new();
        while let Ok(read) = reader.read(&mut buffer) {
            if read == 0 {
                break;
            }
            for &byte in &buffer[..read] {
                if byte == b'\r' || byte == b'\n' {
                    if !pending.is_empty() {
                        let _ = lines.send(String::from_utf8_lossy(&pending).into_owned());
                        pending.clear();
                    }
                } else {
                    pending.push(byte);
                }
            }
        }
        if !pending.is_empty() {
            let _ = lines.send(String::from_utf8_lossy(&pending).into_owned());
        }
    });
}

/// Transcribes `audio` into `out_dir` and returns the Markdown transcript's path.
pub fn run(
    tool: &Tool,
    audio: &Path,
    out_dir: &Path,
    options: &Options,
    job: &str,
    mut on_progress: impl FnMut(Progress),
) -> AppResult<PathBuf> {
    let mut command = Command::new(&tool.python);
    command
        .args(args(tool, audio, out_dir, options))
        .current_dir(&tool.folder)
        .env("PYTHONUNBUFFERED", "1")
        .env("PYTHONIOENCODING", "utf-8")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_window(&mut command);
    let mut child = command
        .spawn()
        .map_err(|e| AppError::Transcribe(format!("could not start the transcriber: {e}")))?;
    RUNNING.lock().unwrap().insert(job.to_string(), child.id());

    let (sender, lines) = channel();
    pump(child.stdout.take().expect("piped stdout"), sender.clone());
    pump(child.stderr.take().expect("piped stderr"), sender);
    let mut tail: Vec<String> = Vec::new();
    for line in lines {
        match progress::parse(&line) {
            Some(p) => on_progress(p),
            None if !line.trim().is_empty() => {
                tail.push(line);
                if tail.len() > 12 {
                    tail.remove(0);
                }
            }
            None => {}
        }
    }
    let status = child.wait()?;
    RUNNING.lock().unwrap().remove(job);
    if CANCELLED.lock().unwrap().remove(job) {
        return Err(AppError::Invalid("transcription cancelled".into()));
    }
    if !status.success() {
        return Err(AppError::Transcribe(format!(
            "the transcriber stopped with an error:\n{}",
            tail.join("\n")
        )));
    }
    transcript_in(out_dir)
}

/// The transcript Markdown in `out_dir`, preferring the English one when there are several.
fn transcript_in(out_dir: &Path) -> AppResult<PathBuf> {
    let mut found: Vec<PathBuf> = std::fs::read_dir(out_dir)?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|e| e.eq_ignore_ascii_case("md")))
        .collect();
    found.sort_by_key(|p| !p.to_string_lossy().contains("(English)"));
    found.into_iter().next().ok_or_else(|| {
        AppError::Transcribe(
            "the transcriber finished without writing a Markdown transcript".into(),
        )
    })
}

/// Stops a running job and the processes it started. Returns false when nothing was running.
pub fn cancel(job: &str) -> bool {
    let Some(pid) = RUNNING.lock().unwrap().get(job).copied() else {
        return false;
    };
    CANCELLED.lock().unwrap().insert(job.to_string());
    let mut kill = if cfg!(windows) {
        let mut c = Command::new("taskkill");
        c.args(["/PID", &pid.to_string(), "/T", "/F"]);
        c
    } else {
        let mut c = Command::new("kill");
        c.arg(pid.to_string());
        c
    };
    hide_window(&mut kill);
    kill.status().is_ok()
}

#[cfg(windows)]
fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_window(_: &mut Command) {}
