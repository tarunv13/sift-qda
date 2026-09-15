export type TourId = "home" | "workspace";
export type Placement = "right" | "left" | "top" | "bottom" | "over" | "center";

export interface TourStep {
  /** CSS selector of the element to spotlight; omitted for centred intro cards. */
  target?: string;
  placement: Placement;
  title: string;
  body: string;
  demo?: "coding";
}

const at = (name: string) => `[data-tour="${name}"]`;

export const TOURS: Record<TourId, TourStep[]> = {
  home: [
    {
      placement: "center",
      title: "Welcome to Sift QDA",
      body: "A quick tour of how to turn interviews, papers and surveys into themes. Everything stays on this computer. Use the arrow keys or the buttons below, and press Esc to skip.",
    },
    {
      target: at("home-create"),
      placement: "bottom",
      title: "Start a project",
      body: "A project holds one study: its documents, codes, memos and participants. Type a name and choose Create project.",
    },
    {
      target: at("home-import"),
      placement: "bottom",
      title: "Coming from another tool?",
      body: "Open a .qdpx export from NVivo, ATLAS.ti or MAXQDA. Documents, codes, coded passages, cases and memos come across.",
    },
    {
      target: at("home-projects"),
      placement: "top",
      title: "Your projects",
      body: "Open a project to start working. Hover over one to delete it.",
    },
    {
      target: at("home-prefs"),
      placement: "left",
      title: "Light, dark and this tour",
      body: "Pick a light or dark look, or match Windows. Replay this tour any time. When you open a project, a second tour shows you around the workspace.",
    },
  ],
  workspace: [
    {
      placement: "center",
      title: "Your workspace",
      body: "Three columns: your material on the left, the text you are reading in the middle, and everything you find on the right. Here is what each part does.",
    },
    {
      target: at("sources"),
      placement: "right",
      title: "Sources",
      body: "Import Word, PDF, OpenDocument and text files, or survey spreadsheets, with the + button. The number beside each source counts its coded passages.",
    },
    {
      target: '[data-tour="workspace"] > :nth-child(2)',
      placement: "over",
      title: "Code by highlighting",
      body: "Open a source, select a passage, then pick a code from the menu or type a new one. A passage can carry several codes at once. Turn on Stripes above the text to see every code named in a margin beside it.",
      demo: "coding",
    },
    {
      target: at("codes"),
      placement: "right",
      title: "Codes are your themes",
      body: "Nest codes under broader themes by dragging one onto another, and give them colours. Click any code to gather every passage coded with it. Undo a coding step from the status bar or with Ctrl+Z.",
    },
    {
      target: at("explore"),
      placement: "right",
      title: "Explore words and patterns",
      body: "Word frequency shows the most common words as a cloud, bars or a table; click a word to read every place it appears. Matrix coding compares codes across sources, cases or attributes as a heatmap. Coding queries find passages coded at one code and, or, but not, or near another. Charts show your codebook as a treemap or sunburst.",
    },
    {
      target: at("tab-coded"),
      placement: "left",
      title: "Coded passages",
      body: "Every passage for the selected code, across all sources. Click one to jump to it in the text, or move it to another code. Above the list you can move the code, merge it into another, or start a memo on it.",
    },
    {
      target: at("tab-notes"),
      placement: "left",
      title: "Annotations and links",
      body: "Select a passage and choose Annotate to comment on it, or Link to connect it with another passage in any source. The Notes tab lists both for the open source.",
    },
    {
      target: at("tab-search"),
      placement: "left",
      title: "Search",
      body: "Find an exact phrase, or search by meaning to find passages that say the same thing in different words.",
    },
    {
      target: at("tab-memos"),
      placement: "left",
      title: "Memos",
      body: "Write down ideas and early interpretations as they come. Memos save as you type.",
    },
    {
      target: at("tab-cases"),
      placement: "left",
      title: "Cases",
      body: "Participants and their attributes, such as age or region. Import them from a spreadsheet or build them here: add cases and attributes, click a cell to edit it, link each case to its source, or create a case per source in one click. Use them to compare groups.",
    },
    {
      target: at("export-excel"),
      placement: "right",
      title: "Export to Excel",
      body: "One workbook with every coded extract, the codebook, a codes-by-document table, your documents and memos.",
    },
    {
      target: at("export-qdpx"),
      placement: "right",
      title: "Share with other tools",
      body: "Save a REFI-QDA project that NVivo, ATLAS.ti and MAXQDA can open.",
    },
    {
      target: at("projects"),
      placement: "right",
      title: "All projects",
      body: "Go back to the list of projects at any time. Your work is saved as you go.",
    },
    {
      target: at("index"),
      placement: "top",
      title: "Search by meaning, offline",
      body: "Meaning search runs on your computer with Ollama. This shows indexing progress, and Local AI lets you change the model or rebuild the index.",
    },
    {
      target: at("prefs"),
      placement: "top",
      title: "Theme and tour",
      body: "Switch between light and dark, or match Windows, and replay this tour whenever you need a reminder.",
    },
  ],
};
