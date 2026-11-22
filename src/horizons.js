import { nextId } from './store.js';
import { countOpenActions } from './actions.js';

export const HORIZONS = Object.freeze([
  {
    key: 'purpose',
    title: 'Purpose & Principles',
    description: 'Why you exist and the values that guide your choices.',
  },
  {
    key: 'vision',
    title: 'Vision',
    description: 'A vivid picture of the future you are working toward.',
  },
  {
    key: 'goals',
    title: 'Goals & Objectives',
    description: 'Specific outcomes you want to achieve in the coming year.',
  },
  {
    key: 'areas',
    title: 'Areas of Focus',
    description: 'Ongoing responsibilities you need to maintain.',
  },
  {
    key: 'projects',
    title: 'Projects',
    description: 'Outcomes that require more than one action.',
  },
  {
    key: 'actions',
    title: 'Next Actions',
    description: 'The very next physical actions you can take.',
  },
]);

export const HORIZON_KEYS = Object.freeze(HORIZONS.map((horizon) => horizon.key));

export const DEFAULT_HORIZON_SETTINGS = Object.freeze({
  purpose: '',
  principles: '',
  vision: '',
});

const SETTING_KEYS = Object.freeze(['purpose', 'principles', 'vision']);
const CLOSED_PROJECT_STATUSES = Object.freeze(['done', 'completed', 'archived', 'trashed']);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  return source ?? {};
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

function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function saveHorizonSettings(store, values = {}) {
  if (!store || typeof store.update !== 'function') return null;

  const patch = values && typeof values === 'object' ? values : {};
  const keys = SETTING_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(patch, key));
  if (!keys.length) return null;

  const state = resolveState(store);
  const current = state.settings ?? {};
  const saved = { ...current };

  keys.forEach((key) => {
    saved[key] = String(patch[key] ?? '').trim();
  });

  store.update((draft) => {
    draft.settings = { ...(draft.settings ?? {}), ...saved };
    return draft;
  });

  return {
    purpose: saved.purpose ?? '',
    principles: saved.principles ?? '',
    vision: saved.vision ?? '',
  };
}

export function addGoal(store, title, description = '') {
  const values = title && typeof title === 'object'
    ? title
    : { title, description };
  const trimmedTitle = String(values.title ?? '').trim();
  if (!trimmedTitle) return null;

  const goal = {
    id: nextId('goal'),
    title: trimmedTitle,
    description: String(values.description ?? '').trim(),
    createdAt: new Date().toISOString(),
  };

  store.update((draft) => {
    draft.goals = list(draft.goals);
    draft.goals.unshift(goal);
    return draft;
  });

  return goal;
}

export function removeGoal(store, goalId) {
  const state = resolveState(store);
  const goal = list(state.goals).find((candidate) => candidate.id === goalId);
  if (!goal) return null;

  store.update((draft) => {
    draft.goals = list(draft.goals).filter((candidate) => candidate.id !== goalId);
    return draft;
  });

  return goal;
}

export function countOpenProjects(projects) {
  return list(projects).filter((project) => (
    !CLOSED_PROJECT_STATUSES.includes(project.status)
  )).length;
}

export function getHorizonCounts(source = {}) {
  const state = resolveState(source);

  const counts = {
    areas: list(state.areas).length,
    projects: countOpenProjects(state.projects),
    nextActions: countOpenActions(list(state.actions)),
  };

  return addAliases(counts, {
    goals: list(state.goals).length,
    actions: counts.nextActions,
    openActions: counts.nextActions,
    openProjects: counts.projects,
    openNextActions: counts.nextActions,
    areasCount: counts.areas,
    areaCount: counts.areas,
    projectsCount: counts.projects,
    projectCount: counts.projects,
    nextActionsCount: counts.nextActions,
    nextActionCount: counts.nextActions,
    goalsCount: list(state.goals).length,
  });
}

export function buildHorizons(source = {}) {
  const state = resolveState(source);
  const settings = { ...DEFAULT_HORIZON_SETTINGS, ...(state.settings ?? {}) };
  const goals = list(state.goals);
  const counts = getHorizonCounts(state);

  return HORIZONS.map((horizon) => {
    let count = null;
    let summary = '';

    if (horizon.key === 'purpose') {
      const parts = [settings.purpose, settings.principles].filter((value) => value);
      summary = parts.length ? parts.join(' · ') : 'Not set';
    } else if (horizon.key === 'vision') {
      summary = settings.vision || 'Not set';
    } else if (horizon.key === 'goals') {
      count = goals.length;
      summary = plural(goals.length, 'goal');
    } else if (horizon.key === 'areas') {
      count = counts.areas;
      summary = plural(counts.areas, 'area');
    } else if (horizon.key === 'projects') {
      count = counts.projects;
      summary = `${plural(counts.projects, 'open project')}`;
    } else if (horizon.key === 'actions') {
      count = counts.nextActions;
      summary = `${plural(counts.nextActions, 'open next action')}`;
    }

    return addAliases({
      ...horizon,
      count,
      summary,
      purpose: settings.purpose,
      principles: settings.principles,
      vision: settings.vision,
    }, {
      label: horizon.title,
      name: horizon.title,
      horizon: horizon.key,
    });
  });
}

export const updateHorizonSettings = saveHorizonSettings;
export const setHorizonSettings = saveHorizonSettings;
export const saveHorizons = saveHorizonSettings;
export const saveHorizon = saveHorizonSettings;
export const updateHorizons = saveHorizonSettings;

export const setPurpose = (store, value) => saveHorizonSettings(store, { purpose: value });
export const setPrinciples = (store, value) => saveHorizonSettings(store, { principles: value });
export const setVision = (store, value) => saveHorizonSettings(store, { vision: value });

export const savePurpose = setPurpose;
export const savePrinciples = setPrinciples;
export const saveVision = setVision;
export const updatePurpose = setPurpose;
export const updatePrinciples = setPrinciples;
export const updateVision = setVision;

export const createGoal = addGoal;
export const deleteGoal = removeGoal;

export const countHorizons = getHorizonCounts;
export const countHorizonItems = getHorizonCounts;
export const getHorizonCount = getHorizonCounts;
export const horizonCounts = getHorizonCounts;

export const getHorizons = buildHorizons;
export const getHorizonRows = buildHorizons;
export const buildHorizonList = buildHorizons;
export const horizons = buildHorizons;
