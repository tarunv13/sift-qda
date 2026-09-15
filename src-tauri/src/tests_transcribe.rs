//! Transcription plumbing that needs no transcriber: progress lines, transcript Markdown,
//! command-line arguments and the folder check. The sample transcript is made up.

use std::path::Path;

use crate::text::char_slice;
use crate::transcribe::config::{locate, Tool};
use crate::transcribe::is_audio;
use crate::transcribe::markdown::{parse, segments};
use crate::transcribe::progress::parse as progress;
use crate::transcribe::runner::{args, Options};

const SAMPLE: &str = "# Interview - Transcript (English)

| Field | Value |
|---|---|
| Duration | 00:01:10 |

> Transcribed automatically. Check names and terms before quoting.

**[00:00:00] Speaker 1:** How did the flood change things?

**[00:00:04] Speaker 2:** We lost the boats.
Most of the nets too.

**[00:01:02]** Rain on the roof.
";

#[test]
fn progress_lines_are_recognised() {
    let p = progress("  41.8%  00:00:10 / 00:00:26  remaining ~00:01:09").unwrap();
    assert_eq!(p.percent, 41.8);
    assert_eq!(
        (p.done.as_str(), p.total.as_str()),
        ("00:00:10", "00:00:26")
    );
    assert_eq!(p.remaining.as_deref(), Some("00:01:09"));
    assert_eq!(
        progress("100.0%  00:00:26 / 00:00:26").unwrap().remaining,
        None
    );
    assert!(progress("Loading model...").is_none());
    assert!(progress("50% done").is_none());
}

#[test]
fn transcript_markdown_becomes_timed_paragraphs() {
    let found = segments(SAMPLE);
    assert_eq!(found.len(), 3);
    assert_eq!(found[1].seconds, 4);
    assert_eq!(found[1].speaker.as_deref(), Some("Speaker 2"));
    assert_eq!(found[1].text, "We lost the boats. Most of the nets too.");
    assert_eq!((found[2].seconds, found[2].speaker.as_deref()), (62, None));

    let parsed = parse(SAMPLE, "en").unwrap();
    assert_eq!(
        parsed.content,
        "Speaker 1: How did the flood change things?\nSpeaker 2: We lost the boats. Most of the nets too.\nRain on the roof."
    );
    let starts = parsed.metadata["transcript"]["starts"].as_array().unwrap();
    let (offset, seconds) = (
        starts[2][0].as_i64().unwrap(),
        starts[2][1].as_u64().unwrap(),
    );
    assert_eq!(seconds, 62);
    assert_eq!(char_slice(&parsed.content, offset, offset + 4), "Rain");
    assert!(parse("# Nothing here\n\n> no timestamps", "en").is_err());
}

#[test]
fn arguments_follow_the_options() {
    let tool = Tool {
        folder: "tool".into(),
        script: "tool/transcribe.py".into(),
        python: "tool/python".into(),
    };
    let options = Options {
        mode: "hi-en".into(),
        speakers: Some(3),
        speaker_names: Some(" Asha, Ravi ".into()),
        prompt: Some("embankment".into()),
    };
    let args: Vec<String> = args(&tool, Path::new("a.wav"), Path::new("out"), &options)
        .iter()
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    assert_eq!(
        args,
        [
            "tool/transcribe.py",
            "a.wav",
            "--mode",
            "hi-en",
            "--speakers",
            "--num-speakers",
            "3",
            "--speaker-names",
            "Asha, Ravi",
            "--prompt",
            "embankment",
            "--out",
            "out",
            "--force"
        ]
    );
    let unknown = Options {
        mode: "fr".into(),
        speakers: None,
        speaker_names: None,
        prompt: None,
    };
    assert!(unknown.validate().is_err());
}

#[test]
fn the_transcriber_folder_is_checked() {
    let dir = std::env::temp_dir().join(format!("siftqda-transcriber-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    assert!(locate(&dir).is_err());
    std::fs::write(dir.join("transcribe.py"), "").unwrap();
    assert!(
        locate(&dir).is_err(),
        "a script without its environment is not enough"
    );
    let python = if cfg!(windows) {
        dir.join(".venv").join("Scripts").join("python.exe")
    } else {
        dir.join(".venv").join("bin").join("python")
    };
    std::fs::create_dir_all(python.parent().unwrap()).unwrap();
    std::fs::write(&python, "").unwrap();
    assert!(locate(&dir).is_ok());
    assert!(is_audio(Path::new("interview.M4A")));
    assert!(
        !is_audio(Path::new("interview.mp4")),
        "video is not supported"
    );
}
