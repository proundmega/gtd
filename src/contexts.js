function list(value) {
  return Array.isArray(value) ? value : [];
}

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  return source ?? {};
}

function contextList(source) {
  return list(resolveState(source)?.settings?.contexts);
}

function actionsFrom(value) {
  if (Array.isArray(value)) return value;
  const state = resolveState(value);
  return list(state?.actions);
}

function normalizeContext(value) {
  return String(value ?? '').trim();
}

function sameContext(left, right) {
  return String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
}

function contextName(value) {
  if (value && typeof value === 'object') {
    return normalizeContext(value.context ?? value.name ?? value.value);
  }
  return normalizeContext(value);
}

export function addContext(store, context) {
  if (!store || typeof store.update !== 'function') return null;

  const name = contextName(context);
  if (!name) return null;
  if (contextList(store).some((candidate) => sameContext(candidate, name))) return null;

  store.update((draft) => {
    draft.settings = { ...(draft.settings ?? {}) };
    draft.settings.contexts = [...list(draft.settings.contexts), name];
    return draft;
  });

  return name;
}

export function removeContext(store, context) {
  if (!store || typeof store.update !== 'function') return null;

  const name = contextName(context);
  if (!name) return null;

  const existing = contextList(store).find((candidate) => sameContext(candidate, name));
  if (!existing) return null;

  const actions = actionsFrom(store);
  if (countActionsForContext(existing, actions) > 0) return null;

  store.update((draft) => {
    draft.settings = { ...(draft.settings ?? {}) };
    draft.settings.contexts = list(draft.settings.contexts)
      .filter((candidate) => !sameContext(candidate, existing));
    return draft;
  });

  return existing;
}

export function countActionsForContext(context, actions) {
  let selected = context;
  let source = actions;

  if (typeof context !== 'string' && typeof actions === 'string') {
    selected = actions;
    source = context;
  }

  const name = contextName(selected);
  if (!name) return 0;

  return actionsFrom(source).filter((action) => (
    action
    && action.status === 'active'
    && sameContext(action.context, name)
  )).length;
}

export function countActionsByContext(actions) {
  const counts = {};

  actionsFrom(actions).forEach((action) => {
    if (!action || action.status !== 'active') return;
    const name = normalizeContext(action.context);
    if (!name) return;
    counts[name] = (counts[name] || 0) + 1;
  });

  return counts;
}

export function countContextUsage(source, context) {
  if (context !== undefined) return countActionsForContext(context, source);
  if (typeof source === 'string') return countActionsForContext(source, []);
  return countActionsByContext(source);
}

export function listContexts(source) {
  return [...contextList(source)];
}

export function buildContexts(source) {
  const state = resolveState(source);
  const actions = actionsFrom(state);
  const entries = list(state?.settings?.contexts).map((context) => {
    const count = countActionsForContext(context, actions);
    return {
      context,
      name: context,
      label: context,
      count,
      activeActions: count,
    };
  });

  Object.defineProperty(entries, 'byContext', {
    value: Object.fromEntries(entries.map((entry) => [entry.context, entry.count])),
    enumerable: false,
  });

  return entries;
}

export const createContext = addContext;
export const addContextToSettings = addContext;
export const saveContext = addContext;

export const deleteContext = removeContext;
export const removeContextFromSettings = removeContext;

export const countContextActions = countActionsForContext;
export const countActiveActionsForContext = countActionsForContext;
export const countActiveActionsFor = countActionsForContext;
export const countActionsInContext = countActionsForContext;
export const getContextActionCount = countActionsForContext;
export const getContextCount = countActionsForContext;

export const countUsage = countContextUsage;
export const getUsage = countContextUsage;
export const getContextUsageCount = countContextUsage;
export const countContext = countContextUsage;

export const getActionsByContext = countActionsByContext;
export const countByContext = countActionsByContext;
export const countActiveActionsByContext = countActionsByContext;

export const getContexts = listContexts;
export const getContextList = listContexts;
export const contextNames = listContexts;

export const getContextUsage = buildContexts;
export const buildContextUsage = buildContexts;
export const contextUsage = buildContexts;
export const getContextsWithUsage = buildContexts;
export const buildContextList = buildContexts;
