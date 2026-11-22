import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { getHorizonCounts } from '../src/horizons.js';
import {
  clarifyToProject,
  completeProject,
  countActiveProjects,
  isProjectStalled,
  reopenProject,
} from '../src/projects.js';

function createProject(store, title = 'Plan the team offsite') {
  const item = addInboxItem(store, title);
  return clarifyToProject(store, item.id, 'Book a venue', '@computer');
}

test('completeProject marks a project completed and records completedAt', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const project = createProject(store);

  const updated = completeProject(store, project.id, '2026-05-15T12:00:00.000Z');

  assert.equal(updated.status, 'completed');
  assert.equal(updated.completedAt, '2026-05-15T12:00:00.000Z');
  assert.equal(store.getState().projects[0].status, 'completed');
  assert.equal(
    JSON.parse(storage.getItem(STORAGE_KEY)).projects[0].completedAt,
    '2026-05-15T12:00:00.000Z',
  );
});

test('completeProject defaults completedAt to the current time', () => {
  const store = createStore(createMemoryStorage());
  const project = createProject(store);

  const updated = completeProject(store, project.id);

  assert.equal(updated.status, 'completed');
  assert.equal(Number.isNaN(Date.parse(updated.completedAt)), false);
});

test('reopenProject makes a completed project active and clears completedAt', () => {
  const store = createStore(createMemoryStorage());
  const project = createProject(store);
  completeProject(store, project.id, '2026-05-15T12:00:00.000Z');

  const updated = reopenProject(store, project.id);

  assert.equal(updated.status, 'active');
  assert.equal(updated.completedAt, null);
  assert.equal(store.getState().projects[0].status, 'active');
  assert.equal(store.getState().projects[0].completedAt, null);
});

test('completeProject and reopenProject preserve planning and area assignments', () => {
  const store = createStore(createMemoryStorage());
  const project = createProject(store);
  const original = { ...store.getState().projects[0], planning: { ...project.planning } };

  completeProject(store, project.id);
  const reopened = reopenProject(store, project.id);

  assert.deepEqual(reopened.planning, original.planning);
  assert.equal(reopened.areaId, original.areaId);
  assert.equal(reopened.outcome, original.outcome);
});

test('completeProject and reopenProject return null for an unknown project', () => {
  const store = createStore(createMemoryStorage());

  assert.equal(completeProject(store, 'missing-project'), null);
  assert.equal(reopenProject(store, 'missing-project'), null);
});

test('countActiveProjects counts only active projects', () => {
  const projects = [
    { id: 'project-1', status: 'active' },
    { id: 'project-2', status: 'completed' },
    { id: 'project-3', status: 'active' },
    { id: 'project-4', status: 'on-hold' },
    { id: 'project-5' },
  ];

  assert.equal(countActiveProjects(projects), 2);
  assert.equal(countActiveProjects({ projects }), 2);
});

test('horizon project counts include only active projects', () => {
  const counts = getHorizonCounts({
    projects: [
      { id: 'project-1', status: 'active' },
      { id: 'project-2', status: 'completed' },
      { id: 'project-3', status: 'on-hold' },
    ],
    areas: [],
    actions: [],
  });

  assert.equal(counts.projects, 1);
});

test('isProjectStalled flags active projects with no open linked actions', () => {
  const project = { id: 'project-1', status: 'active' };
  const actions = [
    { id: 'action-1', projectId: 'project-1', status: 'done' },
    { id: 'action-2', projectId: 'project-1', status: 'active' },
    { id: 'action-3', projectId: 'project-2', status: 'active' },
  ];

  assert.equal(isProjectStalled(project, []), true);
  assert.equal(isProjectStalled(project, [{ id: 'a', projectId: 'project-1', status: 'done' }]), true);
  assert.equal(isProjectStalled(project, actions), false);
  assert.equal(isProjectStalled({ id: 'project-1', status: 'completed' }, []), false);
});
