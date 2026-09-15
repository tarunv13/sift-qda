import { useEffect, useState, type FormEvent } from "react";

import { api } from "../../lib/api";
import type { EmbeddingConfig } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

const field =
  "h-9 w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/40";

export function AiSettings({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { run, notify } = useProject();
  const [config, setConfig] = useState<EmbeddingConfig | null>(null);

  useEffect(() => {
    void run(api.getEmbeddingConfig()).then((c) => c && setConfig(c));
  }, [run]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (config && (await run(api.setEmbeddingConfig(config).then(() => true)))) {
      notify("Settings saved. Indexing resumes in the background.", "success");
      onClose();
    }
  }

  async function rebuild() {
    if (await run(api.reindexEmbeddings().then(() => true))) {
      notify("Rebuilding the semantic index from scratch.");
      onClose();
    }
  }

  return (
    <form
      onSubmit={save}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="animate-pop absolute right-0 bottom-9 z-40 w-80 origin-bottom-right rounded-2xl border border-line bg-surface p-4 text-sm text-ink shadow-2xl"
    >
      <div className="mb-3 flex items-center">
        <h3 className="font-reading text-base">Local AI</h3>
        <Button size="icon" variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
          <Icon name="x" size={14} />
        </Button>
      </div>
      <p className="mb-3 leading-relaxed text-muted">
        Everything runs on this computer through <span className="font-medium text-ink">Ollama</span>. Semantic search
        needs <code className="rounded bg-panel px-1 py-0.5 text-xs select-text">ollama pull nomic-embed-text</code>;
        summaries and sub-code suggestions need a chat model, such as{" "}
        <code className="rounded bg-panel px-1 py-0.5 text-xs select-text">ollama pull llama3.2:3b</code>.
      </p>
      {message ? <p className="animate-rise mb-3 rounded-lg bg-warn/10 p-2.5 text-xs leading-relaxed text-ink">{message}</p> : null}
      {config ? (
        <div className="space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Ollama address</span>
            <input className={field} value={config.url} onChange={(e) => setConfig({ ...config, url: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Embedding model (768 dimensions)</span>
            <input className={field} value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Chat model (summaries and suggestions)</span>
            <input className={field} value={config.chatModel} onChange={(e) => setConfig({ ...config, chatModel: e.target.value })} />
          </label>
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={rebuild}>
          Rebuild index
        </Button>
        <Button type="submit" variant="primary" size="sm" className="ml-auto" disabled={!config}>
          Save and retry
        </Button>
      </div>
    </form>
  );
}
