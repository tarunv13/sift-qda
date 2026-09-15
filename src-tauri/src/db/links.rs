//! "See also" links between passages, in the same source or across sources.

use std::collections::hash_map::Entry;
use std::collections::HashMap;

use rusqlite::{params, Connection};
use serde::Serialize;

use super::annotations::{checked_content, quote};
use super::{collect, new_guid, sources};
use crate::error::{AppError, AppResult};

/// A passage: source, start and end (code points).
pub type Passage = (i64, i64, i64);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassageLink {
    pub id: i64,
    /// True when the link starts at this source's passage.
    pub outgoing: bool,
    pub here_start: i64,
    pub here_end: i64,
    pub here_text: String,
    pub other_source_id: i64,
    pub other_source_name: String,
    pub there_start: i64,
    pub there_end: i64,
    pub there_text: String,
}

pub fn create(conn: &Connection, from: Passage, to: Passage) -> AppResult<i64> {
    if from == to {
        return Err(AppError::Invalid("a passage cannot link to itself".into()));
    }
    checked_content(conn, from.0, from.1, from.2)?;
    checked_content(conn, to.0, to.1, to.2)?;
    conn.execute(
        "INSERT INTO passage_links (guid, from_source, from_start, from_end, to_source, to_start, to_end)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![new_guid(), from.0, from.1, from.2, to.0, to.1, to.2],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM passage_links WHERE id = ?1", [id])?;
    Ok(())
}

/// Links touching a source, seen from that source. A link within one source appears once.
pub fn for_source(conn: &Connection, source_id: i64) -> AppResult<Vec<PassageLink>> {
    let mut stmt = conn.prepare(
        "SELECT l.id, 1, l.from_start, l.from_end, l.to_source, s.name, l.to_start, l.to_end
           FROM passage_links l JOIN sources s ON s.id = l.to_source WHERE l.from_source = ?1
         UNION ALL
         SELECT l.id, 0, l.to_start, l.to_end, l.from_source, s.name, l.from_start, l.from_end
           FROM passage_links l JOIN sources s ON s.id = l.from_source
          WHERE l.to_source = ?1 AND l.from_source <> ?1
         ORDER BY 3, 1",
    )?;
    let rows = collect(stmt.query_map([source_id], |r| {
        Ok(PassageLink {
            id: r.get(0)?,
            outgoing: r.get::<_, i64>(1)? == 1,
            here_start: r.get(2)?,
            here_end: r.get(3)?,
            here_text: String::new(),
            other_source_id: r.get(4)?,
            other_source_name: r.get(5)?,
            there_start: r.get(6)?,
            there_end: r.get(7)?,
            there_text: String::new(),
        })
    })?)?;

    let mut contents: HashMap<i64, String> = HashMap::new();
    let mut out = Vec::with_capacity(rows.len());
    for mut link in rows {
        for id in [source_id, link.other_source_id] {
            if let Entry::Vacant(entry) = contents.entry(id) {
                entry.insert(sources::content(conn, id)?);
            }
        }
        link.here_text = quote(&contents[&source_id], link.here_start, link.here_end);
        link.there_text = quote(
            &contents[&link.other_source_id],
            link.there_start,
            link.there_end,
        );
        out.push(link);
    }
    Ok(out)
}
