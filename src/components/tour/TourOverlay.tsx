import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "../ui/Button";
import { CodingDemo } from "./CodingDemo";
import { cardPosition, spotlightBox, type Box } from "./placement";
import { TOURS } from "./steps";
import { useTour } from "./TourContext";
import "./tour.css";

const CARD_WIDTH = 340;

/** The guided tour: a spotlight that glides between features and a card explaining each one. */
export function TourOverlay() {
  const { active, go, finish } = useTour();
  const step = active ? TOURS[active.id][active.index] : null;
  const card = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cardHeight, setCardHeight] = useState(220);
  const [settled, setSettled] = useState(false);

  // Follow the target through scrolling, resizing and layout changes.
  useEffect(() => {
    if (!step) return setSettled(false);
    const element = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    element?.scrollIntoView({ block: "nearest" });
    const measure = () => {
      setView({ width: window.innerWidth, height: window.innerHeight });
      setBox(element?.isConnected ? spotlightBox(element.getBoundingClientRect()) : null);
    };
    measure();
    const frame = requestAnimationFrame(() => setSettled(true));
    const observer = new ResizeObserver(measure);
    if (element) observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [step]);

  useLayoutEffect(() => {
    if (card.current) setCardHeight(card.current.offsetHeight);
    card.current?.querySelector<HTMLButtonElement>("[data-tour-next]")?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (!active) return;
    const last = active.index === TOURS[active.id].length - 1;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      else if (event.key === "ArrowRight") (last ? finish : () => go(active.index + 1))();
      else if (event.key === "ArrowLeft") go(active.index - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go, finish]);

  if (!active || !step) return null;
  const steps = TOURS[active.id];
  const last = active.index === steps.length - 1;
  const pos = cardPosition(box, step.placement, { width: CARD_WIDTH, height: cardHeight }, view);
  const spot = box ?? { top: view.height / 2, left: view.width / 2, width: 0, height: 0 };

  return (
    <div className="animate-fade fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div
        aria-hidden="true"
        className="tour-spotlight absolute top-0 left-0 rounded-xl"
        data-empty={box ? undefined : ""}
        data-settled={settled ? "" : undefined}
        style={{ width: spot.width, height: spot.height, transform: `translate3d(${spot.left}px, ${spot.top}px, 0)` }}
      />
      <div
        ref={card}
        className="tour-card absolute top-0 left-0 rounded-2xl border border-line bg-surface p-5 shadow-xl"
        data-settled={settled ? "" : undefined}
        style={{ width: CARD_WIDTH, transform: `translate3d(${pos.left}px, ${pos.top}px, 0)` }}
      >
        <div key={`${active.id}-${active.index}`} className="animate-pop">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {active.index + 1} of {steps.length}
          </p>
          <h2 id="tour-title" className="font-reading mt-1.5 text-xl leading-snug text-ink">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          {step.demo === "coding" ? <CodingDemo /> : null}
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-300 ease-out-expo"
            style={{ width: `${((active.index + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          {last ? null : (
            <Button size="sm" variant="ghost" onClick={finish}>
              Skip tour
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {active.index > 0 ? (
              <Button size="sm" onClick={() => go(active.index - 1)}>
                Back
              </Button>
            ) : null}
            <Button size="sm" variant="primary" data-tour-next="" onClick={last ? finish : () => go(active.index + 1)}>
              {last ? "Start working" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
