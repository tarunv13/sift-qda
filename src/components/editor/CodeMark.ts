import { Mark, mergeAttributes } from "@tiptap/react";

export interface CodeMarkAttrs {
  referenceId: number;
  nodeId: number;
  color: string;
  name: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeMark: {
      /** Highlights the current selection with a code's colour. */
      setCodeMark: (attrs: CodeMarkAttrs) => ReturnType;
    };
  }
}

/**
 * A coding highlight. `excludes: ""` lets several codeMarks with different
 * attributes sit on the same text, which is how overlapping codes render.
 */
export const CodeMark = Mark.create({
  name: "codeMark",
  excludes: "",
  inclusive: false,
  spanning: true,

  addAttributes() {
    return {
      referenceId: { default: null, renderHTML: (a) => ({ "data-reference-id": a.referenceId }) },
      nodeId: { default: null, renderHTML: (a) => ({ "data-node-id": a.nodeId }) },
      color: { default: "#f5c542", renderHTML: (a) => ({ style: `--code-color: ${a.color}` }) },
      name: { default: "", renderHTML: (a) => ({ title: a.name }) },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-code-mark]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ "data-code-mark": "", class: "code-mark" }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCodeMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
    };
  },
});
