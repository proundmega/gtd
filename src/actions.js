export const ACTION_PRIORITIES = Object.freeze(['low', 'medium', 'high']);
export const ACTION_ENERGIES = Object.freeze(['low', 'medium', 'high']);

export const DEFAULT_ACTION_PLANNING = Object.freeze({
  priority: 'medium',
  energy: 'medium',
  timeMinutes: 15,
});

export function countOpenActions(actions) {
  return actions.filter((action) => action.status === 'active').length;
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
