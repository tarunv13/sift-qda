# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

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
