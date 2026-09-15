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
- **Explore → word frequency:** a word cloud, bar chart or table of the most frequent words for the
  whole project, one source, or the passages coded at one code. Common English and Hindi words,
  interview fillers and speaker labels such as "P01:" can be left out, and individual words can be
  hidden. Clicking a word lists every occurrence in context; clicking an occurrence opens the source
  at that spot. Charts use Apache ECharts and d3-cloud and follow the light and dark themes.
- **Explore → matrix coding:** a heatmap or table of how many coded passages each code has in each
  source, case, or value of a case attribute. Rows can be every code or top-level themes with their
  sub-codes rolled up, counting a passage once even when several of those codes mark it. Click a cell
  to read its passages and jump to them; export the matrix to Excel with row and column totals.
  Cases not linked to a source are counted and reported rather than silently dropped.
- **Explore → coding query:** passages coded at one code on their own, and also at another (the
  overlap), or at another (either), but not at another, or near another within a number of
  characters. Include sub-codes, limit to cases with an attribute value, and save the results as a new
  code in one step.
- **Explore → charts:** the code hierarchy as a treemap or sunburst sized by coded passages
  (including sub-codes), where clicking a code opens its passages; and one code across every source
  as a bar chart. Both have a table view.
- **Annotations and see-also links:** select a passage and choose Annotate to attach a comment, or
  Link to connect it with another passage in the same or another source. A new Notes tab lists the
  open source's annotations (autosaving) and links, and opens either end in the reader. Both are
  removed with their source.
- **Codebook housekeeping:** drag a code onto another to nest it (or onto the strip above the tree to
  un-nest it), or pick where it sits from the Coded tab. Merge a code into another, moving its
  passages, sub-codes and memos without duplicating passages coded at both. Move a single passage to
  a different code. Start a memo on a code.
- **Undo** for coding, uncoding, moving a passage and moving a code, from the status bar or Ctrl+Z.
- **Coding stripes:** turn on Stripes above a source to see a named bar beside the text for each
  coded passage, in separate lanes where codes overlap. Click a stripe to open its code.
- **Editable cases:** add cases and attributes, rename them, edit values in place, link a case to a
  source, delete either, or create a case for every source that has none. Memos can be linked to a
  case from its row.

### Changed

- The light palette is brighter and closer to white.
- **Code colours** now come from eight hues checked for colour-blind safety and contrast in both
  themes (the old set had near-identical blue and violet under red-green colour blindness). Colour
  pickers announce colour names to screen readers. Existing codes keep their colours; choose a new
  one from the code's colour dot.

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
