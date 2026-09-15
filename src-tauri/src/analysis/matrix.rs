//! Matrix coding: how many coded passages each code (or theme) has in each source, case or
//! attribute value. A passage marked by several rolled-up codes counts once.

use std::collections::{HashMap, HashSet};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use super::matrix_columns;
use crate::db::{collect, nodes};
use crate::error::AppResult;
use crate::excel::code_paths;

/// A coded passage: source, start and end (code points).
pub type Passage = (i64, i64, i64);

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Columns {
    Sources,
    Cases,
    Attribute { id: i64 },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixSpec {
    /// Only top-level themes as rows, each counting the passages of all its sub-codes.
    pub themes_only: bool,
    pub columns: Columns,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixRow {
    pub id: i64,
    pub label: String,
    pub color: String,
    pub total: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatrixColumn {
    pub label: String,
    pub source_ids: Vec<i64>,
    pub total: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodingMatrix {
    pub rows: Vec<MatrixRow>,
    pub columns: Vec<MatrixColumn>,
    /// `cells[row][column]`: number of coded passages.
    pub cells: Vec<Vec<i64>>,
    /// Cases without a linked source, which cannot contribute to case or attribute columns.
    pub unlinked_cases: i64,
    pub themes_only: bool,
}

/// A code and every code nested beneath it.
pub fn subtree(root: i64, children: &HashMap<i64, Vec<i64>>) -> Vec<i64> {
    let mut out = vec![root];
    let mut i = 0;
    while i < out.len() && out.len() < 100_000 {
        if let Some(kids) = children.get(&out[i]) {
            out.extend(kids);
        }
        i += 1;
    }
    out
}

pub fn children_of(all: &[nodes::Node]) -> HashMap<i64, Vec<i64>> {
    let mut map: HashMap<i64, Vec<i64>> = HashMap::new();
    for node in all {
        if let Some(parent) = node.parent_id {
            map.entry(parent).or_default().push(node.id);
        }
    }
    map
}

fn passages_by_code(conn: &Connection, project_id: i64) -> AppResult<HashMap<i64, Vec<Passage>>> {
    let mut stmt = conn.prepare(
        "SELECT r.node_id, r.source_id, r.start_index, r.end_index
         FROM coding_references r JOIN sources s ON s.id = r.source_id WHERE s.project_id = ?1",
    )?;
    let rows = collect(stmt.query_map([project_id], |r| {
        Ok((r.get::<_, i64>(0)?, (r.get(1)?, r.get(2)?, r.get(3)?)))
    })?)?;
    let mut map: HashMap<i64, Vec<Passage>> = HashMap::new();
    for (node_id, passage) in rows {
        map.entry(node_id).or_default().push(passage);
    }
    Ok(map)
}

pub fn build(conn: &Connection, project_id: i64, spec: &MatrixSpec) -> AppResult<CodingMatrix> {
    let mut all = nodes::list(conn, project_id)?;
    let paths = code_paths(&all);
    all.sort_by_key(|n| paths[&n.id].join("\u{0}").to_lowercase());
    let children = children_of(&all);
    let by_code = passages_by_code(conn, project_id)?;
    let (mut columns, unlinked_cases) = matrix_columns::load(conn, project_id, spec.columns)?;
    let column_sets: Vec<HashSet<i64>> = columns
        .iter()
        .map(|c| c.source_ids.iter().copied().collect())
        .collect();
    let every_source: HashSet<i64> = column_sets.iter().flatten().copied().collect();

    let mut rows = Vec::new();
    let mut cells = Vec::new();
    let mut per_column: Vec<HashSet<Passage>> = vec![HashSet::new(); columns.len()];
    for node in all
        .iter()
        .filter(|n| !spec.themes_only || n.parent_id.is_none())
    {
        let codes = if spec.themes_only {
            subtree(node.id, &children)
        } else {
            vec![node.id]
        };
        let passages: HashSet<Passage> = codes
            .iter()
            .filter_map(|id| by_code.get(id))
            .flatten()
            .copied()
            .collect();

        let mut row_cells = vec![0; columns.len()];
        for (c, set) in column_sets.iter().enumerate() {
            for passage in passages.iter().filter(|p| set.contains(&p.0)) {
                row_cells[c] += 1;
                per_column[c].insert(*passage);
            }
        }
        rows.push(MatrixRow {
            id: node.id,
            label: paths[&node.id].join(" › "),
            color: node.color.clone(),
            total: passages
                .iter()
                .filter(|p| every_source.contains(&p.0))
                .count() as i64,
        });
        cells.push(row_cells);
    }
    for (column, passages) in columns.iter_mut().zip(&per_column) {
        column.total = passages.len() as i64;
    }

    Ok(CodingMatrix {
        rows,
        columns,
        cells,
        unlinked_cases,
        themes_only: spec.themes_only,
    })
}
