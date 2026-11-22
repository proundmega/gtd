import { nextId } from './store.js';
import { DEFAULT_ACTION_PLANNING } from './actions.js';

export * from './areas.js';

export const PROJECT_PLANNING_STEPS = Object.freeze([
  {
    key: 'purpose',
    label: 'Purpose & Principles',
    placeholder: 'Why does this project exist? What principles guide it?',
  },
  {
    key: 'vision',
    label: 'Vision & Outcome',
    placeholder: 'What does a successful outcome look like?',
  },
  {
    key: 'brainstorm',
    label: 'Brainstorm',
    placeholder: 'Capture every idea without judging it.',
  },
  {
    key: 'organize',
    label: 'Organize',
    placeholder: 'Group, sequence and prioritize the ideas.',
  },
  {
    key: 'nextActions',
    label: 'Next Actions',
    placeholder: 'What are the next concrete actions?',
  },
]);

export const PROJECT_PLANNING_KEYS = Object.freeze(
  PROJECT_PLANNING_STEPS.map((step) => step.key),
);

const PLANNING_ALIASES = Object.freeze({
  purposePrinciples: 'purpose',
  purpose_principles: 'purpose',
  'purpose/principles': 'purpose',
  visionOutcome: 'vision',
  vision_outcome: 'vision',
  'vision/outcome': 'vision',
  brainstorming: 'brainstorm',
  organization: 'organize',
  organisation: 'organize',
  organising: 'organize',
  nextAction: 'nextActions',
  next_actions: 'nextActions',
  nextSteps: 'nextActions',
  next_steps: 'nextActions',
});

function addPlanningAliases(planning) {
  Object.entries(PLANNING_ALIASES).forEach(([alias, key]) => {
    if (alias in planning) return;
    Object.defineProperty(planning, alias, {
      value: planning[key],
      enumerable: false,
      configurable: true,
      writable: true,
    });
  });
  return planning;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function planningValue(source, key) {
  if (!source || typeof source !== 'object') return '';
  if (hasOwn(source, key)) return source[key];

  const alias = Object.keys(PLANNING_ALIASES)
    .find((candidate) => PLANNING_ALIASES[candidate] === key && hasOwn(source, candidate));
  return alias ? source[alias] : '';
}

export function createProjectPlanning(source = {}) {
  const planning = {};
  PROJECT_PLANNING_KEYS.forEach((key) => {
    planning[key] = String(planningValue(source, key) ?? '').trim();
  });
  return addPlanningAliases(planning);
}

export const DEFAULT_PROJECT_PLANNING = Object.freeze(createProjectPlanning());

export function normalizeProjectPlanning(value) {
  return createProjectPlanning(value);
}

export function getProjectPlanning(source = {}) {
  if (source && typeof source === 'object' && hasOwn(source, 'planning')) {
    return createProjectPlanning(source.planning);
  }
  return createProjectPlanning(source);
}

export function countProjectPlanningSteps(source = {}) {
  const planning = getProjectPlanning(source);
  return PROJECT_PLANNING_KEYS.filter((key) => planning[key].trim() !== '').length;
}

export function updateProjectPlanning(store, projectId, values = {}) {
  if (!store || typeof store.update !== 'function') return null;
  if (!values || typeof values !== 'object') return null;

  const state = store.getState();
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;

  const merged = { ...createProjectPlanning(project.planning) };
  PROJECT_PLANNING_KEYS.forEach((key) => {
    if (hasOwn(values, key)) {
      merged[key] = values[key];
      return;
    }
    const alias = Object.keys(PLANNING_ALIASES)
      .find((candidate) => PLANNING_ALIASES[candidate] === key && hasOwn(values, candidate));
    if (alias) merged[key] = values[alias];
  });

  const updated = { ...project, planning: createProjectPlanning(merged) };

  store.update((draft) => {
    draft.projects = draft.projects.map((candidate) => (
      candidate.id === projectId ? updated : candidate
    ));
    return draft;
  });

  return updated;
}

function findInboxItem(state, itemId) {
  return state.inbox.find((item) => item.id === itemId) ?? null;
}

export function clarifyToProject(store, itemId, outcome, context) {
  const state = store.getState();
  const item = findInboxItem(state, itemId);
  if (!item) return null;

  const trimmedOutcome = String(outcome ?? '').trim();
  if (!trimmedOutcome) return null;

  const selected = String(context ?? '').trim();
  if (!selected || !state.settings.contexts.includes(selected)) return null;

  const projectId = nextId('project');
  const createdAt = new Date().toISOString();
  const action = {
    id: nextId('action'),
    title: item.title,
    context: selected,
    status: 'active',
    createdAt,
    projectId,
    ...DEFAULT_ACTION_PLANNING,
  };
  const project = {
    id: projectId,
    title: item.title,
    outcome: trimmedOutcome,
    status: 'active',
    createdAt,
    nextActionIds: [action.id],
    planning: createProjectPlanning(),
  };

  store.update((draft) => {
    draft.inbox = draft.inbox.filter((candidate) => candidate.id !== itemId);
    draft.projects.unshift(project);
    draft.actions.unshift(action);
    return draft;
  });

  return project;
}

export function countOpenProjectActions(project, actions) {
  return actions.filter((action) => (
    action.projectId === project.id
    && action.status !== 'done'
    && action.status !== 'completed'
    && action.status !== 'trashed'
  )).length;
}

export const NATURAL_PLANNING_STEPS = PROJECT_PLANNING_STEPS;
export const PROJECT_PLANNING_FIELDS = PROJECT_PLANNING_STEPS;
export const PROJECT_PLANNING_KEY_LIST = PROJECT_PLANNING_KEYS;
export const PROJECT_PLANNING = DEFAULT_PROJECT_PLANNING;
export const DEFAULT_PLANNING = DEFAULT_PROJECT_PLANNING;

export const getPlanning = getProjectPlanning;
export const normalizePlanning = normalizeProjectPlanning;
export const countPlanningSteps = countProjectPlanningSteps;
export const countFilledPlanningSteps = countProjectPlanningSteps;
export const countCompletedPlanningSteps = countProjectPlanningSteps;
export const countProjectPlanningFields = countProjectPlanningSteps;
export const getProjectPlanningCount = countProjectPlanningSteps;
export const getPlanningCompletion = countProjectPlanningSteps;
export const countProjectPlanning = countProjectPlanningSteps;
export const saveProjectPlanning = updateProjectPlanning;
export const setProjectPlanning = updateProjectPlanning;
export const updatePlanning = updateProjectPlanning;
