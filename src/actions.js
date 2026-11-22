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
