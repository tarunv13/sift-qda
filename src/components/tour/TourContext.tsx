import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { TOURS, type TourId } from "./steps";

interface ActiveTour {
  id: TourId;
  index: number;
}

interface TourState {
  active: ActiveTour | null;
  start: (id: TourId) => void;
  go: (index: number) => void;
  finish: () => void;
  close: (id: TourId) => void;
}

const Context = createContext<TourState | null>(null);
const doneKey = (id: TourId) => `siftqda:tour:${id}:done`;

function markDone(id: TourId) {
  try {
    localStorage.setItem(doneKey(id), "1");
  } catch {
    // Storage can be unavailable; the tour simply shows again next time.
  }
}

function isDone(id: TourId): boolean {
  try {
    return localStorage.getItem(doneKey(id)) === "1";
  } catch {
    return true;
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTour | null>(null);

  const start = useCallback((id: TourId) => {
    setActive((prev) => {
      if (prev && prev.id !== id) markDone(prev.id);
      return { id, index: 0 };
    });
  }, []);

  const go = useCallback((index: number) => {
    setActive((prev) => (prev ? { ...prev, index: Math.max(0, Math.min(index, TOURS[prev.id].length - 1)) } : prev));
  }, []);

  const finish = useCallback(() => {
    setActive((prev) => {
      if (prev) markDone(prev.id);
      return null;
    });
  }, []);

  /** Ends a tour whose screen has gone away (e.g. a project was opened mid-tour). */
  const close = useCallback((id: TourId) => {
    setActive((prev) => {
      if (prev?.id !== id) return prev;
      markDone(id);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ active, start, go, finish, close }), [active, start, go, finish, close]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTour(): TourState {
  const state = useContext(Context);
  if (!state) throw new Error("useTour must be used inside TourProvider");
  return state;
}

/** Starts a screen's tour the first time that screen appears, once its entrance animation settles. */
export function useFirstRunTour(id: TourId) {
  const { start, close } = useTour();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!isDone(id)) start(id);
    }, 700);
    return () => {
      window.clearTimeout(timer);
      close(id);
    };
  }, [id, start, close]);
}
