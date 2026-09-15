import { useSyncExternalStore } from "react";

interface Entry {
  /** What undoing reverses, e.g. "coding “Relocation”". */
  label: string;
  revert: () => Promise<unknown>;
}

const LIMIT = 30;
let stack: Entry[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Undo history for coding actions in the open project. */
export const undo = {
  push(label: string, revert: () => Promise<unknown>) {
    stack = [...stack.slice(1 - LIMIT), { label, revert }];
    emit();
  },
  pop(): Entry | undefined {
    const entry = stack[stack.length - 1];
    if (entry) {
      stack = stack.slice(0, -1);
      emit();
    }
    return entry;
  },
  clear() {
    if (stack.length === 0) return;
    stack = [];
    emit();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The label of the action Undo would reverse, or null. */
export function useUndoLabel(): string | null {
  return useSyncExternalStore(subscribe, () => stack[stack.length - 1]?.label ?? null);
}
