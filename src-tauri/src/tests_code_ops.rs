//! Merging codes and recoding passages against a real SQLite file.

use rusqlite::Connection;

use crate::db::code_ops::{merge, recode};
use crate::db::memos::{self, NewMemo};
use crate::db::nodes::{self, NewNode};
use crate::db::sources::{self, NewSource};
use crate::db::{self, projects, references};

struct Fixture {
    conn: Connection,
    project: i64,
    source: i64,
    a: i64,
    b: i64,
    child: i64,
}

fn fixture(name: &str) -> Fixture {
    let dir = std::env::temp_dir().join(format!("siftqda-codeops-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Codes", "").unwrap().id;
    let content = "abcdefghij".repeat(3);
    let metadata = serde_json::json!({});
    let source = NewSource {
        project_id: project,
        guid: None,
        name: "Interview",
        kind: "text",
        file_path: None,
        content: &content,
        metadata: &metadata,
    };
    let source = sources::insert(&conn, &source).unwrap();
    let node = |name: &str, parent: Option<i64>| {
        let n = NewNode {
            project_id: project,
            guid: None,
            parent_id: parent,
            name,
            color: "#3987e5",
            description: "",
        };
        nodes::create(&conn, &n).unwrap()
    };
    let (a, b) = (node("A", None), node("B", None));
    let child = node("A1", Some(a));
    Fixture {
        conn,
        project,
        source,
        a,
        b,
        child,
    }
}

#[test]
fn merge_moves_passages_subcodes_and_memos() {
    let f = fixture("merge");
    references::insert(&f.conn, f.source, f.a, 0, 5, None).unwrap();
    references::insert(&f.conn, f.source, f.a, 10, 15, None).unwrap();
    references::insert(&f.conn, f.source, f.b, 0, 5, None).unwrap();
    let memo = NewMemo {
        project_id: f.project,
        guid: None,
        source_id: None,
        node_id: Some(f.a),
        title: "On A",
        body: "",
    };
    memos::create(&f.conn, &memo).unwrap();

    assert_eq!(
        merge(&f.conn, f.a, f.b).unwrap(),
        1,
        "the shared passage is not duplicated"
    );
    let spans: Vec<_> = references::for_node(&f.conn, f.b)
        .unwrap()
        .iter()
        .map(|r| (r.reference.start_index, r.reference.end_index))
        .collect();
    assert_eq!(spans, [(0, 5), (10, 15)]);
    assert_eq!(nodes::get(&f.conn, f.child).unwrap().parent_id, Some(f.b));
    assert_eq!(
        memos::list(&f.conn, f.project).unwrap()[0].node_id,
        Some(f.b)
    );
    assert!(nodes::get(&f.conn, f.a).is_err());
}

#[test]
fn merge_refuses_itself_and_its_subcodes() {
    let f = fixture("refuse");
    assert!(merge(&f.conn, f.a, f.a).is_err());
    assert!(merge(&f.conn, f.a, f.child).is_err());
    assert!(nodes::get(&f.conn, f.a).is_ok());
}

#[test]
fn recode_moves_or_drops_a_duplicate() {
    let f = fixture("recode");
    let shared = references::insert(&f.conn, f.source, f.a, 0, 5, None).unwrap();
    let single = references::insert(&f.conn, f.source, f.a, 10, 15, None).unwrap();
    references::insert(&f.conn, f.source, f.b, 0, 5, None).unwrap();

    assert!(
        !recode(&f.conn, single.id, f.a).unwrap(),
        "same code is a no-op"
    );
    assert!(!recode(&f.conn, single.id, f.b).unwrap());
    assert!(
        recode(&f.conn, shared.id, f.b).unwrap(),
        "already coded at B"
    );
    assert!(references::for_node(&f.conn, f.a).unwrap().is_empty());
    assert_eq!(references::for_node(&f.conn, f.b).unwrap().len(), 2);
}
