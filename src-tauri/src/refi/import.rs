use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};

use roxmltree::{Document, ParsingOptions};
use rusqlite::Connection;
use zip::ZipArchive;

use super::{child, import_meta, import_sources, refi_err, ImportSummary};
use crate::db::projects;
use crate::error::{AppError, AppResult};

/// State shared while importing one project. Maps REFI GUIDs to new row ids;
/// fresh GUIDs are generated so the same file can be imported twice.
pub(crate) struct Context {
    pub project_id: i64,
    pub codes: HashMap<String, i64>,
    pub attributes: HashMap<String, i64>,
    pub sources: HashMap<String, i64>,
    pub note_sources: HashMap<String, i64>,
    /// Plain-text entries in the archive, keyed by lower-case file name.
    pub texts: HashMap<String, String>,
    pub base_dir: PathBuf,
    pub summary: ImportSummary,
}

pub fn import(conn: &Connection, path: &Path) -> AppResult<ImportSummary> {
    let mut zip = ZipArchive::new(File::open(path)?).map_err(refi_err)?;
    let mut qde = None;
    let mut texts = HashMap::new();
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(refi_err)?;
        let name = entry.name().to_ascii_lowercase();
        if !(name.ends_with(".qde") || name.ends_with(".txt")) {
            continue;
        }
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes)?;
        let text = String::from_utf8_lossy(bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(&bytes))
            .into_owned();
        if name.ends_with(".qde") {
            qde = Some(text);
        } else {
            let file_name = name.rsplit('/').next().unwrap_or(&name).to_string();
            texts.insert(file_name, text);
        }
    }
    let xml = qde.ok_or_else(|| AppError::Refi("no project.qde found in the archive".into()))?;
    let options = ParsingOptions {
        allow_dtd: true,
        ..ParsingOptions::default()
    };
    let doc = Document::parse_with_options(&xml, options).map_err(refi_err)?;
    let root = doc.root_element();

    let name = root.attribute("name").unwrap_or("Imported project");
    let project = projects::create(conn, name, "Imported from REFI-QDA")?;
    let mut ctx = Context {
        project_id: project.id,
        codes: HashMap::new(),
        attributes: HashMap::new(),
        sources: HashMap::new(),
        note_sources: HashMap::new(),
        texts,
        base_dir: path.parent().map(Path::to_path_buf).unwrap_or_default(),
        summary: ImportSummary {
            project_id: project.id,
            ..ImportSummary::default()
        },
    };

    if let Some(codes) = child(root, "CodeBook").and_then(|c| child(c, "Codes")) {
        import_meta::import_codes(conn, &mut ctx, codes, None)?;
    }
    if let Some(variables) = child(root, "Variables") {
        import_meta::import_variables(conn, &mut ctx, variables)?;
    }
    if let Some(sources) = child(root, "Sources") {
        import_sources::import_sources(conn, &mut ctx, sources)?;
    }
    if let Some(cases) = child(root, "Cases") {
        import_meta::import_cases(conn, &mut ctx, cases)?;
    }
    if let Some(notes) = child(root, "Notes") {
        import_meta::import_notes(conn, &mut ctx, notes)?;
    }
    Ok(ctx.summary)
}
