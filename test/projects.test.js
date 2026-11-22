import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToProject, countOpenProjectActions } from '../src/projects.js';

test('clarifyToProject creates a project with a linked next action', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Plan the team offsite');

  const project = clarifyToProject(store, item.id, '  Book a venue and agenda  ', '@computer');
  const state = store.getState();

  assert.ok(project.id);
  assert.equal(project.title, 'Plan the team offsite');
  assert.equal(project.outcome, 'Book a venue and agenda');
  assert.equal(project.status, 'active');
  assert.ok(project.createdAt);
  assert.equal(project.nextActionIds.length, 1);

  assert.equal(state.actions.length, 1);
  const action = state.actions[0];
  assert.equal(action.id, project.nextActionIds[0]);
  assert.equal(action.title, 'Plan the team offsite');
  assert.equal(action.context, '@computer');
  assert.equal(action.status, 'active');
  assert.equal(action.projectId, project.id);

  assert.deepEqual(state.projects, [project]);
  assert.deepEqual(state.inbox, []);

  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.deepEqual(saved.projects, [project]);
  assert.deepEqual(saved.actions, [action]);
  assert.deepEqual(saved.inbox, []);
});

test('clarifyToProject rejects a project without an outcome or context', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Plan the team offsite');

  assert.equal(clarifyToProject(store, item.id, '', '@computer'), null);
  assert.equal(clarifyToProject(store, item.id, '   ', '@computer'), null);
  assert.equal(clarifyToProject(store, item.id, 'Book a venue', ''), null);
  assert.equal(clarifyToProject(store, item.id, 'Book a venue', '   '), null);
  assert.equal(clarifyToProject(store, item.id, 'Book a venue', '@not-a-context'), null);

  assert.deepEqual(store.getState().inbox, [item]);
  assert.deepEqual(store.getState().projects, []);
  assert.deepEqual(store.getState().actions, []);
});

test('countOpenProjectActions counts open actions linked to a project', () => {
  const project = { id: 'project-1' };
  const actions = [
    { projectId: 'project-1', status: 'active' },
    { projectId: 'project-1', status: 'active' },
    { projectId: 'project-1', status: 'done' },
    { projectId: 'project-2', status: 'active' },
  ];

  assert.equal(countOpenProjectActions(project, actions), 2);
});
