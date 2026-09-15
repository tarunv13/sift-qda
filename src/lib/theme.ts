import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

const KEY = "siftqda:theme";
const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const listeners = new Set<() => void>();
let preference: ThemePreference = readPreference();

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function applyToPage() {
  const dark = preference === "dark" || (preference === "system" && darkMedia.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

/** Keeps the native title bar in step with the page; `null` hands control back to Windows. */
function applyToWindow() {
  try {
    void getCurrentWindow()
      .setTheme(preference === "system" ? null : preference)
      .catch(() => undefined);
  } catch {
    // Not running inside Tauri (e.g. a plain browser); the page theme still applies.
  }
}

export function initTheme() {
  applyToPage();
  applyToWindow();
  darkMedia.addEventListener("change", () => {
    if (preference === "system") applyToPage();
  });
}

export function setThemePreference(next: ThemePreference) {
  if (next === preference) return;
  preference = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Unsaved preferences still apply for this session.
  }
  // A short cross-fade between themes where supported; an instant switch otherwise.
  if ("startViewTransition" in document && !reducedMotion.matches) document.startViewTransition(applyToPage);
  else applyToPage();
  applyToWindow();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference);
}
