//! The assistant's text gathering and answer cleaning; no model is needed.

use super::assist::{clip, gather, memo_body, memo_title, Target};
use super::suggest::{clean_name, parse as parse_suggestions};
use crate::db::nodes::{self, NewNode};
use crate::db::sources::{self, NewSource};
use crate::db::{self, projects, references};

#[test]
fn names_read_like_plain_language() {
    assert_eq!(clean_name("coping_strategies"), "Coping strategies");
    assert_eq!(clean_name("  “fear   of loss.” "), "Fear of loss");
    assert_eq!(clean_name("___"), "");
    assert_eq!(
        clean_name("Loss of Livelihood Source"),
        "Loss of livelihood source"
    );
    assert_eq!(clean_name("trust in NGOs"), "Trust in NGOs");
}

#[test]
fn suggestions_are_cleaned_and_deduplicated() {
    let answer = r#"{"codes":[
        {"name":"coping_strategies","description":" Ways people manage. "},
        {"name":"Coping strategies","description":"duplicate"},
        {"name":"family support","description":"already exists"},
        {"name":"","description":"empty"},
        {"name":"Rising Debt","description":"rising debt"}
    ]}"#;
    let existing = vec!["Family support".to_string()];
    let parsed = parse_suggestions(answer, &existing).unwrap();
    assert_eq!(parsed.len(), 2);
    assert_eq!(
        (parsed[1].name.as_str(), parsed[1].description.as_str()),
        ("Rising debt", "")
    );
    assert_eq!(
        (parsed[0].name.as_str(), parsed[0].description.as_str()),
        ("Coping strategies", "Ways people manage.")
    );
    assert!(parse_suggestions("not json", &[]).is_err());
}

#[test]
fn clipping_counts_characters() {
    assert_eq!(clip("café au lait", 4), ("café".to_string(), true));
    assert_eq!(clip("short", 10), ("short".to_string(), false));
    assert!(memo_body("Summary.", "llama3.2:3b", true).contains("first part of the material"));
    assert!(memo_body(
        "Here's a summary of the passages:\n\nPeople lost boats.",
        "m",
        false
    )
    .starts_with("People lost boats."));
}

#[test]
fn a_code_is_read_through_its_passages() {
    let dir = std::env::temp_dir().join(format!("siftqda-assist-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Assist", "").unwrap().id;
    let metadata = serde_json::json!({});
    let source = NewSource {
        project_id: project,
        guid: None,
        name: "Interview",
        kind: "text",
        file_path: None,
        content: "We lost the boats. Then we moved inland.",
        metadata: &metadata,
    };
    let source = sources::insert(&conn, &source).unwrap();
    let node = |name: &str| {
        let n = NewNode {
            project_id: project,
            guid: None,
            parent_id: None,
            name,
            color: "#3987e5",
            description: "",
        };
        nodes::create(&conn, &n).unwrap()
    };
    let (coded, empty) = (node("Loss"), node("Empty"));
    references::insert(&conn, source, coded, 0, 18, None).unwrap();

    let material = gather(&conn, &Target::Code { id: coded }).unwrap();
    assert_eq!(material.text, "[Interview] We lost the boats.");
    assert_eq!(
        (material.project_id, material.node_id),
        (project, Some(coded))
    );
    assert_eq!(memo_title(&material), "AI summary: code “Loss”");
    assert!(gather(&conn, &Target::Code { id: empty }).is_err());
}
