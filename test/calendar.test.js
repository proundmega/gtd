import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import {
  clarifyToCalendar,
  countScheduled,
  groupCalendarItems,
  reactivateCalendarItem,
} from '../src/calendar.js';

test('clarifyToCalendar defers an inbox item to a valid date', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Renew the passport');

  const calendarItem = clarifyToCalendar(store, item.id, '2026-12-01');
  const state = store.getState();

  assert.ok(calendarItem.id);
  assert.equal(calendarItem.title, 'Renew the passport');
  assert.equal(calendarItem.deferDate, '2026-12-01');
  assert.equal(calendarItem.status, 'scheduled');
  assert.ok(calendarItem.createdAt);
  assert.deepEqual(state.inbox, []);
  assert.deepEqual(state.calendar, [calendarItem]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).calendar, [calendarItem]);
});

test('clarifyToCalendar rejects missing or invalid dates and keeps the item in the inbox', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Renew the passport');

  assert.equal(clarifyToCalendar(store, item.id, ''), null);
  assert.equal(clarifyToCalendar(store, item.id, '   '), null);
  assert.equal(clarifyToCalendar(store, item.id, 'not-a-date'), null);
  assert.equal(clarifyToCalendar(store, item.id, '2026-13-01'), null);
  assert.equal(clarifyToCalendar(store, item.id, '2026-02-30'), null);
  assert.equal(clarifyToCalendar(store, item.id, '12/01/2026'), null);

  assert.deepEqual(store.getState().inbox, [item]);
  assert.deepEqual(store.getState().calendar, []);
});

test('groupCalendarItems splits scheduled items into today, upcoming and overdue', () => {
  const items = [
    { id: 'overdue', deferDate: '2026-05-14', status: 'scheduled' },
    { id: 'today', deferDate: '2026-05-15', status: 'scheduled' },
    { id: 'upcoming', deferDate: '2026-05-16', status: 'scheduled' },
    { id: 'later', deferDate: '2026-06-01', status: 'scheduled' },
  ];

  const groups = groupCalendarItems(items, '2026-05-15');

  assert.deepEqual(groups.overdue.map((item) => item.id), ['overdue']);
  assert.deepEqual(groups.today.map((item) => item.id), ['today']);
  assert.deepEqual(groups.upcoming.map((item) => item.id), ['upcoming', 'later']);
});

test('reactivateCalendarItem moves a scheduled item to active actions with a context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Renew the passport');
  const calendarItem = clarifyToCalendar(store, item.id, '2026-12-01');

  const action = reactivateCalendarItem(store, calendarItem.id, '@errands');
  const state = store.getState();

  assert.ok(action.id);
  assert.equal(action.title, 'Renew the passport');
  assert.equal(action.context, '@errands');
  assert.equal(action.status, 'active');
  assert.equal(action.projectId, null);
  assert.ok(action.createdAt);
  assert.deepEqual(state.calendar, []);
  assert.deepEqual(state.actions, [action]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).actions, [action]);
});

test('reactivateCalendarItem rejects an invalid context and keeps the item scheduled', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Renew the passport');
  const calendarItem = clarifyToCalendar(store, item.id, '2026-12-01');

  assert.equal(reactivateCalendarItem(store, calendarItem.id, ''), null);
  assert.equal(reactivateCalendarItem(store, calendarItem.id, '   '), null);
  assert.equal(reactivateCalendarItem(store, calendarItem.id, '@not-a-context'), null);

  assert.deepEqual(store.getState().calendar, [calendarItem]);
  assert.deepEqual(store.getState().actions, []);
});

test('countScheduled counts items still scheduled on the calendar', () => {
  const items = [
    { id: 'one', status: 'scheduled' },
    { id: 'two', status: 'scheduled' },
    { id: 'three', status: 'reactivated' },
  ];

  assert.equal(countScheduled(items), 2);
});
