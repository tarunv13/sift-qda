mod ai;
mod analysis;
mod commands;
mod db;
mod error;
mod excel;
mod import;
mod refi;
mod state;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_analysis;
#[cfg(test)]
mod tests_import;
#[cfg(test)]
mod tests_live;
#[cfg(test)]
mod tests_matrix;
#[cfg(test)]
mod tests_notes;
#[cfg(test)]
mod tests_query;
mod text;

use std::sync::Mutex;

use tauri::Manager;

use commands::{
    analysis as analysis_cmd, cases, coding, excel as excel_cmd, matrix as matrix_cmd, memos,
    notes as notes_cmd, projects, query as query_cmd, refi as refi_cmd, search, sources,
};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let db_path = dir.join("siftqda.db");
            let conn = db::open(&db_path)?;
            app.manage(AppState {
                db: Mutex::new(conn),
                db_path: db_path.clone(),
            });
            // Finish any embeddings left pending by the previous run.
            ai::worker::spawn(app.handle().clone(), db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            projects::list_projects,
            projects::create_project,
            projects::rename_project,
            projects::delete_project,
            sources::list_sources,
            sources::get_source,
            sources::read_source_bytes,
            sources::import_source_files,
            sources::rename_source,
            sources::delete_source,
            coding::list_nodes,
            coding::create_node,
            coding::update_node,
            coding::delete_node,
            coding::save_coding_reference,
            coding::list_source_references,
            coding::list_node_references,
            coding::delete_coding_reference,
            memos::list_memos,
            memos::create_memo,
            memos::update_memo,
            memos::delete_memo,
            cases::get_case_table,
            search::semantic_search,
            search::text_search,
            search::embedding_status,
            search::get_embedding_config,
            search::set_embedding_config,
            search::reindex_embeddings,
            refi_cmd::import_qdpx,
            refi_cmd::export_qdpx,
            excel_cmd::export_excel,
            analysis_cmd::word_frequency,
            analysis_cmd::keyword_contexts,
            matrix_cmd::coding_matrix,
            matrix_cmd::matrix_cell_passages,
            matrix_cmd::export_matrix_excel,
            query_cmd::coding_query,
            query_cmd::code_query_results,
            notes_cmd::list_source_notes,
            notes_cmd::create_annotation,
            notes_cmd::update_annotation,
            notes_cmd::delete_annotation,
            notes_cmd::create_passage_link,
            notes_cmd::delete_passage_link,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sift QDA");
}
