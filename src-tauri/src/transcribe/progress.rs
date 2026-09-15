//! Progress lines printed by the transcriber, such as
//! `  41.8%  00:00:10 / 00:00:26  remaining ~00:01:09`.

use serde::Serialize;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    pub percent: f32,
    /// Audio transcribed so far, as `hh:mm:ss`.
    pub done: String,
    /// Length of the audio, as `hh:mm:ss`.
    pub total: String,
    /// Estimated time left, when the transcriber reports it.
    pub remaining: Option<String>,
}

fn is_clock(s: &str) -> bool {
    s.contains(':') && s.chars().all(|c| c.is_ascii_digit() || c == ':')
}

/// Parses one progress line; any other output returns `None`.
pub fn parse(line: &str) -> Option<Progress> {
    let (percent, rest) = line.trim().split_once('%')?;
    let percent: f32 = percent.trim().parse().ok()?;
    let mut words = rest.split_whitespace();
    let done = words.next().filter(|w| is_clock(w))?;
    if words.next()? != "/" {
        return None;
    }
    let total = words.next().filter(|w| is_clock(w))?;
    let remaining = match (words.next(), words.next()) {
        (Some("remaining"), Some(time)) => {
            Some(time.trim_start_matches('~').to_string()).filter(|t| is_clock(t))
        }
        _ => None,
    };
    Some(Progress {
        percent: percent.clamp(0.0, 100.0),
        done: done.to_string(),
        total: total.to_string(),
        remaining,
    })
}
