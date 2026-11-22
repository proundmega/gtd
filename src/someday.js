import { nextId } from './store.js';
import { DEFAULT_ACTION_PLANNING } from './actions.js';

function findInboxItem(state, itemId) {
  return state.inbox.find((item) => item.id === itemId) ?? null;
}

function findSomedayItem(state, itemId) {
  return state.someday.find((item) => item.id === itemId) ?? null;
}

export function clarifyToSomeday(store, itemId) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
  if (!item) return null;

  const someday = {
    id: nextId('someday'),
    title: item.title,
    status: 'someday',
    createdAt: new Date().toISOString(),
  };

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    draft.someday.unshift(someday);
    return draft;
  });

  return someday;
}

export function activateSomedayItem(store, itemId, context) {
  const state = store.getState();
  const item = findSomedayItem(state, itemId);
  if (!item) return null;

  const selected = String(context ?? '').trim();
  if (!selected || !state.settings.contexts.includes(selected)) return null;

  const action = {
    id: nextId('action'),
    title: item.title,
    context: selected,
    status: 'active',
    createdAt: new Date().toISOString(),
    projectId: null,
    ...DEFAULT_ACTION_PLANNING,
  };

  store.update((draft) => {
    draft.someday = draft.someday.filter((candidate) => candidate.id !== itemId);
    draft.actions.unshift(action);
    return draft;
  });

  return action;
}

export function countOpenSomeday(items) {
  return items.filter((item) => item.status === 'someday').length;
}
