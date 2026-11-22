import { nextId } from './store.js';

function findInboxItem(state, itemId) {
  return state.inbox.find((item) => item.id === itemId) ?? null;
}

export function clarifyToReference(store, itemId, note) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
  if (!item) return null;

  const trimmedNote = String(note ?? '').trim();
  if (!trimmedNote) return null;

  const reference = {
    id: nextId('reference'),
    title: item.title,
    note: trimmedNote,
    status: 'reference',
    createdAt: new Date().toISOString(),
  };

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    draft.reference.unshift(reference);
    return draft;
  });

  return reference;
}

export function countReference(items) {
  return items.filter((item) => item.status === 'reference').length;
}
