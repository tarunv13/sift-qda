//! Editing cases, attributes and case memos against a real SQLite file.

use rusqlite::Connection;

use crate::db::case_edit::{self as edit};
use crate::db::memos::{self, NewMemo};
use crate::db::sources::{self, NewSource};
use crate::db::{self, cases, projects};

fn setup(name: &str) -> (Connection, i64, i64, i64) {
    let dir = std::env::temp_dir().join(format!("siftqda-cases-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Cases", "").unwrap().id;
    let metadata = serde_json::json!({});
    let add = |name: &str| {
        let source = NewSource {
            project_id: project,
            guid: None,
            name,
            kind: "text",
            file_path: None,
            content: "Some text.",
            metadata: &metadata,
        };
        sources::insert(&conn, &source).unwrap()
    };
    let (b, a) = (add("Interview B"), add("Interview A"));
    (conn, project, a, b)
}

#[test]
fn a_case_per_source_skips_linked_sources() {
    let (conn, project, a, _) = setup("per-source");
    edit::create_case(&conn, project, "Already here", Some(a)).unwrap();
    assert_eq!(edit::cases_for_sources(&conn, project).unwrap(), 1);
    assert_eq!(edit::cases_for_sources(&conn, project).unwrap(), 0);
    let names: Vec<_> = cases::table(&conn, project)
        .unwrap()
        .cases
        .into_iter()
        .map(|c| c.name)
        .collect();
    assert_eq!(names, ["Already here", "Interview B"]);
}

#[test]
fn cases_and_values_can_be_edited() {
    let (conn, project, _, _) = setup("edit");
    let case = edit::create_case(&conn, project, "P1", None).unwrap();
    let region = edit::create_attribute(&conn, project, "Region").unwrap();
    let age = edit::create_attribute(&conn, project, "Age").unwrap();
    assert!(
        edit::create_attribute(&conn, project, "region").is_err(),
        "names are unique"
    );
    assert!(edit::rename_attribute(&conn, age, "Region").is_err());
    assert!(edit::rename_case(&conn, case, "  ").is_err());

    edit::rename_case(&conn, case, "Participant 1").unwrap();
    edit::set_value(&conn, case, region, " North ").unwrap();
    let table = cases::table(&conn, project).unwrap();
    assert_eq!(
        (
            table.cases[0].name.as_str(),
            table.cases[0].values[0].as_str()
        ),
        ("Participant 1", "North")
    );

    edit::set_value(&conn, case, region, "").unwrap();
    edit::delete_attribute(&conn, age).unwrap();
    let table = cases::table(&conn, project).unwrap();
    assert_eq!(table.attributes.len(), 1);
    assert_eq!(table.cases[0].values, [""]);
}

#[test]
fn links_stay_inside_the_project() {
    let (conn, project, a, _) = setup("link");
    let other = projects::create(&conn, "Other", "").unwrap().id;
    let case = edit::create_case(&conn, other, "Elsewhere", None).unwrap();
    assert!(edit::link_source(&conn, case, Some(a)).is_err());
    let here = edit::create_case(&conn, project, "Here", None).unwrap();
    edit::link_source(&conn, here, Some(a)).unwrap();
    edit::link_source(&conn, here, None).unwrap();
    assert_eq!(
        cases::table(&conn, project).unwrap().cases[0].source_id,
        None
    );
}

#[test]
fn memos_can_belong_to_a_case() {
    let (conn, project, _, _) = setup("memo");
    let case = edit::create_case(&conn, project, "P1", None).unwrap();
    let memo = NewMemo {
        project_id: project,
        guid: None,
        source_id: None,
        node_id: None,
        title: "About P1",
        body: "",
    };
    let memo = memos::create(&conn, &memo).unwrap();
    memos::link_case(&conn, memo.id, Some(case)).unwrap();
    assert_eq!(memos::get(&conn, memo.id).unwrap().case_id, Some(case));

    edit::delete_case(&conn, case).unwrap();
    assert_eq!(
        memos::get(&conn, memo.id).unwrap().case_id,
        None,
        "the memo outlives its case"
    );
}
