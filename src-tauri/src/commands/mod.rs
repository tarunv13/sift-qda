//! Tauri command handlers: thin wrappers that lock the database and call `db`, `import`, `ai` or `refi`.

pub mod analysis;
pub mod assist;
pub mod cases;
pub mod code_ops;
pub mod coding;
pub mod excel;
pub mod matrix;
pub mod memos;
pub mod notes;
pub mod projects;
pub mod query;
pub mod refi;
pub mod search;
pub mod sources;
