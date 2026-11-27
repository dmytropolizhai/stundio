/**
 * `HistoryAdapter` implementations: the real browser History API and an in-memory twin for
 * deterministic tests.
 */
import type { HistoryAdapter } from "./types.ts";

export const browserHistory: HistoryAdapter = {
  getPathname: () => window.location.pathname,
  getSearch: () => window.location.search,
  push: (url) => {
    window.history.pushState(null, "", url);
  },
  replace: (url) => {
    window.history.replaceState(null, "", url);
  },
  subscribe: (listener) => {
    window.addEventListener("popstate", listener);
    return () => {
      window.removeEventListener("popstate", listener);
    };
  },
};

export type MemoryHistory = HistoryAdapter & {
  /** All recorded entries in stack order (for assertions). */
  entries: () => readonly string[];
  /** Simulates a browser Back navigation (fires subscribers). */
  back: () => void;
  /** Simulates a browser Forward navigation (fires subscribers). */
  forward: () => void;
  /** Simulates an external URL jump (like typing in the address bar + popstate). */
  navigate: (url: string) => void;
};

const splitUrl = (url: string): { pathname: string; search: string } => {
  const q = url.indexOf("?");
  if (q === -1) return { pathname: url, search: "" };
  return { pathname: url.slice(0, q), search: url.slice(q) };
};

export const createMemoryHistory = (initialUrl = "/"): MemoryHistory => {
  const stack: string[] = [initialUrl];
  let index = 0;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    getPathname: () => splitUrl(stack[index] ?? "/").pathname,
    getSearch: () => splitUrl(stack[index] ?? "/").search,
    push: (url) => {
      stack.splice(index + 1);
      stack.push(url);
      index = stack.length - 1;
    },
    replace: (url) => {
      stack[index] = url;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    entries: () => [...stack],
    back: () => {
      if (index === 0) return;
      index -= 1;
      emit();
    },
    forward: () => {
      if (index >= stack.length - 1) return;
      index += 1;
      emit();
    },
    navigate: (url) => {
      stack.splice(index + 1);
      stack.push(url);
      index = stack.length - 1;
      emit();
    },
  };
};
