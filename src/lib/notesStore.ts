import { useSyncExternalStore } from "react";

/** A selected stretch of a source. */
export interface PassageRef {
  sourceId: number;
  start: number;
  end: number;
  text: string;
}

interface NotesState {
  /** A passage waiting for its annotation text. */
  compose: PassageRef | null;
  /** The first passage of a link, waiting for the second. */
  linkFrom: PassageRef | null;
  /** Bumped after any annotation or link change so lists reload. */
  version: number;
}

let state: NotesState = { compose: null, linkFrom: null, version: 0 };
const listeners = new Set<() => void>();

function set(patch: Partial<NotesState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/** Annotation and link actions started from a text selection and finished in the Notes tab. */
export const notes = {
  compose: (passage: PassageRef) => set({ compose: passage }),
  cancelCompose: () => set({ compose: null }),
  startLink: (passage: PassageRef) => set({ linkFrom: passage }),
  cancelLink: () => set({ linkFrom: null }),
  changed: () => set({ version: state.version + 1 }),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNotes(): NotesState {
  return useSyncExternalStore(subscribe, () => state);
}
