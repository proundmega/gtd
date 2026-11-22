import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction } from '../src/clarify.js';
import { clarifyToProject } from '../src/projects.js';
import { clarifyToSomeday, activateSomedayItem } from '../src/someday.js';
import { clarifyToCalendar, reactivateCalendarItem } from '../src/calendar.js';
import {
  DEFAULT_ACTION_PLANNING,
  updateActionPlanning,
} from '../src/actions.js';

function assertDefaultPlanning(action) {
  assert.equal(action.priority, 'medium');
  assert.equal(action.energy, 'medium');
  assert.equal(action.timeMinutes, 15);
}

test('clarifyToNextAction gives new actions the default planning fields', () => {
  const store = createStore(createMemoryStorage());
  const item = addInboxItem(store, 'Call the dentist');

  const action = clarifyToNextAction(store, item.id, '@phone');

  assertDefaultPlanning(action);
  assert.equal(DEFAULT_ACTION_PLANNING.priority, 'medium');
  assert.equal(DEFAULT_ACTION_PLANNING.energy, 'medium');
  assert.equal(DEFAULT_ACTION_PLANNING.timeMinutes, 15);
});

test('clarifyToProject gives the project first action the default planning fields', () => {
  const store = createStore(createMemoryStorage());
  const item = addInboxItem(store, 'Plan the team offsite');

  clarifyToProject(store, item.id, 'Book a venue', '@computer');

  assertDefaultPlanning(store.getState().actions[0]);
});

test('activateSomedayItem gives the activated action the default planning fields', () => {
  const store = createStore(createMemoryStorage());
  const item = addInboxItem(store, 'Learn to sail');
  const someday = clarifyToSomeday(store, item.id);

  const action = activateSomedayItem(store, someday.id, '@errands');

  assertDefaultPlanning(action);
});

test('reactivateCalendarItem gives the reactivated action the default planning fields', () => {
  const store = createStore(createMemoryStorage());
  const item = addInboxItem(store, 'Renew the passport');
  const calendarItem = clarifyToCalendar(store, item.id, '2026-12-01');

  const action = reactivateCalendarItem(store, calendarItem.id, '@errands');

  assertDefaultPlanning(action);
});

test('updateActionPlanning saves edited fields and persists them', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Write the report');
  const action = clarifyToNextAction(store, item.id, '@computer');

  const updated = updateActionPlanning(store, action.id, {
    priority: 'high',
    energy: 'low',
    timeMinutes: 45,
  });

  assert.equal(updated.priority, 'high');
  assert.equal(updated.energy, 'low');
  assert.equal(updated.timeMinutes, 45);
  assert.equal(store.getState().actions[0].priority, 'high');
  assert.equal(store.getState().actions[0].energy, 'low');
  assert.equal(store.getState().actions[0].timeMinutes, 45);

  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(saved.actions[0].priority, 'high');
  assert.equal(saved.actions[0].energy, 'low');
  assert.equal(saved.actions[0].timeMinutes, 45);
});

test('updateActionPlanning rejects invalid planning values', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Write the report');
  const action = clarifyToNextAction(store, item.id, '@computer');

  assert.equal(updateActionPlanning(store, action.id, {
    priority: 'urgent',
    energy: 'low',
    timeMinutes: 45,
  }), null);
  assert.equal(updateActionPlanning(store, action.id, {
    priority: 'high',
    energy: 'extreme',
    timeMinutes: 45,
  }), null);
  assert.equal(updateActionPlanning(store, action.id, {
    priority: 'high',
    energy: 'low',
    timeMinutes: 0,
  }), null);
  assert.equal(updateActionPlanning(store, action.id, {
    priority: 'high',
    energy: 'low',
    timeMinutes: -15,
  }), null);
  assert.equal(updateActionPlanning(store, action.id, {
    priority: 'high',
    energy: 'low',
    timeMinutes: 1.5,
  }), null);
  assert.equal(updateActionPlanning(store, action.id, {
    priority: 'high',
    energy: 'low',
    timeMinutes: 'not-a-number',
  }), null);

  assertDefaultPlanning(store.getState().actions[0]);
});

test('updateActionPlanning returns null for an unknown action', () => {
  const store = createStore(createMemoryStorage());

  assert.equal(updateActionPlanning(store, 'missing', {
    priority: 'high',
    energy: 'low',
    timeMinutes: 30,
  }), null);
  assert.deepEqual(store.getState().actions, []);
});
