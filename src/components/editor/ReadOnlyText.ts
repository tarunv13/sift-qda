import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/** Transactions carrying this meta key may change the document (coding, reloads). */
export const ALLOW_CHANGE = "siftqda:allowChange";

/**
 * Source text is immutable: stored offsets would drift if it were edited. The
 * editor stays "editable" so selection and the bubble menu work normally, but
 * every document-changing transaction without ALLOW_CHANGE is dropped.
 */
export const ReadOnlyText = Extension.create({
  name: "readOnlyText",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("readOnlyText"),
        filterTransaction: (tr) => !tr.docChanged || tr.getMeta(ALLOW_CHANGE) === true,
        props: {
          handleTextInput: () => true,
          handlePaste: () => true,
          handleDrop: () => true,
        },
      }),
    ];
  },
});
