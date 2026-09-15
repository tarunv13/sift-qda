//! Parser checks against real files made by `scripts/make_fixtures.py`.
//! Set SIFTQDA_FIXTURES to the output folder; the tests are skipped when it is unset.

use std::path::PathBuf;

use crate::import;
use crate::text::char_slice;

fn fixture(name: &str) -> Option<PathBuf> {
    let path = PathBuf::from(std::env::var("SIFTQDA_FIXTURES").ok()?).join(name);
    if path.exists() {
        Some(path)
    } else {
        eprintln!("fixture {} missing, skipping", path.display());
        None
    }
}

#[test]
fn docx_keeps_paragraph_structure() {
    let Some(path) = fixture("interview.docx") else {
        return;
    };
    let parsed = import::parse(&path).unwrap();
    assert_eq!(parsed.kind, "docx");
    let lines: Vec<&str> = parsed.content.lines().collect();
    assert_eq!(lines[0], "Interview with Participant 7");
    assert!(lines.contains(&"Participant: Honestly, the heat waves make me anxious every summer."));
    assert!(
        lines.iter().any(|l| l.ends_with("Sleep problems")),
        "{lines:?}"
    );
    assert!(lines.contains(&"Age | 34"), "{lines:?}");
    assert_eq!(parsed.metadata["author"], "Test Researcher");
}

#[test]
fn odt_keeps_paragraph_structure() {
    let Some(path) = fixture("focus-group.odt") else {
        return;
    };
    let parsed = import::parse(&path).unwrap();
    let lines: Vec<&str> = parsed.content.lines().collect();
    assert_eq!(
        lines,
        [
            "Focus group 2",
            "Moderator: What worries you  most?",
            "Speaker A: Losing our crops to drought.",
            "• Water shortages",
            "Village | North",
        ]
    );
    assert_eq!(parsed.metadata["author"], "Test Researcher");
}

#[test]
fn xlsx_rows_become_cases() {
    let Some(path) = fixture("survey.xlsx") else {
        return;
    };
    let parsed = import::parse(&path).unwrap();
    let table = parsed.table.expect("spreadsheet table");
    assert_eq!(table.headers, ["ID", "Age", "Region", "Open answer"]);
    assert_eq!(table.rows.len(), 3, "blank rows are skipped");
    assert_eq!(
        table.rows[2],
        ["P3", "27", "Coastal", "Heat keeps me awake."]
    );
    assert_eq!(table.value_types[1], "Integer");
    assert!(parsed.content.contains("Open answer: Summers feel longer."));
}

#[test]
fn pdf_pages_map_to_character_ranges() {
    let Some(path) = fixture("report.pdf") else {
        return;
    };
    let parsed = import::parse(&path).unwrap();
    assert_eq!(parsed.pages.len(), 2);
    let page = |i: usize| char_slice(&parsed.content, parsed.pages[i].start, parsed.pages[i].end);
    assert!(page(0).starts_with("Page one"), "{:?}", page(0));
    assert!(page(0).contains("coastal flooding"));
    assert!(page(1).starts_with("Page two"), "{:?}", page(1));
    assert_eq!(parsed.pages[1].end, parsed.content.chars().count() as i64);
}

#[test]
fn text_strips_bom_and_blank_lines() {
    let Some(path) = fixture("notes.txt") else {
        return;
    };
    let parsed = import::parse(&path).unwrap();
    assert_eq!(parsed.content, "First line\nSecond line with ünïcode");
}
