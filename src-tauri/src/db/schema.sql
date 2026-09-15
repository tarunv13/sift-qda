-- Sift QDA core schema. Offsets are Unicode code-point indices into sources.content
-- (the same unit REFI-QDA uses for PlainTextSelection startPosition/endPosition).
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('text', 'docx', 'pdf', 'xlsx')),
    file_path   TEXT,
    content     TEXT NOT NULL DEFAULT '',
    metadata    TEXT NOT NULL DEFAULT '{}', -- JSON
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sources_project ON sources(project_id);

-- Maps PDF page numbers to character ranges in sources.content.
CREATE TABLE IF NOT EXISTS source_pages (
    source_id    INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    page         INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset   INTEGER NOT NULL,
    PRIMARY KEY (source_id, page)
);

CREATE TABLE IF NOT EXISTS nodes (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id   INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#f5c542',
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id);

-- "References" in NVivo terms; REFERENCES is an SQL keyword, hence the name.
CREATE TABLE IF NOT EXISTS coding_references (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    node_id     INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    start_index INTEGER NOT NULL,
    end_index   INTEGER NOT NULL CHECK (end_index > start_index),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (source_id, node_id, start_index, end_index)
);
CREATE INDEX IF NOT EXISTS idx_refs_source ON coding_references(source_id);
CREATE INDEX IF NOT EXISTS idx_refs_node ON coding_references(node_id);

CREATE TABLE IF NOT EXISTS memos (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_id   INTEGER REFERENCES sources(id) ON DELETE CASCADE,
    node_id     INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Survey data from .xlsx: each row is a case, each column an attribute.
CREATE TABLE IF NOT EXISTS cases (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_id   INTEGER REFERENCES sources(id) ON DELETE SET NULL,
    name        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attributes (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    value_type  TEXT NOT NULL DEFAULT 'Text' CHECK (value_type IN ('Text', 'Integer', 'Float', 'Boolean', 'Date')),
    UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS case_attribute_values (
    case_id      INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    attribute_id INTEGER NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
    value        TEXT NOT NULL,
    PRIMARY KEY (case_id, attribute_id)
);

-- Text chunks for semantic search. Vectors live in the vec_chunks vec0 table
-- (created at runtime once the embedding dimension is known), keyed by rowid = chunks.id.
CREATE TABLE IF NOT EXISTS chunks (
    id           INTEGER PRIMARY KEY,
    source_id    INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    start_offset INTEGER NOT NULL,
    end_offset   INTEGER NOT NULL,
    embedded     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_pending ON chunks(embedded) WHERE embedded = 0;

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Comments attached to a stretch of a source.
CREATE TABLE IF NOT EXISTS annotations (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    start_index INTEGER NOT NULL,
    end_index   INTEGER NOT NULL CHECK (end_index > start_index),
    body        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_annotations_source ON annotations(source_id);

-- "See also" links from one passage to another, in the same source or another.
CREATE TABLE IF NOT EXISTS passage_links (
    id          INTEGER PRIMARY KEY,
    guid        TEXT NOT NULL UNIQUE,
    from_source INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    from_start  INTEGER NOT NULL,
    from_end    INTEGER NOT NULL,
    to_source   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    to_start    INTEGER NOT NULL,
    to_end      INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_links_from ON passage_links(from_source);
CREATE INDEX IF NOT EXISTS idx_links_to ON passage_links(to_source);
