//! Coding queries against a real SQLite file.

use rusqlite::Connection;

use crate::analysis::query::{AttributeFilter, Operator, QuerySpec};
use crate::analysis::query_output::{run, save_as_code};
use crate::db::nodes::{self, NewNode};
use crate::db::sources::{self, NewSource};
use crate::db::{self, cases, projects, references};

struct Fixture {
    conn: Connection,
    project: i64,
    a: i64,
    b: i64,
    village: i64,
}

fn fixture(name: &str) -> Fixture {
    let dir = std::env::temp_dir().join(format!("siftqda-query-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Query", "").unwrap().id;
    let content = "abcdefghij".repeat(12);
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
    for (code, start, end) in [
        (a, 10, 30),
        (a, 50, 60),
        (b, 20, 40),
        (b, 90, 100),
        (child, 70, 80),
    ] {
        references::insert(&conn, source, code, start, end, None).unwrap();
    }
    let village = cases::ensure_attribute(&conn, project, "Village", "Text", None).unwrap();
    let case = cases::create_case(&conn, project, Some(source), "P1", None).unwrap();
    cases::set_value(&conn, case, village, "North").unwrap();
    Fixture {
        conn,
        project,
        a,
        b,
        village,
    }
}

fn spans(
    f: &Fixture,
    operator: Operator,
    distance: i64,
    sub: bool,
    filter: Option<&str>,
) -> Vec<(i64, i64)> {
    let spec = QuerySpec {
        a: f.a,
        operator,
        b: Some(f.b),
        distance,
        include_sub_codes: sub,
        filter: filter.map(|value| AttributeFilter {
            attribute_id: f.village,
            value: value.into(),
        }),
    };
    run(&f.conn, f.project, &spec)
        .unwrap()
        .hits
        .iter()
        .map(|h| (h.start, h.end))
        .collect()
}

#[test]
fn combines_codes() {
    let f = fixture("ops");
    assert_eq!(spans(&f, Operator::And, 0, false, None), vec![(20, 30)]);
    assert_eq!(
        spans(&f, Operator::Or, 0, false, None),
        vec![(10, 40), (50, 60), (90, 100)]
    );
    assert_eq!(
        spans(&f, Operator::Not, 0, false, None),
        vec![(10, 20), (50, 60)]
    );
    assert_eq!(spans(&f, Operator::Near, 15, false, None), vec![(10, 60)]);
    assert_eq!(
        spans(&f, Operator::Only, 0, true, None),
        vec![(10, 30), (50, 60), (70, 80)]
    );
}

#[test]
fn attribute_filter_limits_sources() {
    let f = fixture("filter");
    assert_eq!(
        spans(&f, Operator::And, 0, false, Some(" north ")),
        vec![(20, 30)]
    );
    assert!(spans(&f, Operator::And, 0, false, Some("South")).is_empty());
}

#[test]
fn results_can_be_saved_as_a_code() {
    let f = fixture("save");
    let spec = QuerySpec {
        a: f.a,
        operator: Operator::Or,
        b: Some(f.b),
        distance: 0,
        include_sub_codes: false,
        filter: None,
    };
    let hits = run(&f.conn, f.project, &spec).unwrap();
    assert_eq!(hits.sources, 1);
    assert_eq!(hits.hits[0].text, "abcdefghijabcdefghijabcdefghij");

    let code = save_as_code(&f.conn, f.project, &spec, "A or B", "#d95926").unwrap();
    let saved = references::for_node(&f.conn, code).unwrap();
    assert_eq!(saved.len(), 3);

    let none = QuerySpec {
        a: f.a,
        operator: Operator::And,
        b: Some(f.b),
        distance: 0,
        include_sub_codes: false,
        filter: Some(AttributeFilter {
            attribute_id: f.village,
            value: "South".into(),
        }),
    };
    assert!(save_as_code(&f.conn, f.project, &none, "Nothing", "#d95926").is_err());
}
