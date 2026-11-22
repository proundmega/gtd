import { nextId } from './store.js';

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
  };
  const project = {
    id: projectId,
    title: item.title,
    outcome: trimmedOutcome,
    status: 'active',
    createdAt,
    nextActionIds: [action.id],
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
