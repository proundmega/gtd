import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToProject } from '../src/projects.js';
import {
  addArea,
  assignProjectToArea,
  clearProjectArea,
  countProjectsByArea,
  countProjectsForArea,
  resolveAreaName,
} from '../src/areas.js';

function createProject(store, title = 'Plan the team offsite') {
  const item = addInboxItem(store, title);
  return clarifyToProject(store, item.id, 'Book a venue', '@computer');
}

test('addArea creates an area with a required name and optional description', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  const area = addArea(store, '  Health  ', '  Exercise and nutrition  ');
  const state = store.getState();

  assert.ok(area.id);
  assert.equal(area.id.startsWith('area-'), true);
  assert.equal(area.name, 'Health');
  assert.equal(area.description, 'Exercise and nutrition');
  assert.ok(area.createdAt);
  assert.deepEqual(state.areas, [area]);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).areas, [area]);
});

test('addArea rejects an area without a name', () => {
  const store = createStore(createMemoryStorage());

  assert.equal(addArea(store, '', 'A description'), null);
  assert.equal(addArea(store, '   '), null);
  assert.equal(addArea(store), null);
  assert.deepEqual(store.getState().areas, []);
});

test('assignProjectToArea persists the project area and shows its name', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const area = addArea(store, 'Work', 'Professional responsibilities');
  const project = createProject(store);

  const updated = assignProjectToArea(store, project.id, area.id);

  assert.equal(updated.areaId, area.id);
  assert.equal(store.getState().projects[0].areaId, area.id);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).projects[0].areaId, area.id);
  assert.equal(resolveAreaName(store.getState().projects[0].areaId, store.getState().areas), 'Work');
});

test('assignProjectToArea clears an assignment when no area is selected', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const area = addArea(store, 'Work');
  const project = createProject(store);
  assignProjectToArea(store, project.id, area.id);

  const updated = clearProjectArea(store, project.id);

  assert.equal(updated.areaId, null);
  assert.equal(store.getState().projects[0].areaId, null);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).projects[0].areaId, null);
  assert.equal(resolveAreaName(store.getState().projects[0].areaId, store.getState().areas), null);
});

test('assignProjectToArea rejects an unknown project or area', () => {
  const store = createStore(createMemoryStorage());
  const area = addArea(store, 'Work');
  const project = createProject(store);

  assert.equal(assignProjectToArea(store, 'missing-project', area.id), null);
  assert.equal(assignProjectToArea(store, project.id, 'missing-area'), null);
  assert.equal(store.getState().projects[0].areaId, undefined);
});

test('countProjectsForArea counts projects assigned to each area', () => {
  const store = createStore(createMemoryStorage());
  const work = addArea(store, 'Work');
  const home = addArea(store, 'Home');
  const first = createProject(store, 'Ship the release');
  const second = createProject(store, 'Write the proposal');
  const third = createProject(store, 'Fix the sink');

  assignProjectToArea(store, first.id, work.id);
  assignProjectToArea(store, second.id, work.id);
  assignProjectToArea(store, third.id, home.id);

  const projects = store.getState().projects;
  assert.equal(countProjectsForArea(work, projects), 2);
  assert.equal(countProjectsForArea(work.id, projects), 2);
  assert.equal(countProjectsForArea(home, projects), 1);
  assert.equal(countProjectsForArea('missing-area', projects), 0);
  assert.deepEqual(countProjectsByArea(projects), {
    [work.id]: 2,
    [home.id]: 1,
  });
});
