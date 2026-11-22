import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction } from '../src/clarify.js';
import { clarifyToProject } from '../src/projects.js';
import {
  completeAction,
  countOpenActions,
  filterActionsByContext,
  resolveProjectName,
  sortActionsNewestFirst,
} from '../src/actions.js';

test('countOpenActions counts only active actions', () => {
  const actions = [
    { id: 'one', status: 'active' },
    { id: 'two', status: 'active' },
    { id: 'three', status: 'done' },
  ];

  assert.equal(countOpenActions(actions), 2);
});

test('sortActionsNewestFirst orders active actions by createdAt descending', () => {
  const actions = [
    { id: 'old', status: 'active', createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 'new', status: 'active', createdAt: '2024-01-02T00:00:00.000Z' },
  ];

  assert.deepEqual(sortActionsNewestFirst(actions).map((action) => action.id), ['new', 'old']);
});

test('filterActionsByContext keeps only actions for the selected context', () => {
  const actions = [
    { id: 'one', context: '@phone' },
    { id: 'two', context: '@computer' },
    { id: 'three', context: '@phone' },
  ];

  assert.deepEqual(filterActionsByContext(actions, '@phone').map((action) => action.id), ['one', 'three']);
  assert.deepEqual(filterActionsByContext(actions, 'all').map((action) => action.id), ['one', 'two', 'three']);
  assert.deepEqual(filterActionsByContext(actions, '').map((action) => action.id), ['one', 'two', 'three']);
});

test('completeAction marks an action done and removes it from the open count', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Call the dentist');
  const action = clarifyToNextAction(store, item.id, '@phone');

  const completed = completeAction(store, action.id);

  assert.equal(completed.status, 'done');
  assert.equal(store.getState().actions[0].status, 'done');
  assert.equal(countOpenActions(store.getState().actions), 0);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).actions[0].status, 'done');
});

test('completeAction ignores unknown actions', () => {
  const store = createStore(createMemoryStorage());

  assert.equal(completeAction(store, 'missing'), null);
  assert.deepEqual(store.getState().actions, []);
});

test('resolveProjectName returns the linked project title', () => {
  const projects = [
    { id: 'project-1', title: 'Plan the offsite' },
    { id: 'project-2', title: 'Move house' },
  ];

  assert.equal(resolveProjectName('project-1', projects), 'Plan the offsite');
  assert.equal(resolveProjectName(null, projects), null);
  assert.equal(resolveProjectName('missing', projects), null);
});

test('actions created from projects resolve their project name', () => {
  const store = createStore(createMemoryStorage());
  const item = addInboxItem(store, 'Plan the team offsite');
  const project = clarifyToProject(store, item.id, 'Book a venue', '@computer');
  const state = store.getState();

  assert.equal(resolveProjectName(state.actions[0].projectId, state.projects), project.title);
});
