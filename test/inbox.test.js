import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem, sortInboxNewestFirst } from '../src/inbox.js';

test('addInboxItem captures a trimmed item in state and storage', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const item = addInboxItem(store, '  Buy milk  ');

  assert.equal(item.title, 'Buy milk');
  assert.ok(item.id);
  assert.ok(item.createdAt);
  assert.deepEqual(store.getState().inbox, [item]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).inbox, [item]);
});

test('addInboxItem ignores blank titles', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  assert.equal(addInboxItem(store, '   '), null);
  assert.deepEqual(store.getState().inbox, []);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('captured inbox items persist across store reloads', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Call the dentist');

  const reloaded = createStore(storage);

  assert.deepEqual(reloaded.getState().inbox, [item]);
});

test('sortInboxNewestFirst orders items by createdAt descending', () => {
  const items = [
    { id: 'old', title: 'Old', createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'new', title: 'New', createdAt: '2024-01-02T00:00:00.000Z' },
  ];

  assert.deepEqual(sortInboxNewestFirst(items).map((item) => item.id), ['new', 'old']);
});
