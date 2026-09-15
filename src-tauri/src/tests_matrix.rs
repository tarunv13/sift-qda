//! Matrix coding against a real SQLite file: sources, rolled-up themes, attribute columns,
//! cell passages and the Excel export.

use rusqlite::Connection;

use crate::analysis::matrix::{build, CodingMatrix, Columns, MatrixSpec};
use crate::analysis::matrix_cells::passages;
use crate::db::nodes::{self, NewNode};
use crate::db::sources::{self, NewSource};
use crate::db::{self, cases, projects, references};
use crate::text::char_slice;

const ONE: &str = "Heat keeps me awake. I worry about the children. Floods scare everyone.";
const TWO: &str = "We might move inland. I worry about money.";

struct Fixture {
    conn: Connection,
    dir: std::path::PathBuf,
    project: i64,
    s1: i64,
    s2: i64,
    emotions: i64,
    worry: i64,
}

impl Fixture {
    fn matrix(&self, themes_only: bool, columns: Columns) -> CodingMatrix {
        let spec = MatrixSpec {
            themes_only,
            columns,
        };
        build(&self.conn, self.project, &spec).unwrap()
    }
}

fn labels<'a>(items: impl Iterator<Item = &'a str>) -> Vec<&'a str> {
    items.collect()
}

fn span(text: &str, phrase: &str) -> (i64, i64) {
    let start = text[..text.find(phrase).unwrap()].chars().count() as i64;
    (start, start + phrase.chars().count() as i64)
}

fn fixture(name: &str) -> Fixture {
    let dir = std::env::temp_dir().join(format!("siftqda-matrix-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let conn = db::open(&dir.join("test.db")).unwrap();
    let project = projects::create(&conn, "Matrix", "").unwrap().id;
    let metadata = serde_json::json!({});
    let source = |name: &str, content: &str| {
        let s = NewSource {
            project_id: project,
            guid: None,
            name,
            kind: "text",
            file_path: None,
            content,
            metadata: &metadata,
        };
        sources::insert(&conn, &s).unwrap()
    };
    let (s1, s2) = (source("Interview 1", ONE), source("Interview 2", TWO));
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
    let emotions = node("Emotions", None);
    let worry = node("Worry", Some(emotions));

    let code = |source: i64, text: &str, phrase: &str, node: i64| {
        let (start, end) = span(text, phrase);
        references::insert(&conn, source, node, start, end, None).unwrap();
    };
    code(s1, ONE, "I worry about the children.", worry);
    code(s1, ONE, "Floods scare everyone.", worry);
    code(s1, ONE, "I worry about the children.", emotions); // same passage at the parent
    code(s2, TWO, "I worry about money.", worry);

    let village = cases::ensure_attribute(&conn, project, "Village", "Text", None).unwrap();
    for (case_name, src, value) in [
        ("P1", Some(s1), "North"),
        ("P2", Some(s2), "North"),
        ("P3", None, "South"),
    ] {
        let case = cases::create_case(&conn, project, src, case_name, None).unwrap();
        cases::set_value(&conn, case, village, value).unwrap();
    }
    Fixture {
        conn,
        dir,
        project,
        s1,
        s2,
        emotions,
        worry,
    }
}

#[test]
fn counts_every_code_by_source() {
    let f = fixture("sources");
    let m = f.matrix(false, Columns::Sources);
    let rows = labels(m.rows.iter().map(|r| r.label.as_str()));
    assert_eq!(rows, ["Emotions", "Emotions › Worry"]);
    let columns = labels(m.columns.iter().map(|c| c.label.as_str()));
    assert_eq!(columns, ["Interview 1", "Interview 2"]);
    assert_eq!(m.cells, vec![vec![1, 0], vec![2, 1]]);
    // A passage coded at both parent and child counts once in the column total.
    assert_eq!((m.rows[1].total, m.columns[0].total), (3, 2));
}

#[test]
fn themes_roll_up_sub_codes_without_double_counting() {
    let f = fixture("themes");
    let m = f.matrix(true, Columns::Sources);
    assert_eq!(m.rows.len(), 1);
    assert_eq!(m.cells, vec![vec![2, 1]]);
    assert_eq!(m.rows[0].total, 3);
}

#[test]
fn attribute_columns_group_linked_cases() {
    let f = fixture("attribute");
    let attribute = cases::table(&f.conn, f.project).unwrap().attributes[0].id;
    let m = f.matrix(false, Columns::Attribute { id: attribute });
    assert_eq!(m.columns.len(), 1, "South has only an unlinked case");
    assert_eq!(m.columns[0].label, "North");
    assert_eq!(m.columns[0].source_ids, vec![f.s1, f.s2]);
    assert_eq!(m.unlinked_cases, 1);
    assert_eq!(m.cells[1], vec![3]);

    let by_case = f.matrix(false, Columns::Cases);
    assert_eq!(
        labels(by_case.columns.iter().map(|c| c.label.as_str())),
        ["P1", "P2"]
    );
}

#[test]
fn cell_passages_match_the_source_text() {
    let f = fixture("cells");
    let list = passages(&f.conn, f.project, f.emotions, true, &[f.s1, f.s2]).unwrap();
    assert_eq!(list.len(), 3, "the shared passage appears once");
    for p in &list {
        let content = if p.source_id == f.s1 { ONE } else { TWO };
        assert_eq!(char_slice(content, p.start, p.end), p.text);
    }
    let only_two = passages(&f.conn, f.project, f.worry, false, &[f.s2]).unwrap();
    assert_eq!(only_two.len(), 1);
}

#[test]
fn excel_export_has_totals() {
    use calamine::{open_workbook_auto, Reader};

    let f = fixture("excel");
    let m = f.matrix(false, Columns::Sources);
    let path = f.dir.join("matrix.xlsx");
    crate::excel::matrix::export(&m, &path).unwrap();

    let mut book = open_workbook_auto(&path).unwrap();
    let range = book.worksheet_range("Coding matrix").unwrap();
    let grid: Vec<Vec<String>> = range
        .rows()
        .map(|r| r.iter().map(|c| c.to_string()).collect())
        .collect();
    assert_eq!(grid[0], ["Code", "Interview 1", "Interview 2", "Total"]);
    assert_eq!(grid[2], ["Emotions › Worry", "2", "1", "3"]);
    assert_eq!(grid[3][0], "Total");
}
