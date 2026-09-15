//! Annotations and see-also links against a real SQLite file.

use rusqlite::Connection;

use crate::db::sources::{self, NewSource};
use crate::db::{self, annotations, links, projects};

// "Café" before the passage makes byte and code-point offsets differ; "floods" is chars 18..24.
const A: &str = "Café owners said: floods took the boats.";
const B: &str = "Relief came late.";

fn setup(name: &str) -> (Connection, i64, i64) {
    let dir = std::env::temp_dir().join(format!("siftqda-notes-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Notes", "").unwrap().id;
    let metadata = serde_json::json!({});
    let add = |name: &str, content: &str| {
        let source = NewSource {
            project_id: project,
            guid: None,
            name,
            kind: "text",
            file_path: None,
            content,
            metadata: &metadata,
        };
        sources::insert(&conn, &source).unwrap()
    };
    let (a, b) = (add("A", A), add("B", B));
    (conn, a, b)
}

#[test]
fn annotations_quote_their_passage() {
    let (conn, a, _) = setup("annotations");
    let id = annotations::create(&conn, a, 18, 24, "  Key moment ").unwrap();
    let list = annotations::for_source(&conn, a).unwrap();
    assert_eq!(
        (list[0].text.as_str(), list[0].body.as_str()),
        ("floods", "Key moment")
    );

    annotations::update(&conn, id, "Revised").unwrap();
    assert_eq!(
        annotations::for_source(&conn, a).unwrap()[0].body,
        "Revised"
    );
    assert!(annotations::create(&conn, a, 5, 999, "outside").is_err());

    annotations::delete(&conn, id).unwrap();
    assert!(annotations::for_source(&conn, a).unwrap().is_empty());
}

#[test]
fn links_show_from_both_sides() {
    let (conn, a, b) = setup("links");
    let id = links::create(&conn, (a, 18, 24), (b, 0, 6)).unwrap();

    let from_a = links::for_source(&conn, a).unwrap();
    assert!(from_a[0].outgoing);
    assert_eq!(from_a[0].here_text, "floods");
    assert_eq!(
        (
            from_a[0].other_source_name.as_str(),
            from_a[0].there_text.as_str()
        ),
        ("B", "Relief")
    );

    let from_b = links::for_source(&conn, b).unwrap();
    assert!(!from_b[0].outgoing);
    assert_eq!(
        (from_b[0].here_text.as_str(), from_b[0].other_source_id),
        ("Relief", a)
    );

    links::create(&conn, (a, 0, 4), (a, 18, 24)).unwrap();
    assert_eq!(
        links::for_source(&conn, a).unwrap().len(),
        2,
        "a link within one source appears once"
    );
    assert!(links::create(&conn, (a, 0, 4), (a, 0, 4)).is_err());

    links::delete(&conn, id).unwrap();
    assert!(links::for_source(&conn, b).unwrap().is_empty());
}

#[test]
fn notes_go_when_their_source_is_deleted() {
    let (conn, a, b) = setup("cascade");
    annotations::create(&conn, b, 0, 6, "note").unwrap();
    links::create(&conn, (a, 18, 24), (b, 0, 6)).unwrap();

    sources::delete(&conn, b).unwrap();
    assert!(links::for_source(&conn, a).unwrap().is_empty());
    let left: i64 = conn
        .query_row("SELECT COUNT(*) FROM annotations", [], |r| r.get(0))
        .unwrap();
    assert_eq!(left, 0);
}
