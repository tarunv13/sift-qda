//! Tauri command handlers: thin wrappers that lock the database and call `db`, `import`, `ai` or `refi`.

pub mod cases;
pub mod coding;
pub mod excel;
pub mod memos;
pub mod projects;
pub mod refi;
pub mod search;
pub mod sources;
