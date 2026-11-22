import { nextId } from './store.js';
import { DEFAULT_ACTION_PLANNING } from './actions.js';

function findInboxItem(state, itemId) {
  return state.inbox.find((item) => item.id === itemId) ?? null;
}

function findCalendarItem(state, itemId) {
  return state.calendar.find((item) => item.id === itemId) ?? null;
}

export function isValidDeferDate(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clarifyToCalendar(store, itemId, deferDate) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
  if (!item) return null;

  const trimmedDate = String(deferDate ?? '').trim();
  if (!isValidDeferDate(trimmedDate)) return null;

  const calendarItem = {
    id: nextId('calendar'),
    title: item.title,
    deferDate: trimmedDate,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    draft.calendar.unshift(calendarItem);
    return draft;
  });

  return calendarItem;
}

export function reactivateCalendarItem(store, itemId, context) {
  const state = store.getState();
  const item = findCalendarItem(state, itemId);
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
    draft.calendar = draft.calendar.filter((candidate) => candidate.id !== itemId);
    draft.actions.unshift(action);
    return draft;
  });

  return action;
}

export function countScheduled(items) {
  return items.filter((item) => item.status === 'scheduled').length;
}

export function groupCalendarItems(items, today = localDateString()) {
  const referenceDate = typeof today === 'string' ? today : localDateString(today);
  const groups = { today: [], upcoming: [], overdue: [] };

  const sorted = [...items].sort((a, b) => {
    const dateOrder = String(a.deferDate ?? '').localeCompare(String(b.deferDate ?? ''));
    if (dateOrder !== 0) return dateOrder;
    return (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
  });

  sorted.forEach((item) => {
    if (!item.deferDate) return;
    if (item.deferDate < referenceDate) {
      groups.overdue.push(item);
    } else if (item.deferDate > referenceDate) {
      groups.upcoming.push(item);
    } else {
      groups.today.push(item);
    }
  });

  return groups;
}

export const countCalendarItems = countScheduled;
export const countCalendar = countScheduled;
export const isValidDate = isValidDeferDate;
export const groupByDeferDate = groupCalendarItems;
export const groupCalendarByDeferDate = groupCalendarItems;
export const groupCalendar = groupCalendarItems;
