import { nextId } from './store.js';

export { clarifyToProject } from './projects.js';

function findInboxItem(state, itemId) {
  return state.inbox.find((item) => item.id === itemId) ?? null;
}

export function clarifyToNextAction(store, itemId, context) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
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
  };

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    draft.actions.unshift(action);
    return draft;
  });

  return action;
}

export function trashInboxItem(store, itemId) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
  if (!item) return null;

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    return draft;
  });

  return item;
}
