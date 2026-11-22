import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, emptyState, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction } from '../src/clarify.js';
import { addArea } from '../src/areas.js';
import { addGoal } from '../src/horizons.js';
import {
  BACKUP_FILENAME,
  applyBackup,
  exportBackup,
  getBackupError,
  importBackup,
  parseBackup,
  tryImportBackup,
  validateBackup,
} from '../src/backup.js';

function populatedState() {
  return {
    ...emptyState(),
    inbox: [{ id: 'inbox-1', title: 'Captured thought', createdAt: '2026-01-01T00:00:00.000Z' }],
    actions: [{
      id: 'action-1',
      title: 'Do the thing',
      context: '@computer',
      status: 'active',
      priority: 'high',
      energy: 'low',
      timeMinutes: 30,
      createdAt: '2026-01-01T00:00:00.000Z',
    }],
    projects: [{
      id: 'project-1',
      title: 'Finish the thing',
      outcome: 'It is done',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    }],
    waiting: [{ id: 'waiting-1', title: 'Waiting on a reply', person: 'Sam', status: 'waiting' }],
    someday: [{ id: 'someday-1', title: 'Learn to sail', status: 'someday' }],
    reference: [{ id: 'reference-1', title: 'Receipt', note: 'Keep it', status: 'reference' }],
    calendar: [{ id: 'calendar-1', title: 'Renew', deferDate: '2026-12-01', status: 'scheduled' }],
    areas: [{ id: 'area-1', name: 'Health', description: 'Stay well' }],
    goals: [{ id: 'goal-1', title: 'Run a race', description: 'Finish strong' }],
    reviews: [],
    settings: {
      ...emptyState().settings,
      purpose: 'Live well',
      vision: 'A calm life',
    },
  };
}

test('backup filename is stable', () => {
  assert.equal(BACKUP_FILENAME, 'gtd-planner-backup.json');
});

test('export and import roundtrip preserves the full state', () => {
  const state = populatedState();
  const json = exportBackup(state);

  assert.equal(typeof json, 'string');
  assert.deepEqual(JSON.parse(json), state);
  assert.deepEqual(importBackup(json), state);
  assert.deepEqual(parseBackup(json), state);
  assert.deepEqual(importBackup(JSON.stringify(state)), state);
});

test('export works directly against a store', () => {
  const store = createStore(createMemoryStorage());
  addInboxItem(store, 'From the store');

  assert.deepEqual(JSON.parse(exportBackup(store)), store.getState());
});

test('valid backups pass validation', () => {
  const json = exportBackup(populatedState());

  assert.equal(validateBackup(json), true);
  assert.equal(validateBackup(populatedState()), true);
  assert.equal(getBackupError(json), '');
});

test('malformed JSON is rejected without changing the current state', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  addInboxItem(store, 'Keep me');
  addArea(store, 'Work');
  addGoal(store, 'Ship it');
  clarifyToNextAction(store, store.getState().inbox[0].id, '@computer');
  const before = structuredClone(store.getState());
  const persistedBefore = storage.getItem(STORAGE_KEY);

  assert.equal(importBackup('{not json'), null);
  assert.equal(importBackup(''), null);
  assert.throws(() => parseBackup('{not json'));
  assert.equal(validateBackup('{not json'), false);
  assert.deepEqual(store.getState(), before);
  assert.equal(storage.getItem(STORAGE_KEY), persistedBefore);

  const result = tryImportBackup('{not json');
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.deepEqual(store.getState(), before);
});

test('wrong backup shapes are rejected and leave the state untouched', () => {
  const store = createStore(createMemoryStorage());
  addInboxItem(store, 'Keep me');
  const before = structuredClone(store.getState());

  const invalidBackups = [
    'null',
    '[]',
    '"text"',
    JSON.stringify({ inbox: [] }),
    JSON.stringify({ ...emptyState(), inbox: {} }),
    JSON.stringify({ ...emptyState(), projects: 'nope' }),
    JSON.stringify({ ...emptyState(), settings: [] }),
  ];

  invalidBackups.forEach((backup) => {
    assert.equal(importBackup(backup), null, backup);
    assert.equal(validateBackup(backup), false, backup);
  });

  assert.deepEqual(store.getState(), before);
});

test('a validated import can replace the entire store state', () => {
  const store = createStore(createMemoryStorage());
  addInboxItem(store, 'Old item');
  const replacement = populatedState();

  const imported = applyBackup(store, exportBackup(replacement));

  assert.deepEqual(imported, replacement);
  assert.deepEqual(store.getState(), replacement);
});
