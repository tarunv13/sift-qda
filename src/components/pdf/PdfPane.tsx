import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { api } from "../../lib/api";
import { useProject } from "../../state/ProjectContext";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface Props {
  sourceId: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  onShowText: (page: number) => void;
}

/** Renders the original PDF page; text for coding comes from the Rust extractor. */
export function PdfPane({ sourceId, page, pageCount, onPage, onShowText }: Props) {
  const { run } = useProject();
  const [file, setFile] = useState<{ data: Uint8Array } | null>(null);
  const [width, setWidth] = useState(360);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setFile(null);
    void run(api.readSourceBytes(sourceId)).then((buffer) => {
      if (live && buffer) setFile({ data: new Uint8Array(buffer) });
    });
    return () => {
      live = false;
    };
  }, [sourceId, run]);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, Math.floor(entry.contentRect.width) - 32)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placeholder = <div className="animate-breathe aspect-[1/1.3] w-full rounded-md bg-panel" />;

  return (
    <section ref={box} className="animate-slide-panel flex w-[42%] min-w-[300px] flex-col border-r border-line bg-panel/40">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2 text-xs text-muted">
        <Button size="icon" variant="ghost" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="back" size={14} />
        </Button>
        <span className="min-w-16 text-center tabular-nums">
          {page} / {pageCount}
        </span>
        <Button size="icon" variant="ghost" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <Icon name="chevron" size={14} />
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onShowText(page)}>
          Find this page in the text
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {file ? (
          <Document file={file} loading={placeholder} error={<p className="p-4 text-sm text-danger">This PDF could not be displayed.</p>}>
            <Page
              key={page}
              pageNumber={page}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={placeholder}
              className="animate-rise overflow-hidden rounded-md shadow-md"
            />
          </Document>
        ) : (
          placeholder
        )}
      </div>
    </section>
  );
}
