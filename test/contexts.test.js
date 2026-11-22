import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, emptyState, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction } from '../src/clarify.js';
import { completeAction } from '../src/actions.js';
import {
  addContext,
  buildContexts,
  countActionsForContext,
  listContexts,
  removeContext,
} from '../src/contexts.js';

test('empty state includes the default contexts', () => {
  const state = emptyState();

  assert.deepEqual(state.settings.contexts, [
    '@computer',
    '@phone',
    '@errands',
    '@home',
    '@agenda',
  ]);
});

test('addContext trims, stores and persists a new context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const added = addContext(store, '  @work  ');

  assert.equal(added, '@work');
  assert.deepEqual(
    store.getState().settings.contexts,
    [...emptyState().settings.contexts, '@work'],
  );
  assert.deepEqual(
    JSON.parse(storage.getItem(STORAGE_KEY)).settings.contexts,
    [...emptyState().settings.contexts, '@work'],
  );
});

test('addContext rejects empty and duplicate contexts', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  addContext(store, '@work');
  const before = [...store.getState().settings.contexts];

  assert.equal(addContext(store, ''), null);
  assert.equal(addContext(store, '   '), null);
  assert.equal(addContext(store, '@computer'), null);
  assert.equal(addContext(store, '  @computer  '), null);
  assert.equal(addContext(store, '@Computer'), null);
  assert.equal(addContext(store, '@work'), null);

  assert.deepEqual(store.getState().settings.contexts, before);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).settings.contexts, before);
});

test('countActionsForContext counts only active actions using the context', () => {
  const store = createStore(createMemoryStorage());
  const first = clarifyToNextAction(store, addInboxItem(store, 'Call the dentist').id, '@phone');
  clarifyToNextAction(store, addInboxItem(store, 'Book a table').id, '@phone');
  const done = clarifyToNextAction(store, addInboxItem(store, 'Call the bank').id, '@phone');
  completeAction(store, done.id);
  clarifyToNextAction(store, addInboxItem(store, 'Buy milk').id, '@errands');

  const actions = store.getState().actions;

  assert.equal(countActionsForContext('@phone', actions), 2);
  assert.equal(countActionsForContext('@errands', actions), 1);
  assert.equal(countActionsForContext('@home', actions), 0);
  assert.equal(countActionsForContext('missing', actions), 0);
  assert.equal(countActionsForContext(actions, '@phone'), 2);
  assert.ok(first);

  const usage = buildContexts(store);
  const byContext = Object.fromEntries(usage.map((entry) => [entry.context, entry.count]));
  assert.equal(byContext['@phone'], 2);
  assert.equal(byContext['@errands'], 1);
  assert.equal(byContext['@computer'], 0);
});

test('removeContext removes and persists an unused context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const removed = removeContext(store, '  @errands  ');

  assert.equal(removed, '@errands');
  assert.equal(store.getState().settings.contexts.includes('@errands'), false);
  assert.equal(listContexts(store).includes('@errands'), false);
  assert.equal(
    JSON.parse(storage.getItem(STORAGE_KEY)).settings.contexts.includes('@errands'),
    false,
  );
  assert.equal(removeContext(store, '@missing'), null);
});

test('removeContext rejects a context used by an active action', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const added = addContext(store, '@work');
  clarifyToNextAction(store, addInboxItem(store, 'Write the report').id, added);
  const before = structuredClone(store.getState());
  const persistedBefore = storage.getItem(STORAGE_KEY);

  assert.equal(removeContext(store, '@work'), null);

  assert.deepEqual(store.getState(), before);
  assert.equal(storage.getItem(STORAGE_KEY), persistedBefore);
});

test('removeContext succeeds once the last active action is completed', () => {
  const store = createStore(createMemoryStorage());
  const context = addContext(store, '@work');
  const action = clarifyToNextAction(store, addInboxItem(store, 'Write the report').id, context);

  assert.equal(removeContext(store, context), null);

  completeAction(store, action.id);

  assert.equal(removeContext(store, context), context);
  assert.equal(store.getState().settings.contexts.includes(context), false);
});

test('a newly added context can be used by clarify and its selects', () => {
  const store = createStore(createMemoryStorage());
  const context = addContext(store, '@work');
  const item = addInboxItem(store, 'Write the report');

  const action = clarifyToNextAction(store, item.id, context);

  assert.ok(action);
  assert.equal(action.context, '@work');
  assert.equal(store.getState().actions[0].context, '@work');
  assert.deepEqual(listContexts(store), [...emptyState().settings.contexts, '@work']);
});
