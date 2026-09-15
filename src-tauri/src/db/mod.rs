pub mod annotations;
pub mod case_edit;
pub mod cases;
pub mod code_ops;
pub mod links;
pub mod memos;
pub mod migrate;
pub mod nodes;
pub mod projects;
pub mod references;
pub mod sources;

use std::os::raw::{c_char, c_int};
use std::path::Path;
use std::sync::Once;

use rusqlite::ffi::{sqlite3, sqlite3_api_routines};
use rusqlite::Connection;

use crate::error::AppResult;

const SCHEMA: &str = include_str!("schema.sql");
static VEC_EXTENSION: Once = Once::new();

type ExtensionInit =
    unsafe extern "C" fn(*mut sqlite3, *mut *mut c_char, *const sqlite3_api_routines) -> c_int;

/// Registers sqlite-vec for every connection opened afterwards in this process.
fn register_vec_extension() {
    VEC_EXTENSION.call_once(|| unsafe {
        let init = std::mem::transmute::<*const (), ExtensionInit>(
            sqlite_vec::sqlite3_vec_init as *const (),
        );
        rusqlite::ffi::sqlite3_auto_extension(Some(init));
    });
}

/// Opens (and migrates) the database. Safe to call from any thread.
pub fn open(path: &Path) -> AppResult<Connection> {
    register_vec_extension();
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "busy_timeout", 5000)?;
    conn.execute_batch(SCHEMA)?;
    migrate::run(&conn)?;
    Ok(conn)
}

pub fn new_guid() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Collects a mapped statement into a Vec, converting the error type.
pub fn collect<T>(rows: impl Iterator<Item = rusqlite::Result<T>>) -> AppResult<Vec<T>> {
    Ok(rows.collect::<rusqlite::Result<Vec<T>>>()?)
}
