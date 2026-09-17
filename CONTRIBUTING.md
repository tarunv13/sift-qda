# Contributing to Sift QDA

Thanks for helping. Researchers, designers and developers are all useful here: a clear bug report
or a description of how you analyse data is as valuable as code.

## Ways to help

- **Report a bug** with the bug template. Attach a small file that reproduces the problem if you
  can, but never attach real research data.
- **Suggest a feature** with the feature template. Tell us what you are trying to do in your
  analysis, not just the button you want.
- **Improve the docs**, including new workflows for [docs/use-cases.md](docs/use-cases.md).
- **Write code.** Issues labelled `good first issue` are a good start.

## Finding your way around

[docs/architecture.md](docs/architecture.md) maps the whole application in one diagram: which folder
holds what, what the app talks to, how the database is laid out, and the path a passage takes from an
imported file to a coded extract. Start there before a first pull request.

## Development setup

See [Build from source](README.md#build-from-source) for requirements. Then:

```powershell
npm install
npm run tauri dev
```

## Design rules

These keep the project small and easy to review. Pull requests that break them will be asked to
change.

1. **All file parsing and database access live in Rust** (`src-tauri/src`). The frontend calls
   typed commands in `src/lib/api.ts` and never parses files or touches SQLite.
2. **No source file over 200 lines.** Split by responsibility instead.
3. **Minimal npm dependencies.** No icon packs, drag-and-drop, HTTP clients or state-management
   libraries. Use native browser APIs, React hooks and Tailwind.
4. **Offsets are Unicode code points** into a source's plain text, matching REFI-QDA. Source text
   is immutable once imported.
5. **Nothing leaves the machine** without the user turning it on. No telemetry, no remote calls.

## Before you open a pull request

```powershell
npm run build              # type-checks and builds the frontend
cd src-tauri
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

Parser changes should also run the fixture tests (see the README) and add a test.

- Keep pull requests focused on one change.
- Describe what changed and how you tested it.
- UI changes: include a screenshot or short clip.
- By contributing you agree your work is dual licensed under MIT OR Apache-2.0.

## Privacy when reporting

Screenshots, sample files and logs can contain participant data or your own file paths. Redact
them before posting. If a problem only reproduces with sensitive data, describe it and a
maintainer will work out a safe way to reproduce it.
