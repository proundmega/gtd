export const ACTION_PRIORITIES = Object.freeze(['low', 'medium', 'high']);
export const ACTION_ENERGIES = Object.freeze(['low', 'medium', 'high']);

export const DEFAULT_ACTION_PLANNING = Object.freeze({
  priority: 'medium',
  energy: 'medium',
  timeMinutes: 15,
});

export function countOpenActions(actions) {
  const list = Array.isArray(actions) ? actions : [];
  return list.filter((action) => (
    action && action.status === 'active' && !isArchived(action)
  )).length;
}

export function sortActionsNewestFirst(actions) {
  return [...actions].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
}

export function filterActionsByContext(actions, context) {
  const selected = String(context ?? '').trim();
  if (!selected || selected === 'all') return [...actions];
  return actions.filter((action) => action.context === selected);
}

export function resolveProjectName(projectId, projects) {
  if (!projectId) return null;
  const project = projects.find((candidate) => candidate.id === projectId);
  return project ? project.title : null;
}

export function isValidPriority(value) {
  return ACTION_PRIORITIES.includes(value);
}

export function isValidEnergy(value) {
  return ACTION_ENERGIES.includes(value);
}

export function isValidTimeMinutes(value) {
  const minutes = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(minutes) && minutes > 0;
}

export function updateActionPlanning(store, actionId, planning, energy, timeMinutes) {
  const values = planning && typeof planning === 'object'
    ? planning
    : { priority: planning, energy, timeMinutes };

  if (
    !isValidPriority(values.priority)
    || !isValidEnergy(values.energy)
    || !isValidTimeMinutes(values.timeMinutes)
  ) {
    return null;
  }

  const state = store.getState();
  const action = state.actions.find((candidate) => candidate.id === actionId);
  if (!action) return null;

  const updated = {
    ...action,
    priority: values.priority,
    energy: values.energy,
    timeMinutes: Number(values.timeMinutes),
  };

  store.update((draft) => {
    draft.actions = draft.actions.map((candidate) => (
      candidate.id === actionId ? updated : candidate
    ));
    return draft;
  });

  return updated;
}

export function completeAction(store, actionId) {
  const state = store.getState();
  const action = state.actions.find((candidate) => candidate.id === actionId);
  if (!action) return null;

  const updated = { ...action, status: 'done' };

  store.update((draft) => {
    draft.actions = draft.actions.map((candidate) => (
      candidate.id === actionId ? updated : candidate
    ));
    return draft;
  });

  return updated;
}

const ACTION_ARCHIVE_KEYS = ['archive', 'archivedActions', 'archived', 'archivedActionsList'];

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  return source ?? {};
}

function actionsFrom(source) {
  const state = resolveState(source);
  return Array.isArray(state?.actions) ? state.actions : Array.isArray(source) ? source : [];
}

function archiveFrom(source) {
  const state = resolveState(source);
  for (const key of ACTION_ARCHIVE_KEYS) {
    if (Array.isArray(state?.[key])) return state[key];
  }
  if (Array.isArray(source)) return source;
  return [];
}

function syncArchive(draft, value) {
  ACTION_ARCHIVE_KEYS.forEach((key) => {
    draft[key] = value;
  });
  return draft;
}

function resolveArchivedAt(value) {
  if (value == null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function getArchivedActions(source) {
  const state = resolveState(source);
  const archive = archiveFrom(state);
  return [...archive];
}

export const getArchive = getArchivedActions;
export const listArchivedActions = getArchivedActions;
export const listArchived = getArchivedActions;
export const listArchive = getArchivedActions;
export const getArchived = getArchivedActions;

export function countArchivedActions(source) {
  return getArchivedActions(source).length;
}

export const countArchived = countArchivedActions;
export const countArchive = countArchivedActions;

export function isArchived(action) {
  if (!action) return false;
  if (action.archived === true || action.isArchived === true) return true;
  if (action.archivedAt) return true;
  const status = String(action.status ?? '').toLowerCase();
  return status === 'archived';
}

export function filterArchivedActions(actions) {
  return (Array.isArray(actions) ? actions : []).filter(isArchived);
}

export function filterActiveActionsForArchive(actions) {
  return (Array.isArray(actions) ? actions : []).filter((action) => (
    action && action.status === 'active' && !isArchived(action)
  ));
}

export function archiveAction(store, actionId, archivedAt = null) {
  if (!store || typeof store.update !== 'function') return null;

  const state = store.getState();
  const action = (state.actions || []).find((candidate) => candidate.id === actionId);
  if (!action) return null;

  const archived = {
    ...action,
    status: 'archived',
    archivedAt: resolveArchivedAt(archivedAt),
  };

  store.update((draft) => {
    draft.actions = (draft.actions || []).filter((candidate) => candidate.id !== actionId);
    const currentArchive = archiveFrom(draft);
    const nextArchive = [archived, ...currentArchive.filter((candidate) => candidate.id !== actionId)];
    syncArchive(draft, nextArchive);
    return draft;
  });

  return archived;
}

export function restoreAction(store, actionId) {
  if (!store || typeof store.update !== 'function') return null;

  const state = store.getState();
  const archived = archiveFrom(state).find((candidate) => candidate.id === actionId);
  if (!archived) return null;

  const restored = {
    ...archived,
    status: 'done',
    archivedAt: null,
  };

  store.update((draft) => {
    const currentArchive = archiveFrom(draft);
    const nextArchive = currentArchive.filter((candidate) => candidate.id !== actionId);
    syncArchive(draft, nextArchive);
    draft.actions = [restored, ...(draft.actions || [])];
    return draft;
  });

  return restored;
}

export const archiveCompletedAction = archiveAction;
export const archiveCompleted = archiveAction;
export const archiveDoneAction = archiveAction;
export const archiveDone = archiveAction;
export const archiveItem = archiveAction;
export const archive = archiveAction;

export const restoreArchivedAction = restoreAction;
export const restoreArchived = restoreAction;
export const restoreCompletedAction = restoreAction;
export const restoreCompleted = restoreAction;
export const restoreItem = restoreAction;
export const unarchiveAction = restoreAction;
export const unarchive = restoreAction;
export const unarchiveCompletedAction = restoreAction;
export const unarchiveCompleted = restoreAction;

export const archived = getArchivedActions;
export const archiveList = getArchivedActions;
export const getArchiveList = getArchivedActions;
export const getArchivedList = getArchivedActions;

export const isArchivedAction = isArchived;
export const actionIsArchived = isArchived;

export const filterArchived = filterArchivedActions;
