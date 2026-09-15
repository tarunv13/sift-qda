use std::fs::File;
use std::io::Write;
use std::path::Path;

use rusqlite::Connection;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

use super::{attr, escape, export_meta, refi_err, xsd_datetime};
use crate::db::nodes::{self, Node};
use crate::db::{collect, new_guid, projects};
use crate::error::AppResult;

pub fn export(conn: &Connection, project_id: i64, dest: &Path) -> AppResult<()> {
    let project = projects::get(conn, project_id)?;
    let mut xml = String::from("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
    xml.push_str(&format!(
        "<Project xmlns=\"urn:QDA-XML:project:1.0\"{}{}{}>\n",
        attr("name", &project.name),
        attr("origin", "Sift QDA"),
        attr("creationDateTime", &xsd_datetime(&project.created_at)),
    ));
    xml.push_str(&format!(
        "<Users><User{}{}/></Users>\n",
        attr("guid", &new_guid()),
        attr("name", "Sift QDA")
    ));

    write_codebook(&nodes::list(conn, project_id)?, &mut xml);
    export_meta::write_variables_and_cases(conn, project_id, &mut xml)?;
    let files = write_sources(conn, project_id, &mut xml)?;
    export_meta::write_notes(conn, project_id, &mut xml)?;
    if !project.description.is_empty() {
        xml.push_str(&format!(
            "<Description>{}</Description>\n",
            escape(&project.description)
        ));
    }
    xml.push_str("</Project>\n");

    let mut zip = ZipWriter::new(File::create(dest)?);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    zip.start_file("project.qde", options).map_err(refi_err)?;
    zip.write_all(xml.as_bytes())?;
    for (name, content) in files {
        zip.start_file(format!("sources/{name}"), options)
            .map_err(refi_err)?;
        zip.write_all(content.as_bytes())?;
    }
    zip.finish().map_err(refi_err)?;
    Ok(())
}

fn write_codebook(nodes: &[Node], xml: &mut String) {
    if nodes.is_empty() {
        return;
    }
    xml.push_str("<CodeBook><Codes>\n");
    write_codes(nodes, None, xml);
    xml.push_str("</Codes></CodeBook>\n");
}

fn write_codes(nodes: &[Node], parent: Option<i64>, xml: &mut String) {
    for node in nodes.iter().filter(|n| n.parent_id == parent) {
        xml.push_str(&format!(
            "<Code{}{}{}{}>",
            attr("guid", &node.guid),
            attr("name", &node.name),
            attr("isCodable", "true"),
            attr("color", &node.color.to_uppercase()),
        ));
        if !node.description.is_empty() {
            xml.push_str(&format!(
                "<Description>{}</Description>",
                escape(&node.description)
            ));
        }
        write_codes(nodes, Some(node.id), xml);
        xml.push_str("</Code>\n");
    }
}

/// Writes every source as a TextSource; returns the plain-text files for the zip.
fn write_sources(
    conn: &Connection,
    project_id: i64,
    xml: &mut String,
) -> AppResult<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT id, guid, name, content, created_at FROM sources WHERE project_id = ?1 ORDER BY id",
    )?;
    let sources = collect(stmt.query_map([project_id], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, String>(4)?,
        ))
    })?)?;
    if sources.is_empty() {
        return Ok(Vec::new());
    }

    let mut refs_stmt = conn.prepare(
        "SELECT r.guid, n.guid, r.start_index, r.end_index FROM coding_references r
         JOIN nodes n ON n.id = r.node_id WHERE r.source_id = ?1 ORDER BY r.start_index",
    )?;
    let mut notes_stmt = conn.prepare("SELECT guid FROM memos WHERE source_id = ?1")?;
    let mut files = Vec::with_capacity(sources.len());

    xml.push_str("<Sources>\n");
    for (id, guid, name, content, created_at) in sources {
        let file_name = format!("{guid}.txt");
        xml.push_str(&format!(
            "<TextSource{}{}{}{}>\n",
            attr("guid", &guid),
            attr("name", &name),
            attr("plainTextPath", &format!("internal://{file_name}")),
            attr("creationDateTime", &xsd_datetime(&created_at)),
        ));
        let refs = collect(refs_stmt.query_map([id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, i64>(3)?,
            ))
        })?)?;
        for (ref_guid, code_guid, start, end) in refs {
            xml.push_str(&format!(
                "<PlainTextSelection{}{}{}><Coding{}><CodeRef{}/></Coding></PlainTextSelection>\n",
                attr("guid", &new_guid()),
                attr("startPosition", &start.to_string()),
                attr("endPosition", &end.to_string()),
                attr("guid", &ref_guid),
                attr("targetGUID", &code_guid),
            ));
        }
        for note_guid in collect(notes_stmt.query_map([id], |r| r.get::<_, String>(0))?)? {
            xml.push_str(&format!("<NoteRef{}/>\n", attr("targetGUID", &note_guid)));
        }
        xml.push_str("</TextSource>\n");
        files.push((file_name, content));
    }
    xml.push_str("</Sources>\n");
    Ok(files)
}
