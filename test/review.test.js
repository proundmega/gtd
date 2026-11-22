import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, STORAGE_KEY } from '../src/store.js';
import { addInboxItem } from '../src/inbox.js';
import { clarifyToNextAction } from '../src/clarify.js';
import {
  buildReviewChecklist,
  completeWeeklyReview,
  getLastReview,
  getRecentReviews,
  getReviewCounts,
  sortReviewsNewestFirst,
} from '../src/review.js';

function sampleState() {
  return {
    inbox: [{ id: 'inbox-1' }, { id: 'inbox-2' }],
    actions: [
      { id: 'action-1', status: 'active', projectId: 'project-1' },
      { id: 'action-2', status: 'active', projectId: 'project-1' },
      { id: 'action-3', status: 'done', projectId: 'project-2' },
    ],
    projects: [
      { id: 'project-1' },
      { id: 'project-2' },
      { id: 'project-3' },
    ],
    waiting: [
      { id: 'waiting-1', status: 'waiting' },
      { id: 'waiting-2', status: 'received' },
    ],
    someday: [
      { id: 'someday-1', status: 'someday' },
      { id: 'someday-2', status: 'activated' },
    ],
    calendar: [
      { id: 'calendar-1', status: 'scheduled' },
      { id: 'calendar-2', status: 'reactivated' },
    ],
    areas: [{ id: 'area-1' }, { id: 'area-2' }],
    reviews: [],
    settings: { contexts: [], lastReviewAt: null },
  };
}

test('review counts capture each weekly review area', () => {
  const counts = getReviewCounts(sampleState());

  assert.deepEqual(counts, {
    inbox: 2,
    nextActions: 2,
    projectsWithoutActions: 2,
    waitingFor: 1,
    somedayMaybe: 1,
    calendar: 1,
    areas: 2,
  });
});

test('review checklist is derived from current state with counts', () => {
  const checklist = buildReviewChecklist(sampleState());

  assert.deepEqual(
    checklist.map((item) => item.label),
    [
      'Clear the inbox',
      'Review next actions',
      'Review projects with no open action',
      'Review waiting-for items',
      'Review someday/maybe',
      'Review the calendar',
      'Review areas',
    ],
  );
  assert.deepEqual(checklist.map((item) => item.count), [2, 2, 2, 1, 1, 1, 2]);
});

test('completeWeeklyReview records a review with a snapshot and updates lastReviewAt', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const item = addInboxItem(store, 'Call the dentist');
  clarifyToNextAction(store, item.id, '@phone');
  const before = getReviewCounts(store.getState());

  const review = completeWeeklyReview(store, '2026-05-15T12:00:00.000Z');
  const state = store.getState();

  assert.ok(review.id);
  assert.equal(review.id.startsWith('review-'), true);
  assert.equal(review.completedAt, '2026-05-15T12:00:00.000Z');
  assert.deepEqual(review.snapshot, before);
  assert.deepEqual(state.reviews, [review]);
  assert.equal(state.settings.lastReviewAt, review.completedAt);
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)).reviews, [review]);
  assert.equal(
    JSON.parse(storage.getItem(STORAGE_KEY)).settings.lastReviewAt,
    review.completedAt,
  );
});

test('recent reviews are shown newest first and lastReviewAt follows the latest recording', () => {
  const store = createStore(createMemoryStorage());

  const first = completeWeeklyReview(store, '2026-05-08T12:00:00.000Z');
  const second = completeWeeklyReview(store, '2026-05-15T12:00:00.000Z');

  assert.deepEqual(getRecentReviews(store.getState()).map((review) => review.id), [second.id, first.id]);
  assert.equal(getLastReview(store.getState()).id, second.id);
  assert.equal(store.getState().settings.lastReviewAt, second.completedAt);
});

test('sortReviewsNewestFirst leaves the original reviews untouched', () => {
  const reviews = [
    { id: 'old', completedAt: '2026-05-01T00:00:00.000Z' },
    { id: 'new', completedAt: '2026-05-08T00:00:00.000Z' },
  ];

  assert.deepEqual(sortReviewsNewestFirst(reviews).map((review) => review.id), ['new', 'old']);
  assert.deepEqual(reviews.map((review) => review.id), ['old', 'new']);
});
