import { nextId } from './store.js';

export function addInboxItem(store, title) {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) return null;

  const item = {
    id: nextId('inbox'),
    title: trimmed,
    createdAt: new Date().toISOString(),
  };

  store.update((state) => {
    state.inbox.unshift(item);
    return state;
  });

  return item;
}

export function sortInboxNewestFirst(items) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}
