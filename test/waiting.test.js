import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToWaiting, markWaitingReceived } from '../src/waiting.js';

test('clarifyToWaiting moves an inbox item into waiting with a delegate and follow-up date', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Get the vendor quote');

  const waiting = clarifyToWaiting(store, item.id, '  Dana  ', '2026-12-01');
  const state = store.getState();

  assert.ok(waiting.id);
  assert.equal(waiting.title, 'Get the vendor quote');
  assert.equal(waiting.person, 'Dana');
  assert.equal(waiting.followUpDate, '2026-12-01');
  assert.equal(waiting.status, 'waiting');
  assert.ok(waiting.createdAt);
  assert.deepEqual(state.inbox, []);
  assert.deepEqual(state.waiting, [waiting]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).waiting, [waiting]);
});

test('clarifyToWaiting stores a null follow-up date when none is provided', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Wait for the plumber');

  const waiting = clarifyToWaiting(store, item.id, 'Plumber', '');

  assert.equal(waiting.followUpDate, null);
  assert.deepEqual(store.getState().waiting, [waiting]);
  assert.deepEqual(store.getState().inbox, []);
});

test('clarifyToWaiting rejects an item without a person', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Get the vendor quote');

  assert.equal(clarifyToWaiting(store, item.id, '', '2026-12-01'), null);
  assert.equal(clarifyToWaiting(store, item.id, '   ', '2026-12-01'), null);

  assert.deepEqual(store.getState().inbox, [item]);
  assert.deepEqual(store.getState().waiting, []);
});

test('markWaitingReceived marks a waiting item as received', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Get the vendor quote');
  const waiting = clarifyToWaiting(store, item.id, 'Dana', null);

  const received = markWaitingReceived(store, waiting.id);

  assert.equal(received.status, 'received');
  assert.equal(store.getState().waiting[0].status, 'received');
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).waiting[0], received);
});
