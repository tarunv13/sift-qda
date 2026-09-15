//! Word frequency and keyword in context against a real SQLite file.

use std::collections::HashSet;

use rusqlite::Connection;

use crate::analysis::kwic;
use crate::analysis::scope::{spans, Scope};
use crate::analysis::stopwords;
use crate::analysis::words::{frequency, speaker_label_len, Filter};
use crate::db::nodes::{self, NewNode};
use crate::db::sources::{self, NewSource};
use crate::db::{self, projects, references};
use crate::text::char_slice;

// Accented letters and dashes before the matches make byte and code-point offsets differ.
const TEXT: &str = "Interviewer: How do the floods affect you?\n\
P01: Floods took our boats. Café owners — and fishers — lose income when floods come.\n\
P02: बाढ़ से हमारा घर टूट गया";

struct Fixture {
    conn: Connection,
    project: i64,
    source: i64,
}

fn fixture(name: &str) -> Fixture {
    let dir = std::env::temp_dir().join(format!("siftqda-analysis-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Analysis", "").unwrap().id;
    let metadata = serde_json::json!({});
    let source = sources::insert(
        &conn,
        &NewSource {
            project_id: project,
            guid: None,
            name: "Interview",
            kind: "text",
            file_path: None,
            content: TEXT,
            metadata: &metadata,
        },
    )
    .unwrap();
    Fixture {
        conn,
        project,
        source,
    }
}

fn count_of(words: &[crate::analysis::words::WordCount], word: &str) -> Option<i64> {
    words.iter().find(|w| w.word == word).map(|w| w.count)
}

#[test]
fn speaker_labels_are_recognised() {
    assert_eq!(speaker_label_len("P01: hello"), 4);
    assert_eq!(speaker_label_len("Speaker 2: yes"), 10);
    assert_eq!(speaker_label_len("We met at the harbour at 10:30"), 0);
    assert_eq!(speaker_label_len("no label here"), 0);
}

#[test]
fn counts_words_without_speakers_or_stop_words() {
    let f = fixture("count");
    let text = spans(&f.conn, f.project, Scope::Project).unwrap();
    let stop = stopwords::set("en", &[]);
    let filter = Filter {
        min_length: 3,
        stop_words: &stop,
        skip_speakers: true,
    };
    let result = frequency(&text, &filter, 100);

    assert_eq!(count_of(&result.words, "floods"), Some(3));
    assert_eq!(result.words[0].word, "floods");
    assert_eq!(result.words[0].sources, 1);
    assert_eq!(count_of(&result.words, "interviewer"), None);
    assert_eq!(count_of(&result.words, "the"), None);

    let keep_speakers = Filter {
        min_length: 3,
        stop_words: &stop,
        skip_speakers: false,
    };
    assert_eq!(
        count_of(&frequency(&text, &keep_speakers, 100).words, "interviewer"),
        Some(1)
    );
}

#[test]
fn hindi_words_are_counted() {
    let f = fixture("hindi");
    let text = spans(&f.conn, f.project, Scope::Source { id: f.source }).unwrap();
    let none = HashSet::new();
    let filter = Filter {
        min_length: 1,
        stop_words: &none,
        skip_speakers: true,
    };
    let result = frequency(&text, &filter, 100);
    assert_eq!(count_of(&result.words, "घर"), Some(1));
    assert_eq!(count_of(&result.words, "बाढ़"), Some(1));
}

#[test]
fn keyword_offsets_point_at_the_word() {
    let f = fixture("kwic");
    let text = spans(&f.conn, f.project, Scope::Project).unwrap();
    let none = HashSet::new();
    let filter = Filter {
        min_length: 1,
        stop_words: &none,
        skip_speakers: true,
    };
    let hits = kwic::contexts(&text, "FLOODS", &filter, 10);

    assert_eq!(hits.len(), 3);
    for hit in &hits {
        assert_eq!(
            char_slice(TEXT, hit.start, hit.end).to_lowercase(),
            "floods"
        );
        assert!(!hit.before.contains('\n') && !hit.after.contains('\n'));
    }
    assert_eq!(hits[1].matched, "Floods");
}

#[test]
fn code_scope_reads_overlapping_passages_once() {
    let f = fixture("code");
    let node = nodes::create(
        &f.conn,
        &NewNode {
            project_id: f.project,
            guid: None,
            parent_id: None,
            name: "Loss",
            color: "#e2a336",
            description: "",
        },
    )
    .unwrap();
    let at = |phrase: &str| TEXT[..TEXT.find(phrase).unwrap()].chars().count() as i64;
    let start = at("Floods took");
    references::insert(&f.conn, f.source, node, start, at("owners"), None).unwrap();
    references::insert(
        &f.conn,
        f.source,
        node,
        at("took our"),
        at(" and fishers"),
        None,
    )
    .unwrap();

    let text = spans(&f.conn, f.project, Scope::Code { id: node }).unwrap();
    assert_eq!(text.len(), 1, "overlapping passages merge into one");
    assert_eq!(text[0].offset, start);

    let none = HashSet::new();
    let filter = Filter {
        min_length: 1,
        stop_words: &none,
        skip_speakers: false,
    };
    assert_eq!(
        count_of(&frequency(&text, &filter, 100).words, "boats"),
        Some(1)
    );
    let hit = &kwic::contexts(&text, "café", &filter, 10)[0];
    assert_eq!(char_slice(TEXT, hit.start, hit.end), "Café");
}
