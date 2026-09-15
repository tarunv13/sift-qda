//! End-to-end checks of the storage, REFI-QDA and vector layers against a real SQLite file.

use std::path::PathBuf;

use rusqlite::Connection;

use crate::ai::{chunk, vectors};
use crate::db::nodes::{self, NewNode};
use crate::db::sources::{self, NewSource};
use crate::db::{self, projects, references};
use crate::refi;

fn temp_db(name: &str) -> (Connection, PathBuf) {
    let dir = std::env::temp_dir().join(format!("siftqda-test-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    (db::open(&dir.join("test.db")).unwrap(), dir)
}

fn add_source(conn: &Connection, project_id: i64, content: &str) -> i64 {
    let metadata = serde_json::json!({});
    sources::insert(
        conn,
        &NewSource {
            project_id,
            guid: None,
            name: "Interview 1",
            kind: "text",
            file_path: None,
            content,
            metadata: &metadata,
        },
    )
    .unwrap()
}

fn add_node(conn: &Connection, project_id: i64, parent_id: Option<i64>, name: &str) -> i64 {
    nodes::create(
        conn,
        &NewNode {
            project_id,
            guid: None,
            parent_id,
            name,
            color: "#e2a336",
            description: "",
        },
    )
    .unwrap()
}

#[test]
fn coding_survives_refi_round_trip() {
    let (conn, dir) = temp_db("refi");
    let project = projects::create(&conn, "Round trip", "A test project").unwrap();
    // Non-ASCII before the coded span makes byte and code-point offsets differ.
    let content = "Interviewer: How do you feel?\nParticipant: Honestly — ça va, but the heat waves make me anxious.";
    let source_id = add_source(&conn, project.id, content);
    let emotions = add_node(&conn, project.id, None, "Emotions");
    let anxiety = add_node(&conn, project.id, Some(emotions), "Climate anxiety");

    let byte_start = content.find("the heat").unwrap();
    let start = content[..byte_start].chars().count() as i64;
    references::insert(&conn, source_id, anxiety, start, start + 26, None).unwrap();
    references::insert(&conn, source_id, emotions, start + 9, start + 31, None).unwrap(); // overlaps, ends at text end
    references::insert(&conn, source_id, anxiety, start, start + 26, None).unwrap(); // duplicate is a no-op
    assert!(references::insert(&conn, source_id, anxiety, 0, 9_999, None).is_err());

    let quoted = references::for_node(&conn, anxiety).unwrap();
    assert_eq!(quoted.len(), 1);
    assert_eq!(quoted[0].text, "the heat waves make me anx");

    let qdpx = dir.join("project.qdpx");
    refi::export::export(&conn, project.id, &qdpx).unwrap();
    let summary = refi::import::import(&conn, &qdpx).unwrap();
    assert_eq!(
        (
            summary.sources,
            summary.codes,
            summary.references,
            summary.skipped
        ),
        (1, 2, 2, 0)
    );

    let imported = nodes::list(&conn, summary.project_id).unwrap();
    let child = imported
        .iter()
        .find(|n| n.name == "Climate anxiety")
        .unwrap();
    let parent = imported.iter().find(|n| n.name == "Emotions").unwrap();
    assert_eq!(child.parent_id, Some(parent.id));
    assert_eq!(
        references::for_node(&conn, child.id).unwrap()[0].text,
        quoted[0].text
    );
}

#[test]
fn excel_export_lists_extracts_by_theme() {
    use calamine::{open_workbook_auto, Reader};

    let (conn, dir) = temp_db("excel");
    let project = projects::create(&conn, "Excel", "").unwrap();
    let content = "Intro line\nParticipant: the heat waves make me anxious.";
    let source_id = add_source(&conn, project.id, content);
    let emotions = add_node(&conn, project.id, None, "Emotions");
    let anxiety = add_node(&conn, project.id, Some(emotions), "Climate anxiety");
    let start = content.find("the heat").unwrap() as i64; // ASCII, so bytes == chars
    references::insert(&conn, source_id, anxiety, start, start + 26, None).unwrap();
    references::insert(&conn, source_id, emotions, 0, 10, None).unwrap();

    let path = dir.join("export.xlsx");
    crate::excel::export(&conn, project.id, &path).unwrap();

    let mut book = open_workbook_auto(&path).unwrap();
    assert_eq!(
        book.sheet_names(),
        [
            "Coded extracts",
            "Codebook",
            "Codes by document",
            "Documents",
            "Memos"
        ]
    );
    let grid = |book: &mut calamine::Sheets<_>, name: &str| -> Vec<Vec<String>> {
        let range = book.worksheet_range(name).unwrap();
        range
            .rows()
            .map(|r| r.iter().map(|c| c.to_string()).collect())
            .collect()
    };

    let extracts = grid(&mut book, "Coded extracts");
    assert_eq!(
        extracts[0][..6],
        ["Theme", "Code", "Code path", "Document", "Page", "Extract"]
    );
    assert_eq!(extracts.len(), 3);
    // Parent theme sorts before its child code.
    assert_eq!(extracts[1][..3], ["Emotions", "Emotions", "Emotions"]);
    assert_eq!(
        extracts[2][..3],
        ["Emotions", "Climate anxiety", "Emotions › Climate anxiety"]
    );
    assert_eq!(extracts[2][5], "the heat waves make me anx");

    let matrix = grid(&mut book, "Codes by document");
    assert_eq!(matrix[0], ["Code", "Interview 1", "Total"]);
    assert_eq!(matrix[2], ["Emotions › Climate anxiety", "1", "1"]);
}

#[test]
fn vector_index_finds_nearest_chunk_within_project() {
    let (conn, _dir) = temp_db("vec");
    vectors::ensure_table(&conn).unwrap();
    let project = projects::create(&conn, "Vectors", "").unwrap();
    let content = "First paragraph.\nSecond paragraph.\nThird paragraph.";
    let source_id = add_source(&conn, project.id, content);
    assert_eq!(chunk::store(&conn, source_id, content).unwrap(), 1);

    let axis = |i: usize| {
        let mut v = vec![0.0f32; vectors::DIMENSIONS];
        v[i] = 1.0;
        v
    };
    let mut ids = Vec::new();
    for i in 0..3 {
        conn.execute(
            "INSERT INTO chunks (source_id, start_offset, end_offset) VALUES (?1, 0, 5)",
            [source_id],
        )
        .unwrap();
        let id = conn.last_insert_rowid();
        vectors::insert(&conn, id, project.id, &axis(i)).unwrap();
        ids.push(id);
    }
    vectors::insert(&conn, ids[1], project.id, &axis(1)).unwrap(); // re-embedding replaces

    let hits = vectors::knn(&conn, project.id, &axis(1), 2).unwrap();
    assert_eq!(hits.len(), 2);
    assert_eq!(hits[0].0, ids[1]);
    assert!(hits[0].1 < 0.01, "distance was {}", hits[0].1);
    assert!(vectors::knn(&conn, project.id + 1, &axis(1), 2)
        .unwrap()
        .is_empty());

    vectors::delete_for_source(&conn, source_id).unwrap();
    assert!(vectors::knn(&conn, project.id, &axis(1), 2)
        .unwrap()
        .is_empty());
}
