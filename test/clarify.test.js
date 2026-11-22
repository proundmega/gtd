import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction, trashInboxItem } from '../src/clarify.js';

test('clarifyToNextAction moves an inbox item into active actions', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Call the dentist');

  const action = clarifyToNextAction(store, item.id, '@phone');

  assert.ok(action.id);
  assert.equal(action.title, 'Call the dentist');
  assert.equal(action.context, '@phone');
  assert.equal(action.status, 'active');
  assert.ok(action.createdAt);
  assert.equal(action.projectId, null);
  assert.deepEqual(store.getState().inbox, []);
  assert.deepEqual(store.getState().actions, [action]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).actions, [action]);
});

test('trashInboxItem removes an item from the inbox', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Old receipt');

  const trashed = trashInboxItem(store, item.id);

  assert.deepEqual(trashed, item);
  assert.deepEqual(store.getState().inbox, []);
  assert.deepEqual(store.getState().actions, []);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).inbox, []);
});

test('clarifyToNextAction rejects an item without a context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Someday maybe');

  assert.equal(clarifyToNextAction(store, item.id, ''), null);
  assert.equal(clarifyToNextAction(store, item.id, '   '), null);
  assert.equal(clarifyToNextAction(store, item.id, '@not-a-context'), null);
  assert.deepEqual(store.getState().inbox, [item]);
  assert.deepEqual(store.getState().actions, []);
});
