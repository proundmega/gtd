import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction } from '../src/clarify.js';
import { completeAction } from '../src/actions.js';
import {
  filterActionsByEnergy,
  filterActionsByTime,
  getBestNextAction,
  getEngageActions,
  sortActionsByPriority,
} from '../src/engage.js';

function action(overrides = {}) {
  return {
    id: overrides.id ?? 'action',
    title: overrides.title ?? 'Do the thing',
    context: overrides.context ?? '@computer',
    priority: overrides.priority ?? 'medium',
    energy: overrides.energy ?? 'medium',
    timeMinutes: overrides.timeMinutes ?? 15,
    status: overrides.status ?? 'active',
    createdAt: overrides.createdAt ?? '2024-01-01T00:00:00.000Z',
    projectId: overrides.projectId ?? null,
  };
}

test('engage filters actions by context', () => {
  const actions = [
    action({ id: 'phone', context: '@phone' }),
    action({ id: 'computer', context: '@computer' }),
    action({ id: 'errands', context: '@errands' }),
  ];

  assert.deepEqual(
    getEngageActions(actions, { context: '@phone' }).map((item) => item.id),
    ['phone'],
  );
  assert.deepEqual(
    getEngageActions(actions, { context: 'all' }).map((item) => item.id),
    ['phone', 'computer', 'errands'],
  );
});

test('engage energy filter includes lower-energy actions', () => {
  const actions = [
    action({ id: 'low', energy: 'low' }),
    action({ id: 'medium', energy: 'medium' }),
    action({ id: 'high', energy: 'high' }),
  ];

  assert.deepEqual(
    filterActionsByEnergy(actions, 'low').map((item) => item.id),
    ['low'],
  );
  assert.deepEqual(
    filterActionsByEnergy(actions, 'medium').map((item) => item.id),
    ['low', 'medium'],
  );
  assert.deepEqual(
    filterActionsByEnergy(actions, 'high').map((item) => item.id),
    ['low', 'medium', 'high'],
  );
  assert.deepEqual(
    filterActionsByEnergy(actions, 'any').map((item) => item.id),
    ['low', 'medium', 'high'],
  );
});

test('engage time filter includes actions at or under the available time', () => {
  const actions = [
    action({ id: 'short', timeMinutes: 15 }),
    action({ id: 'medium', timeMinutes: 30 }),
    action({ id: 'long', timeMinutes: 60 }),
    action({ id: 'longer', timeMinutes: 90 }),
  ];

  assert.deepEqual(
    filterActionsByTime(actions, 15).map((item) => item.id),
    ['short'],
  );
  assert.deepEqual(
    filterActionsByTime(actions, 30).map((item) => item.id),
    ['short', 'medium'],
  );
  assert.deepEqual(
    filterActionsByTime(actions, 60).map((item) => item.id),
    ['short', 'medium', 'long'],
  );
  assert.deepEqual(
    filterActionsByTime(actions, 'any').map((item) => item.id),
    ['short', 'medium', 'long', 'longer'],
  );
});

test('engage only returns active actions matching all filters', () => {
  const actions = [
    action({ id: 'match', context: '@phone', energy: 'low', timeMinutes: 15 }),
    action({ id: 'wrong-context', context: '@home', energy: 'low', timeMinutes: 15 }),
    action({ id: 'too-much-energy', context: '@phone', energy: 'high', timeMinutes: 15 }),
    action({ id: 'too-long', context: '@phone', energy: 'low', timeMinutes: 60 }),
    action({ id: 'done', context: '@phone', energy: 'low', timeMinutes: 15, status: 'done' }),
  ];

  const result = getEngageActions(actions, {
    context: '@phone',
    energy: 'low',
    timeMinutes: 30,
  });

  assert.deepEqual(result.map((item) => item.id), ['match']);
});

test('engage sorts by priority then newest first', () => {
  const actions = [
    action({ id: 'low-new', priority: 'low', createdAt: '2024-01-04T00:00:00.000Z' }),
    action({ id: 'high-old', priority: 'high', createdAt: '2024-01-01T00:00:00.000Z' }),
    action({ id: 'medium-new', priority: 'medium', createdAt: '2024-01-03T00:00:00.000Z' }),
    action({ id: 'high-new', priority: 'high', createdAt: '2024-01-02T00:00:00.000Z' }),
    action({ id: 'low-old', priority: 'low', createdAt: '2024-01-01T00:00:00.000Z' }),
  ];

  assert.deepEqual(
    sortActionsByPriority(actions).map((item) => item.id),
    ['high-new', 'high-old', 'medium-new', 'low-new', 'low-old'],
  );
});

test('engage selects the best next action from the sorted results', () => {
  const actions = [
    action({ id: 'medium', priority: 'medium', createdAt: '2024-01-03T00:00:00.000Z' }),
    action({ id: 'high', priority: 'high', createdAt: '2024-01-01T00:00:00.000Z' }),
  ];

  assert.equal(getBestNextAction(actions)?.id, 'high');
});

test('engage shows an empty state when no actions match', () => {
  assert.deepEqual(getEngageActions([], { context: 'all' }), []);
  assert.equal(getBestNextAction([]), null);

  const actions = [action({ id: 'done', status: 'done' })];
  assert.deepEqual(getEngageActions(actions, { context: 'all' }), []);
  assert.equal(getBestNextAction(actions, { energy: 'low' }), null);
});

test('engage works with a store and completing an action removes it', () => {
  const store = createStore(createMemoryStorage());
  const item = addInboxItem(store, 'Call the dentist');
  const created = clarifyToNextAction(store, item.id, '@phone');

  const best = getBestNextAction(store, { context: '@phone' });
  assert.equal(best.id, created.id);

  completeAction(store, created.id);

  assert.deepEqual(getEngageActions(store, { context: '@phone' }), []);
  assert.equal(getBestNextAction(store, { context: '@phone' }), null);
});
