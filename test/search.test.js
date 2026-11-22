import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupSearchResults,
  normalizeSearchQuery,
  searchGroups,
  searchItems,
} from '../src/search.js';

function sampleState() {
  return {
    inbox: [{ id: 'inbox-1', title: 'Email the Alpha team' }],
    actions: [{ id: 'action-1', title: 'Call Alpha about the launch' }],
    projects: [
      { id: 'project-1', title: 'Launch Alpha', outcome: 'Ship the beta' },
      { id: 'project-2', title: 'Review budget', outcome: 'Approved alpha plan' },
    ],
    waiting: [{ id: 'waiting-1', title: 'Contract review', person: 'Alpha legal' }],
    someday: [{ id: 'someday-1', title: 'Visit Alpha headquarters' }],
    reference: [{ id: 'reference-1', title: 'Project notes', note: 'Alpha retro notes' }],
    calendar: [{ id: 'calendar-1', title: 'Alpha kickoff' }],
    areas: [{ id: 'area-1', name: 'Alpha', description: 'The flagship product' }],
    goals: [
      { id: 'goal-1', title: 'Grow Alpha', description: 'Reach alpha customers' },
    ],
    settings: {},
  };
}

test('search finds matching items across every list', () => {
  const results = searchItems(sampleState(), 'alpha');

  const keys = [...new Set(results.map((result) => result.listKey))];
  assert.deepEqual(keys, [
    'inbox',
    'actions',
    'projects',
    'waiting',
    'someday',
    'reference',
    'calendar',
    'areas',
    'goals',
  ]);
  assert.equal(results.filter((result) => result.listKey === 'projects').length, 2);
});

test('search is case-insensitive and trims the query', () => {
  assert.equal(normalizeSearchQuery('  ALPHA  '), 'alpha');
  assert.equal(searchItems(sampleState(), '  AlPhA  ').length, 10);
});

test('search matches secondary fields such as outcomes, notes and people', () => {
  assert.deepEqual(
    searchItems(sampleState(), 'beta').map((result) => result.listKey),
    ['projects'],
  );
  assert.deepEqual(
    searchItems(sampleState(), 'retro').map((result) => result.listKey),
    ['reference'],
  );
  assert.deepEqual(
    searchItems(sampleState(), 'legal').map((result) => result.listKey),
    ['waiting'],
  );
});

test('empty search returns no results and no groups', () => {
  assert.deepEqual(searchItems(sampleState(), ''), []);
  assert.deepEqual(searchItems(sampleState(), '   '), []);
  assert.deepEqual(searchGroups(sampleState(), ''), []);
});

test('search with no matches returns an empty result set', () => {
  assert.deepEqual(searchItems(sampleState(), 'does-not-exist'), []);
  assert.deepEqual(searchGroups(sampleState(), 'does-not-exist'), []);
});

test('groupSearchResults groups results by list with a countable label', () => {
  const groups = groupSearchResults(searchItems(sampleState(), 'alpha'));
  const projects = groups.find((group) => group.key === 'projects');

  assert.equal(groups.length, 9);
  assert.equal(projects.label, 'Projects');
  assert.equal(projects.count, 2);
  assert.equal(projects.items.length, 2);
  assert.equal(groups.reduce((total, group) => total + group.count, 0), 10);
});
