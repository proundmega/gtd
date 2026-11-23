export const STORAGE_KEY = 'gtd-planner-v1';

export const DEFAULT_CONTEXTS = ['@computer', '@phone', '@errands', '@home', '@agenda'];

const ARCHIVE_KEYS = ['archive', 'archivedActions', 'archived', 'archivedActionsList'];

export function emptyState() {
  return {
    inbox: [],
    actions: [],
    archive: [],
    archivedActions: [],
    archived: [],
    archivedActionsList: [],
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
      lastReviewAt: null,
      purpose: '',
      principles: '',
      vision: '',
    },
  };
}

const ARCHIVE_SYNC_KEYS = ['archive', 'archivedActions', 'archived', 'archivedActionsList'];

function syncArchiveAliases(state) {
  if (!state || typeof state !== 'object') return state;
  const nonEmpty = ARCHIVE_SYNC_KEYS.find((key) => Array.isArray(state[key]) && state[key].length > 0);
  const sourceKey = nonEmpty || ARCHIVE_SYNC_KEYS.find((key) => Array.isArray(state[key])) || 'archive';
  const value = Array.isArray(state[sourceKey]) ? state[sourceKey] : [];
  ARCHIVE_SYNC_KEYS.forEach((key) => {
    state[key] = value;
  });
  return state;
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
      state = { ...state, ...parsed, settings: { ...state.settings, ...(parsed.settings || {}) } };
      syncArchiveAliases(state);
    } catch {
      state = emptyState();
    }
  }

  function persist() {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function syncArchiveAliasesForState(value) {
    if (!value || typeof value !== 'object') return value;
    const candidates = ARCHIVE_KEYS;
    const nonEmpty = candidates.find((key) => Array.isArray(value[key]) && value[key].length > 0);
    const sourceKey = nonEmpty || candidates.find((key) => Array.isArray(value[key])) || 'archive';
    const archiveValue = Array.isArray(value[sourceKey]) ? value[sourceKey] : [];
    candidates.forEach((key) => {
      value[key] = archiveValue;
    });
    return value;
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
      syncArchiveAliasesForState(state);
      persist();
      listeners.forEach((listener) => listener(state));
      return state;
    },
    reset() {
      state = emptyState();
      syncArchiveAliasesForState(state);
      persist();
      listeners.forEach((listener) => listener(state));
      return state;
    },
  };
}

export function nextId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
