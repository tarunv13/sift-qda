# Who uses Sift QDA, and how

Each workflow below uses only features that exist today. The pattern is the same everywhere:
import material, attach attributes to cases, build codes, review by code, export.

## Academic thematic analysis

**Material:** interview transcripts (`.docx`), a participant sheet (`.xlsx`).

1. Import the participant spreadsheet. Row 1 (age, gender, site) becomes attributes; each row
   becomes a case.
2. Import the transcripts and do a first pass of open codes as you read.
3. Group codes into candidate themes by nesting them in the code tree.
4. Review each theme's references side by side and write a memo on what holds it together.
5. Export to Excel. The *Coded extracts* sheet gives you theme, code, document and quote per row,
   ready for a results table.

Because nothing is uploaded, this also works for ethics approvals that forbid cloud processing.

## Grounded theory

Open-code line by line, then use memos for constant comparison. Semantic search helps with
theoretical sampling: search for a concept in your own words to find incidents you have not coded
yet, across every transcript.

## UX and product research

**Material:** interview notes, usability-test write-ups, exported support tickets or reviews.

- Code pain points, workarounds and feature requests as separate branches of the code tree.
- Import a ticket export spreadsheet so each ticket becomes a case with plan, platform and date
  attributes.
- The *Codes by document* sheet shows how widespread each pain point is.

## Market research and open-ended surveys

**Material:** survey export with one row per respondent.

Import the spreadsheet so demographic columns become attributes. Code the free-text answers, then
export and pivot the *Coded extracts* sheet in Excel by segment.

Before building the codebook, open **Explore → word frequency** to see which words keep coming up,
then click a word to read every answer that uses it.

## Public policy and consultations

**Material:** hundreds of consultation responses as PDF or Word.

Build the code tree from the consultation questions, then add emergent codes. Use exact search for
named proposals and semantic search for arguments phrased in many different ways. Export extracts
per code to evidence each paragraph of the summary report.

## Health and social care research

**Material:** patient, carer and clinician interviews containing sensitive information.

Sift QDA keeps the database on the local disk and makes no network calls except to a local Ollama
server that you choose to run. Store the project on an encrypted drive if your data-management plan
requires it. You remain responsible for your own information-governance obligations.

## Monitoring and evaluation

**Material:** programme reports, beneficiary interviews, partner updates across several countries.

Make each site or partner a case with country, year and programme attributes. Code against the
evaluation framework (relevance, effectiveness, sustainability) and export the matrix for the
donor report.

## Journalism and investigations

**Material:** large sets of PDFs from records requests or court filings.

PDF page numbers are kept for every coded passage, so each quote can be traced back to its page.
Code people, organisations and events, then review everything coded for one person in one view.

## Law, compliance and policy review

**Material:** contracts, policies, regulatory guidance.

Code clauses by obligation type and risk. Semantic search finds equivalent clauses worded
differently across documents. Export the extracts to share with colleagues who do not use the app.

## Education

**Material:** student reflections, course evaluations, observation notes.

Import evaluation exports as cases with course and year attributes, code for themes such as
workload or feedback quality, and compare across cohorts in Excel.

## HR and organisational research

**Material:** exit interviews, engagement-survey comments.

Keep identifiable comments off third-party servers. Code reasons for leaving and cultural themes,
with department and tenure as attributes.

## History, humanities and oral history

**Material:** transcribed oral histories, archival letters, digitised PDFs.

Code people, places and recurring motifs. Memos hold archival context. Note that scanned archives
need OCR first.

## Literature reviews

**Material:** a folder of research papers as PDFs.

Import each paper, code study design, sample, findings and limitations, and export the *Coded
extracts* sheet as the base of an evidence table. Page numbers make citations easy to check.

## Collaborating with people on other tools

Export a `.qdpx` project and a colleague can open it in NVivo, ATLAS.ti, MAXQDA or another
REFI-QDA tool, then send it back. See the README for current limits on what round-trips.
