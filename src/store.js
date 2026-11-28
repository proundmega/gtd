import { DEFAULT_THEME, normalizeTheme } from './theme.js';

export const STORAGE_KEY = 'gtd-planner-v1';

export const DEFAULT_CONTEXTS = ['@computer', '@phone', '@errands', '@home', '@agenda'];

export function emptyState() {
  return {
    inbox: [],
    actions: [],
    projects: [],
    waiting: [],
    someday: [],
    reference: [],
    calendar: [],
    areas: [],
    goals: [],
    reviews: [],
    settings: {
      contexts: [...DEFAULT_CONTEXTS],
      theme: DEFAULT_THEME,
      lastReviewAt: null,
      purpose: '',
      principles: '',
      vision: '',
    },
  };
}

export function createMemoryStorage(seed = null) {
  let value = seed;
  return {
    getItem: () => value,
    setItem: (_key, next) => { value = next; },
  };
}

export function createStore(storage = globalThis.localStorage) {
  let state = emptyState();
  const listeners = new Set();

  const raw = storage?.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const mergedSettings = { ...state.settings, ...(parsed.settings || {}) };
      mergedSettings.theme = normalizeTheme(mergedSettings.theme) ?? DEFAULT_THEME;
      state = { ...state, ...parsed, settings: mergedSettings };
    } catch {
      state = emptyState();
    }
  }

  function persist() {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(mutator) {
      const next = mutator(structuredClone(state)) ?? state;
      state = next;
      persist();
      listeners.forEach((listener) => listener(state));
      return state;
    },
    reset() {
      state = emptyState();
      persist();
      listeners.forEach((listener) => listener(state));
      return state;
    },
  };
}

export function nextId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
