import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, emptyState, STORAGE_KEY } from '../src/store.js';

test('empty state has every GTD list', () => {
  const state = emptyState();
  for (const key of ['inbox', 'actions', 'projects', 'waiting', 'someday', 'reference', 'calendar', 'areas', 'reviews']) {
    assert.ok(Array.isArray(state[key]), `${key} should be an array`);
  }
});

test('store persists updates and notifies subscribers', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  let calls = 0;
  store.subscribe(() => { calls += 1; });
  store.update((state) => {
    state.inbox.push({ id: '1', title: 'Capture this' });
    return state;
  });
  assert.equal(calls, 1);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).inbox[0].title, 'Capture this');
});

test('store survives malformed saved data', () => {
  const storage = createMemoryStorage('{not json');
  const store = createStore(storage);
  assert.deepEqual(store.getState().inbox, []);
});
