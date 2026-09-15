# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## [Unreleased]

### Added

- Guided tour for first-time users: a spotlight walks through the projects screen and the workspace
  (sources, coding, codes, coded passages, search, memos, cases, exports, local AI), with a short
  animation of how coding works. It starts automatically once per screen and can be replayed from
  the **Tour** button. Arrow keys move between steps and Esc closes it.
- Light, dark and match-Windows themes, switchable from the status bar and the projects screen. The
  choice is remembered and the window title bar follows it.

### Changed

- The light palette is brighter and closer to white.

## [0.1.0] - 2026-09-15

First public release.

### Added

- Projects stored in a local SQLite database
- Import of `.docx`, `.doc`, `.odt`, `.pdf` (with page mapping), `.txt`, and `.xlsx`/`.xls`/`.ods`
  as cases with attributes
- Highlight-to-code editor with hierarchical, coloured codes and overlapping codings
- Memos and a case/attribute table
- Exact phrase search, and offline semantic search using Ollama `nomic-embed-text` embeddings
  stored in `sqlite-vec`
- REFI-QDA `.qdpx` import and export
- Excel export: coded extracts, codebook, codes by document, documents, memos
- Windows installers (NSIS `.exe` and `.msi`)
