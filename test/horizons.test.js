import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, emptyState, STORAGE_KEY } from '../src/store.js';
import {
  addGoal,
  buildHorizons,
  getHorizonCounts,
  removeGoal,
  saveHorizonSettings,
} from '../src/horizons.js';

function sampleState() {
  return {
    goals: [
      { id: 'goal-1', title: 'Run a half marathon' },
      { id: 'goal-2', title: 'Read twelve books' },
    ],
    areas: [
      { id: 'area-1', name: 'Health' },
      { id: 'area-2', name: 'Work' },
    ],
    projects: [
      { id: 'project-1', status: 'active' },
      { id: 'project-2', status: 'done' },
      { id: 'project-3', status: 'completed' },
      { id: 'project-4', status: 'archived' },
      { id: 'project-5', status: 'trashed' },
    ],
    actions: [
      { id: 'action-1', status: 'active' },
      { id: 'action-2', status: 'active' },
      { id: 'action-3', status: 'done' },
    ],
    settings: {
      purpose: 'Live with intention',
      principles: 'Be kind',
      vision: 'A calm, healthy life',
    },
  };
}

test('empty state includes goals and horizon settings defaults', () => {
  const state = emptyState();

  assert.deepEqual(state.goals, []);
  assert.equal(state.settings.purpose, '');
  assert.equal(state.settings.principles, '');
  assert.equal(state.settings.vision, '');
});

test('saveHorizonSettings saves purpose, principles and vision and persists them', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const saved = saveHorizonSettings(store, {
    purpose: '  Live with intention  ',
    principles: '  Be kind\nBe curious  ',
    vision: '  A calm, healthy life  ',
  });

  assert.equal(saved.purpose, 'Live with intention');
  assert.equal(saved.principles, 'Be kind\nBe curious');
  assert.equal(saved.vision, 'A calm, healthy life');
  assert.equal(store.getState().settings.purpose, 'Live with intention');
  assert.equal(store.getState().settings.principles, 'Be kind\nBe curious');
  assert.equal(store.getState().settings.vision, 'A calm, healthy life');

  const persisted = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(persisted.settings.purpose, 'Live with intention');
  assert.equal(persisted.settings.principles, 'Be kind\nBe curious');
  assert.equal(persisted.settings.vision, 'A calm, healthy life');
});

test('saveHorizonSettings only updates the fields that are provided', () => {
  const store = createStore(createMemoryStorage());
  saveHorizonSettings(store, {
    purpose: 'Live with intention',
    principles: 'Be kind',
    vision: 'A calm, healthy life',
  });

  saveHorizonSettings(store, { vision: 'An adventurous life' });
  const settings = store.getState().settings;

  assert.equal(settings.purpose, 'Live with intention');
  assert.equal(settings.principles, 'Be kind');
  assert.equal(settings.vision, 'An adventurous life');
});

test('addGoal trims, stores and persists a goal', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const goal = addGoal(store, '  Run a half marathon  ', '  Train three times a week  ');

  assert.ok(goal.id);
  assert.equal(goal.id.startsWith('goal-'), true);
  assert.equal(goal.title, 'Run a half marathon');
  assert.equal(goal.description, 'Train three times a week');
  assert.ok(goal.createdAt);
  assert.deepEqual(store.getState().goals, [goal]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).goals, [goal]);
});

test('addGoal rejects an empty goal title', () => {
  const store = createStore(createMemoryStorage());

  assert.equal(addGoal(store, ''), null);
  assert.equal(addGoal(store, '   '), null);
  assert.deepEqual(store.getState().goals, []);
});

test('removeGoal removes and persists a goal', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const first = addGoal(store, 'Run a half marathon');
  const second = addGoal(store, 'Read twelve books');

  const removed = removeGoal(store, first.id);

  assert.equal(removed.id, first.id);
  assert.deepEqual(store.getState().goals.map((goal) => goal.id), [second.id]);
  assert.deepEqual(
    JSON.parse(storage.getItem(STORAGE_KEY)).goals.map((goal) => goal.id),
    [second.id],
  );
  assert.equal(removeGoal(store, 'missing-goal'), null);
});

test('horizon counts use areas, open projects and open next actions', () => {
  const counts = getHorizonCounts(sampleState());

  assert.deepEqual(counts, {
    areas: 2,
    projects: 1,
    nextActions: 2,
  });
});

test('buildHorizons lists the six horizons in order with summaries', () => {
  const rows = buildHorizons(sampleState());

  assert.deepEqual(rows.map((row) => row.title), [
    'Purpose & Principles',
    'Vision',
    'Goals & Objectives',
    'Areas of Focus',
    'Projects',
    'Next Actions',
  ]);
  assert.ok(rows.every((row) => row.description));

  const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
  assert.equal(byKey.purpose.summary, 'Live with intention · Be kind');
  assert.equal(byKey.vision.summary, 'A calm, healthy life');
  assert.equal(byKey.goals.count, 2);
  assert.equal(byKey.areas.count, 2);
  assert.equal(byKey.projects.count, 1);
  assert.equal(byKey.projects.summary, '1 open project');
  assert.equal(byKey.actions.count, 2);
  assert.equal(byKey.actions.summary, '2 open next actions');
});
