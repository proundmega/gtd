import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToSomeday, activateSomedayItem, countOpenSomeday } from '../src/someday.js';

test('clarifyToSomeday moves an inbox item into someday', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Learn to sail');

  const someday = clarifyToSomeday(store, item.id);
  const state = store.getState();

  assert.ok(someday.id);
  assert.equal(someday.title, 'Learn to sail');
  assert.equal(someday.status, 'someday');
  assert.ok(someday.createdAt);
  assert.deepEqual(state.inbox, []);
  assert.deepEqual(state.someday, [someday]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).someday, [someday]);
});

test('activateSomedayItem moves a someday item into active actions with a context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Learn to sail');
  const someday = clarifyToSomeday(store, item.id);

  const action = activateSomedayItem(store, someday.id, '@errands');
  const state = store.getState();

  assert.ok(action.id);
  assert.equal(action.title, 'Learn to sail');
  assert.equal(action.context, '@errands');
  assert.equal(action.status, 'active');
  assert.equal(action.projectId, null);
  assert.ok(action.createdAt);
  assert.deepEqual(state.someday, []);
  assert.deepEqual(state.actions, [action]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).actions, [action]);
});

test('activateSomedayItem rejects activation without a valid context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Learn to sail');
  const someday = clarifyToSomeday(store, item.id);

  assert.equal(activateSomedayItem(store, someday.id, ''), null);
  assert.equal(activateSomedayItem(store, someday.id, '   '), null);
  assert.equal(activateSomedayItem(store, someday.id, '@not-a-context'), null);

  assert.deepEqual(store.getState().someday, [someday]);
  assert.deepEqual(store.getState().actions, []);
});

test('countOpenSomeday counts items still parked in someday', () => {
  const items = [
    { id: 'one', status: 'someday' },
    { id: 'two', status: 'someday' },
    { id: 'three', status: 'activated' },
  ];

  assert.equal(countOpenSomeday(items), 2);
});
