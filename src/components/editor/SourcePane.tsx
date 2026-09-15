import { lazy, Suspense, useEffect, useState } from "react";

import { api } from "../../lib/api";
import type { CodingReference, Source } from "../../lib/types";
import { useProject } from "../../state/ProjectContext";
import { EmptySource, SourceHeader } from "./SourceChrome";
import { SourceViewer } from "./SourceViewer";

// pdf.js is large; load it only when a PDF is opened.
const PdfPane = lazy(() => import("../pdf/PdfPane").then((m) => ({ default: m.PdfPane })));
const STRIPES_KEY = "siftqda:stripes";

/** Loads the selected source and its references; hosts the text and optional PDF page. */
export function SourcePane() {
  const { sourceId, referencesVersion, referencesChanged, reveal, run } = useProject();
  const [source, setSource] = useState<Source | null>(null);
  const [refs, setRefs] = useState<{ sourceId: number; items: CodingReference[] } | null>(null);
  const [showPage, setShowPage] = useState(true);
  const [page, setPage] = useState(1);
  const [stripes, setStripes] = useState(() => {
    try {
      return localStorage.getItem(STRIPES_KEY) === "on";
    } catch {
      return false;
    }
  });

  function toggleStripes() {
    setStripes((on) => {
      try {
        localStorage.setItem(STRIPES_KEY, on ? "off" : "on");
      } catch {
        // Stripes still toggle for this session.
      }
      return !on;
    });
  }

  useEffect(() => {
    if (sourceId === null) return setSource(null);
    let live = true;
    void run(api.getSource(sourceId)).then((loaded) => {
      if (live && loaded) {
        setSource(loaded);
        setPage(1);
      }
    });
    return () => {
      live = false;
    };
  }, [sourceId, run]);

  useEffect(() => {
    if (sourceId === null) return;
    let live = true;
    void run(api.listSourceReferences(sourceId)).then((items) => {
      if (live && items) setRefs({ sourceId, items });
    });
    return () => {
      live = false;
    };
  }, [sourceId, referencesVersion, run]);

  if (sourceId === null) return <EmptySource />;

  const ready = source?.id === sourceId && refs?.sourceId === sourceId;
  if (!ready || !source || !refs) {
    return (
      <main className="min-w-0 px-10 py-16">
        <div className="mx-auto max-w-[68ch] space-y-3">
          {[92, 100, 84, 97, 60].map((w, i) => (
            <div key={i} className="animate-breathe h-3.5 rounded bg-panel" style={{ width: `${w}%` }} />
          ))}
        </div>
      </main>
    );
  }

  const hasPage = source.kind === "pdf" && Boolean(source.filePath) && source.pages.length > 0;

  function showTextForPage(target: number) {
    const range = source?.pages.find((p) => p.page === target);
    if (source && range) reveal(source.id, range.start, range.start);
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-col">
      <SourceHeader
        source={source}
        referenceCount={refs.items.length}
        hasPage={hasPage}
        showPage={showPage}
        onTogglePage={() => setShowPage((v) => !v)}
        showStripes={stripes}
        onToggleStripes={toggleStripes}
      />
      <div className="flex min-h-0 flex-1">
        {hasPage && showPage ? (
          <Suspense fallback={<div className="w-[42%] min-w-[300px] border-r border-line bg-panel/40" />}>
            <PdfPane sourceId={source.id} page={page} pageCount={source.pages.length} onPage={setPage} onShowText={showTextForPage} />
          </Suspense>
        ) : null}
        <SourceViewer key={source.id} source={source} references={refs.items} onCoded={referencesChanged} onPage={setPage} stripes={stripes} />
      </div>
    </main>
  );
}
