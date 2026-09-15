# Security policy

Sift QDA is often used with sensitive research data, so we take security reports seriously.

## Supported versions

Only the latest release receives security fixes while the project is below 1.0.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private reporting instead:
go to the **Security** tab of this repository and choose **Report a vulnerability**.

Please include the version, steps to reproduce, and the impact you expect. You should get a first
response within 7 days. We will agree a disclosure date with you once a fix is ready.

**Never attach real research data** (transcripts, recordings, project databases or exports) to a
report, issue or pull request. Reproduce the problem with made-up text instead.

## Scope

Examples of issues we want to hear about:

- Crafted `.docx`, `.odt`, `.xlsx`, `.pdf` or `.qdpx` files that crash the app, read files outside
  the import, or execute code
- Any network traffic the app sends that the user did not configure
- Ways project data could be exposed to other local users or applications
- Ways the transcription or local AI features could run a program other than the one the user
  chose, or send text or audio off the computer

## Protecting research data

Sift QDA has no accounts, cloud sync or telemetry. What it stores, and how to keep it safe:

| Data | Where it lives | Advice |
| --- | --- | --- |
| Projects: sources, codes, memos, cases | `%APPDATA%\org.siftqda.desktop\siftqda.db` | Turn on full-disk encryption (BitLocker on Windows) and keep encrypted backups |
| Semantic search vectors | The same database, in a separate table | Rebuilt from the text at any time; delete with the project |
| Transcripts written by the transcriber | `%APPDATA%\org.siftqda.desktop\transcripts\` | Delete a job's folder once its transcript is imported if you do not need a copy |
| Original files, including audio | Wherever you imported them from; only the path is stored | Keep them in an encrypted folder; moving them breaks the PDF view and audio playback |
| Excel and REFI-QDA exports | Wherever you save them | Treat exports like the raw data: they contain every coded passage |

- **Local AI stays local only while its address does.** Semantic search, summaries and code
  suggestions send text to the Ollama address in **Local AI** settings, which defaults to this
  computer (`http://127.0.0.1:11434`). Pointing it at another machine sends your text there.
- **Transcription runs your own tool.** The app starts the Python interpreter inside the chosen
  folder's `.venv` with `transcribe.py`, passing arguments directly rather than through a shell. It
  never downloads or updates the tool. Only choose a folder you trust.
- **Deleting** a source removes its text, codings, notes and vectors from the database. SQLite may
  keep freed pages on disk until the database is compacted, so rely on disk encryption rather than
  deletion for sensitive material.

## How this repository guards against leaks

- `.gitignore` excludes project databases, exports, recordings, transcripts and common document
  formats, so research data is not committed by accident. A deliberate sample must be added with
  `git add -f`.
- Every push and pull request, plus a weekly scheduled run, scans the full git history with
  [gitleaks](https://github.com/gitleaks/gitleaks). It uses the default credential rules plus rules
  for home-folder paths and personal email addresses (`.gitleaks.toml`). Findings are redacted.
- GitHub secret scanning with push protection, Dependabot alerts and security updates are enabled.
  `main` accepts changes only through pull requests that pass CI.
