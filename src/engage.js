import { DEFAULT_ACTION_PLANNING, filterActionsByContext } from './actions.js';

export const ENGAGE_ENERGIES = Object.freeze(['any', 'low', 'medium', 'high']);
export const ENGAGE_TIME_OPTIONS = Object.freeze(['any', 15, 30, 60]);

export const ENERGY_LEVELS = Object.freeze({
  low: Object.freeze(['low']),
  medium: Object.freeze(['low', 'medium']),
  high: Object.freeze(['low', 'medium', 'high']),
});

export const PRIORITY_RANK = Object.freeze({ high: 0, medium: 1, low: 2 });

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  if (Array.isArray(source)) return { actions: source };
  return source ?? {};
}

function normalizeEnergy(value) {
  const energy = String(value ?? 'any').trim().toLowerCase();
  if (!energy || energy === 'all' || energy === 'any') return 'any';
  return ENERGY_LEVELS[energy] ? energy : 'any';
}

function normalizeActionEnergy(value) {
  const energy = String(value ?? '').trim().toLowerCase();
  return ENERGY_LEVELS[energy] ? energy : DEFAULT_ACTION_PLANNING.energy;
}

function normalizeTime(value) {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  if (!text || text === 'any' || text === 'all') return null;
  const minutes = Number(text);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

function normalizeActionTime(value) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0
    ? minutes
    : DEFAULT_ACTION_PLANNING.timeMinutes;
}

function normalizePriority(value) {
  const priority = String(value ?? '').trim().toLowerCase();
  return priority in PRIORITY_RANK ? priority : 'medium';
}

export function filterActiveActions(actions) {
  return asList(actions).filter((action) => action.status === 'active');
}

export function filterActionsByEnergy(actions, energy = 'any') {
  const selected = normalizeEnergy(energy);
  if (selected === 'any') return asList(actions);
  const levels = ENERGY_LEVELS[selected];
  return asList(actions).filter((action) => (
    levels.includes(normalizeActionEnergy(action.energy))
  ));
}

export function filterActionsByTime(actions, availableTime = 'any') {
  const available = normalizeTime(availableTime);
  if (available == null) return asList(actions);
  return asList(actions).filter((action) => (
    normalizeActionTime(action.timeMinutes) <= available
  ));
}

function resolveFilters(options, energy, timeMinutes) {
  if (typeof options === 'string' || options == null) {
    return {
      context: options,
      energy,
      timeMinutes,
    };
  }

  return {
    context: options.context ?? options.contextFilter ?? 'all',
    energy: options.energy ?? options.energyFilter ?? 'any',
    timeMinutes: options.timeMinutes
      ?? options.time
      ?? options.availableTime
      ?? options.timeFilter
      ?? 'any',
  };
}

export function filterEngageActions(source, options = {}, energy, timeMinutes) {
  const state = resolveState(source);
  const actions = Array.isArray(source) ? source : asList(state.actions);
  const filters = resolveFilters(options, energy, timeMinutes);

  const active = filterActiveActions(actions);
  const byContext = filterActionsByContext(active, filters.context);
  const byEnergy = filterActionsByEnergy(byContext, filters.energy);
  return filterActionsByTime(byEnergy, filters.timeMinutes);
}

export function sortActionsByPriority(actions) {
  return [...asList(actions)].sort((a, b) => {
    const aPriority = PRIORITY_RANK[normalizePriority(a.priority)];
    const bPriority = PRIORITY_RANK[normalizePriority(b.priority)];
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}

export function getEngageActions(source, options = {}, energy, timeMinutes) {
  return sortActionsByPriority(filterEngageActions(source, options, energy, timeMinutes));
}

export function getBestNextAction(source, options = {}, energy, timeMinutes) {
  return getEngageActions(source, options, energy, timeMinutes)[0] ?? null;
}

export function buildEngageView(source, options = {}, energy, timeMinutes) {
  const actions = getEngageActions(source, options, energy, timeMinutes);
  return {
    best: actions[0] ?? null,
    actions,
  };
}

export const ENERGY_OPTIONS = ENGAGE_ENERGIES;
export const TIME_OPTIONS = ENGAGE_TIME_OPTIONS;
export const ENGAGE_ENERGY_OPTIONS = ENGAGE_ENERGIES;
export const ENGAGE_TIMES = ENGAGE_TIME_OPTIONS;
export const ENERGY_FILTER_OPTIONS = ENGAGE_ENERGIES;
export const TIME_FILTER_OPTIONS = ENGAGE_TIME_OPTIONS;

export const filterActionsForEngage = filterEngageActions;
export const filterEngageList = filterEngageActions;
export const filterByContext = filterActionsByContext;
export const filterByEnergy = filterActionsByEnergy;
export const filterByTime = filterActionsByTime;
export const filterActive = filterActiveActions;
export const getAvailableActions = getEngageActions;
export const getNextActionsForEngage = getEngageActions;
export const getEngageList = getEngageActions;
export const buildEngageList = getEngageActions;
export const engageActions = getEngageActions;

export const sortByPriority = sortActionsByPriority;
export const sortEngageActions = sortActionsByPriority;
export const sortActionsForEngage = sortActionsByPriority;

export const getNextBestAction = getBestNextAction;
export const getBestAction = getBestNextAction;
export const getNextAction = getBestNextAction;
export const selectBestNextAction = getBestNextAction;
export const selectNextAction = getBestNextAction;
export const pickNextAction = getBestNextAction;
export const chooseNextAction = getBestNextAction;
export const bestNextAction = getBestNextAction;
export const nextBestAction = getBestNextAction;
export const getTopAction = getBestNextAction;

export { filterActionsByContext };
export { completeAction } from './actions.js';
