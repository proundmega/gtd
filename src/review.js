import { nextId } from './store.js';
import { countOpenActions } from './actions.js';
import { countOpenProjectActions } from './projects.js';
import { countOpenWaiting } from './waiting.js';
import { countOpenSomeday } from './someday.js';
import { countScheduled } from './calendar.js';

export const REVIEW_STEPS = [
  { key: 'inbox', label: 'Clear the inbox' },
  { key: 'nextActions', label: 'Review next actions' },
  { key: 'projectsWithoutActions', label: 'Review projects with no open action' },
  { key: 'waitingFor', label: 'Review waiting-for items' },
  { key: 'somedayMaybe', label: 'Review someday/maybe' },
  { key: 'calendar', label: 'Review the calendar' },
  { key: 'areas', label: 'Review areas' },
];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function addAliases(target, aliases) {
  Object.entries(aliases).forEach(([key, value]) => {
    if (key in target) return;
    Object.defineProperty(target, key, {
      value,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  });
  return target;
}

function resolveState(state) {
  if (state && typeof state.getState === 'function') return state.getState();
  return state ?? {};
}

export function getReviewCounts(source = {}) {
  const state = resolveState(source);
  const inbox = list(state.inbox);
  const actions = list(state.actions);
  const projects = list(state.projects);
  const waiting = list(state.waiting);
  const someday = list(state.someday);
  const calendar = list(state.calendar);
  const areas = list(state.areas);

  const counts = {
    inbox: inbox.length,
    nextActions: countOpenActions(actions),
    projectsWithoutActions: projects.filter((project) => (
      countOpenProjectActions(project, actions) === 0
    )).length,
    waitingFor: countOpenWaiting(waiting),
    somedayMaybe: countOpenSomeday(someday),
    calendar: countScheduled(calendar),
    areas: areas.length,
  };

  return addAliases(counts, {
    actions: counts.nextActions,
    projects: counts.projectsWithoutActions,
    waiting: counts.waitingFor,
    someday: counts.somedayMaybe,
    inboxCount: counts.inbox,
    nextActionCount: counts.nextActions,
    projectsWithoutNextAction: counts.projectsWithoutActions,
    projectsWithoutNextActions: counts.projectsWithoutActions,
    projectsWithNoOpenAction: counts.projectsWithoutActions,
    projectsWithNoNextAction: counts.projectsWithoutActions,
    stalledProjects: counts.projectsWithoutActions,
    waitingForCount: counts.waitingFor,
    somedayMaybeCount: counts.somedayMaybe,
    calendarCount: counts.calendar,
    areaCount: counts.areas,
    'next-actions': counts.nextActions,
    'next-action': counts.nextActions,
    'projects-without-actions': counts.projectsWithoutActions,
    'projects-without-next-action': counts.projectsWithoutActions,
    'projects-with-no-open-action': counts.projectsWithoutActions,
    'waiting-for': counts.waitingFor,
    'someday-maybe': counts.somedayMaybe,
    'someday/maybe': counts.somedayMaybe,
  });
}

export function buildReviewChecklist(source = {}) {
  const state = resolveState(source);
  const counts = getReviewCounts(state);
  return REVIEW_STEPS.map(({ key, label }) => {
    const item = { label, count: counts[key] };
    return addAliases(item, { key, id: key });
  });
}

function resolveCompletedAt(value) {
  if (value == null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function completeWeeklyReview(store, completedAt = null) {
  const state = store.getState();
  const review = {
    id: nextId('review'),
    completedAt: resolveCompletedAt(completedAt),
    snapshot: getReviewCounts(state),
  };

  store.update((draft) => {
    draft.reviews = list(draft.reviews);
    draft.reviews.unshift(review);
    draft.settings = { ...draft.settings, lastReviewAt: review.completedAt };
    return draft;
  });

  return review;
}

export function sortReviewsNewestFirst(reviews) {
  return [...list(reviews)].sort((a, b) => {
    const aTime = Date.parse(a.completedAt) || 0;
    const bTime = Date.parse(b.completedAt) || 0;
    return bTime - aTime;
  });
}

export function getLastReview(source = {}) {
  const state = resolveState(source);
  const reviews = sortReviewsNewestFirst(state.reviews);
  return reviews[0] ?? null;
}

export function getRecentReviews(source = {}, limit = 5) {
  const state = resolveState(source);
  const reviews = sortReviewsNewestFirst(state.reviews);
  if (!Number.isFinite(limit) || limit < 0) return reviews;
  return reviews.slice(0, limit);
}

export const reviewCounts = getReviewCounts;
export const buildReviewSnapshot = getReviewCounts;
export const reviewSnapshot = getReviewCounts;
export const weeklyReviewSnapshot = getReviewCounts;
export const countReviewItems = getReviewCounts;
export const countChecklistItems = getReviewCounts;
export const getChecklistCounts = getReviewCounts;
export const getReviewChecklistCounts = getReviewCounts;
export const getWeeklyReviewCounts = getReviewCounts;

export const reviewChecklist = buildReviewChecklist;
export const getReviewChecklist = buildReviewChecklist;
export const createReviewChecklist = buildReviewChecklist;
export const buildWeeklyReviewChecklist = buildReviewChecklist;
export const getWeeklyReviewChecklist = buildReviewChecklist;
export const weeklyReviewChecklist = buildReviewChecklist;

export const completeReview = completeWeeklyReview;
export const recordWeeklyReview = completeWeeklyReview;
export const recordReview = completeWeeklyReview;
export const createWeeklyReview = completeWeeklyReview;

export const sortReviews = sortReviewsNewestFirst;
export const recentReviews = getRecentReviews;
export const lastReview = getLastReview;
export const getWeeklyReview = getLastReview;
