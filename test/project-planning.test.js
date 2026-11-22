import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import {
  DEFAULT_PROJECT_PLANNING,
  PROJECT_PLANNING_KEYS,
  PROJECT_PLANNING_STEPS,
  clarifyToProject,
  countProjectPlanningSteps,
  updateProjectPlanning,
} from '../src/projects.js';

function createProject(store, title = 'Plan the team offsite') {
  const item = addInboxItem(store, title);
  return clarifyToProject(store, item.id, 'Book a venue', '@computer');
}

test('clarifyToProject gives new projects the default planning fields', () => {
  const store = createStore(createMemoryStorage());
  const project = createProject(store);

  assert.deepEqual(project.planning, DEFAULT_PROJECT_PLANNING);
  assert.deepEqual(Object.keys(project.planning), [...PROJECT_PLANNING_KEYS]);
  assert.equal(PROJECT_PLANNING_STEPS.length, 5);
  assert.equal(countProjectPlanningSteps(project), 0);
});

test('updateProjectPlanning saves the five natural planning steps and persists them', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const project = createProject(store);

  const planning = {
    purpose: '  Bring the team together  ',
    vision: 'Everyone leaves energized',
    brainstorm: 'Retreat, workshop, dinner',
    organize: 'Pick a venue, then book it',
    nextActions: 'Ask the team for dates',
  };
  const updated = updateProjectPlanning(store, project.id, planning);

  assert.equal(updated.planning.purpose, 'Bring the team together');
  assert.equal(updated.planning.vision, planning.vision);
  assert.equal(updated.planning.brainstorm, planning.brainstorm);
  assert.equal(updated.planning.organize, planning.organize);
  assert.equal(updated.planning.nextActions, planning.nextActions);

  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(saved.projects[0].planning.purpose, 'Bring the team together');
  assert.equal(saved.projects[0].planning.vision, planning.vision);
  assert.equal(saved.projects[0].planning.brainstorm, planning.brainstorm);
  assert.equal(saved.projects[0].planning.organize, planning.organize);
  assert.equal(saved.projects[0].planning.nextActions, planning.nextActions);
});

test('updateProjectPlanning only changes the steps that are provided', () => {
  const store = createStore(createMemoryStorage());
  const project = createProject(store);
  updateProjectPlanning(store, project.id, {
    purpose: 'Bring the team together',
    vision: 'Everyone leaves energized',
  });

  updateProjectPlanning(store, project.id, { organize: 'Pick a venue' });

  const planning = store.getState().projects[0].planning;
  assert.equal(planning.purpose, 'Bring the team together');
  assert.equal(planning.vision, 'Everyone leaves energized');
  assert.equal(planning.brainstorm, '');
  assert.equal(planning.organize, 'Pick a venue');
  assert.equal(planning.nextActions, '');
});

test('countProjectPlanningSteps counts the filled steps', () => {
  const project = {
    id: 'project-1',
    planning: {
      purpose: 'Bring the team together',
      vision: 'Everyone leaves energized',
      brainstorm: '   ',
      organize: '',
      nextActions: 'Ask the team for dates',
    },
  };

  assert.equal(countProjectPlanningSteps(project), 3);
});

test('countProjectPlanningSteps defaults to zero without planning', () => {
  assert.equal(countProjectPlanningSteps({ id: 'project-1' }), 0);
  assert.equal(countProjectPlanningSteps(), 0);
});

test('updateProjectPlanning returns null for an unknown project', () => {
  const store = createStore(createMemoryStorage());

  assert.equal(updateProjectPlanning(store, 'missing-project', { purpose: 'Why' }), null);
  assert.deepEqual(store.getState().projects, []);
});
