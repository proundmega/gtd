import { nextId } from './store.js';

function findInboxItem(state, itemId) {
  return state.inbox.find((item) => item.id === itemId) ?? null;
}

export function clarifyToWaiting(store, itemId, person, followUpDate) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
  if (!item) return null;

  const trimmedPerson = String(person ?? '').trim();
  if (!trimmedPerson) return null;

  const trimmedFollowUp = String(followUpDate ?? '').trim();
  const waiting = {
    id: nextId('waiting'),
    title: item.title,
    person: trimmedPerson,
    followUpDate: trimmedFollowUp || null,
    status: 'waiting',
    createdAt: new Date().toISOString(),
  };

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    draft.waiting.unshift(waiting);
    return draft;
  });

  return waiting;
}

export function markWaitingReceived(store, itemId) {
  const state = store.getState();
  const item = state.waiting.find((candidate) => candidate.id === itemId);
  if (!item) return null;

  const updated = { ...item, status: 'received' };

  store.update((draft) => {
    draft.waiting = draft.waiting.map((candidate) => (
      candidate.id === itemId ? updated : candidate
    ));
    return draft;
  });

  return updated;
}

export function countOpenWaiting(items) {
  return items.filter((item) => item.status === 'waiting').length;
}
