import { useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { AnalysisScope, KeywordContext, WordFrequency, WordOptions } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { PanelEmpty } from "../ui/PanelEmpty";
import { KeywordList } from "./KeywordList";
import { WordBars } from "./WordBars";
import { WordCloud } from "./WordCloud";
import { WordControls, type WordView } from "./WordControls";
import { WordTable } from "./WordTable";

const DEFAULTS: WordOptions = { minLength: 3, language: "en", extraStopWords: [], skipSpeakers: true, limit: 150 };

/** Word frequency as a cloud, bars or table, with every occurrence of a chosen word in context. */
export function WordsPanel() {
  const { project, reveal, run } = useProject();
  const [scope, setScope] = useState<AnalysisScope>({ kind: "project" });
  const [options, setOptions] = useState(DEFAULTS);
  const [view, setView] = useState<WordView>("cloud");
  const [data, setData] = useState<WordFrequency | null>(null);
  const [loading, setLoading] = useState(false);
  const [word, setWord] = useState<string | null>(null);
  const [contexts, setContexts] = useState<KeywordContext[] | null>(null);

  useEffect(() => {
    if (!project) return;
    let live = true;
    setLoading(true);
    void run(api.wordFrequency(project.id, scope, options)).then((result) => {
      if (!live) return;
      if (result) setData(result);
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [project, scope, options, run]);

  useEffect(() => {
    if (!project || !word) return;
    let live = true;
    setContexts(null);
    void run(api.keywordContexts(project.id, scope, word, options.skipSpeakers)).then((result) => {
      if (live && result) setContexts(result);
    });
    return () => {
      live = false;
    };
  }, [project, scope, word, options.skipSpeakers, run]);

  function hide(target: string) {
    setOptions((o) => ({ ...o, extraStopWords: [...o.extraStopWords, target] }));
    setWord(null);
  }

  const words = data?.words ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WordControls
        scope={scope}
        onScope={(next) => {
          setScope(next);
          setWord(null);
        }}
        options={options}
        onOptions={setOptions}
        view={view}
        onView={setView}
      />
      <div className="flex min-h-0 flex-1">
        <section className={`min-w-0 flex-1 overflow-y-auto px-5 py-4 transition-opacity duration-200 ${loading && data ? "opacity-60" : ""}`}>
          {data ? (
            <p className="mb-3 text-xs text-muted">
              {data.totalWords.toLocaleString()} words counted · {data.distinctWords.toLocaleString()} different
              {data.distinctWords > words.length ? ` · showing the top ${view === "bars" ? Math.min(25, words.length) : words.length}` : ""}
            </p>
          ) : null}
          {!data ? (
            <div className="animate-breathe h-72 rounded-xl bg-panel" />
          ) : words.length === 0 ? (
            <PanelEmpty icon="search" title="No words to show">
              Import sources or code some passages, or choose a broader scope.
            </PanelEmpty>
          ) : view === "cloud" ? (
            <WordCloud words={words} selected={word} onSelect={setWord} />
          ) : view === "bars" ? (
            <WordBars words={words.slice(0, 25)} onSelect={setWord} />
          ) : (
            <WordTable words={words} total={data.totalWords} onSelect={setWord} />
          )}
        </section>
        {word ? (
          <aside className="animate-from-right flex w-[340px] shrink-0 flex-col border-l border-line bg-panel/40">
            <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line px-3">
              <p className="flex-1 truncate font-reading text-[15px] text-ink">“{word}”</p>
              <Button size="sm" variant="ghost" onClick={() => hide(word)} title="Leave this word out of the counts">
                Hide word
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setWord(null)} aria-label="Close">
                <Icon name="x" size={14} />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <KeywordList word={word} contexts={contexts} onOpen={(c) => reveal(c.sourceId, c.start, c.end)} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
