import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToReference, countReference } from '../src/reference.js';

test('clarifyToReference files an inbox item into reference with a note', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Warranty receipt');

  const reference = clarifyToReference(store, item.id, '  Keep until the warranty expires  ');
  const state = store.getState();

  assert.ok(reference.id);
  assert.equal(reference.title, 'Warranty receipt');
  assert.equal(reference.note, 'Keep until the warranty expires');
  assert.equal(reference.status, 'reference');
  assert.ok(reference.createdAt);
  assert.deepEqual(state.inbox, []);
  assert.deepEqual(state.reference, [reference]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).reference, [reference]);
});

test('clarifyToReference rejects an item without a note', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Warranty receipt');

  assert.equal(clarifyToReference(store, item.id, ''), null);
  assert.equal(clarifyToReference(store, item.id, '   '), null);

  assert.deepEqual(store.getState().inbox, [item]);
  assert.deepEqual(store.getState().reference, []);
});

test('countReference counts reference items', () => {
  const items = [
    { id: 'one', status: 'reference' },
    { id: 'two', status: 'reference' },
    { id: 'three', status: 'archived' },
  ];

  assert.equal(countReference(items), 2);
});
