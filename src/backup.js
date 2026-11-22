import { emptyState } from './store.js';

export const BACKUP_FILENAME = 'gtd-planner-backup.json';

export const BACKUP_LISTS = Object.freeze([
  'inbox',
  'actions',
  'projects',
  'waiting',
  'someday',
  'reference',
  'calendar',
  'areas',
  'goals',
  'reviews',
]);

export const BACKUP_LIST_KEYS = BACKUP_LISTS;
export const REQUIRED_LISTS = BACKUP_LISTS;
export const GTD_LISTS = BACKUP_LISTS;

let lastImportError = '';

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  return source;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function parseValue(value) {
  if (typeof value === 'string') {
    try {
      return { ok: true, value: JSON.parse(value) };
    } catch {
      return { ok: false, error: 'Backup is not valid JSON.' };
    }
  }
  return { ok: true, value };
}

function validateValue(value) {
  if (!isPlainObject(value)) {
    return { ok: false, error: 'Backup must be a JSON object.' };
  }

  for (const key of BACKUP_LISTS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return { ok: false, error: `Backup is missing the ${key} list.` };
    }
    if (!Array.isArray(value[key])) {
      return { ok: false, error: `Backup list ${key} must be an array.` };
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, 'settings')
    && !isPlainObject(value.settings)) {
    return { ok: false, error: 'Backup settings must be an object.' };
  }

  return { ok: true, value };
}

function normalize(value) {
  const defaults = emptyState();
  const settings = isPlainObject(value.settings)
    ? { ...defaults.settings, ...value.settings }
    : defaults.settings;

  return {
    ...defaults,
    ...clone(value),
    settings,
  };
}

function validateParsed(value) {
  const parsed = parseValue(value);
  if (!parsed.ok) return parsed;
  return validateValue(parsed.value);
}

export function exportBackup(source, space = 2) {
  return JSON.stringify(resolveState(source) ?? emptyState(), null, space);
}

export const serializeBackup = exportBackup;
export const stringifyBackup = exportBackup;
export const createBackup = exportBackup;
export const exportState = exportBackup;
export const exportJSON = exportBackup;
export const exportData = exportBackup;
export const serializeState = exportBackup;
export const toBackup = exportBackup;

export const validateState = validateBackup;
export const isValidState = validateBackup;

export function validateBackup(value) {
  return validateParsed(value).ok;
}

export const isValidBackup = validateBackup;
export const validateBackupState = validateBackup;
export const isBackupValid = validateBackup;

export function getBackupError(value) {
  const result = validateParsed(value);
  return result.ok ? '' : result.error;
}

export function getLastImportError() {
  return lastImportError;
}

export function parseBackup(value) {
  const result = validateParsed(value);
  if (!result.ok) {
    lastImportError = result.error;
    throw new Error(result.error);
  }
  lastImportError = '';
  return normalize(result.value);
}

export const deserializeBackup = parseBackup;
export const readBackup = parseBackup;
export const importBackupOrThrow = parseBackup;
export const parseBackupState = parseBackup;
export const loadBackupOrThrow = parseBackup;

export function importBackup(value, maybeValue) {
  if (value && typeof value.getState === 'function' && typeof value.update === 'function') {
    return applyBackup(value, maybeValue);
  }
  try {
    return parseBackup(value);
  } catch {
    return null;
  }
}

export const importState = importBackup;
export const importData = importBackup;
export const loadBackup = importBackup;
export const restoreBackup = importBackup;
export const applyImport = importBackup;
export const deserializeState = importBackup;
export const parseState = importBackup;

export function tryImportBackup(value) {
  try {
    return { ok: true, state: parseBackup(value), error: '' };
  } catch (error) {
    return { ok: false, state: null, error: error.message };
  }
}

export const importBackupResult = tryImportBackup;
export const safeImportBackup = tryImportBackup;

export function applyBackup(storeOrValue, maybeValue) {
  if (storeOrValue && typeof storeOrValue.getState === 'function'
    && typeof storeOrValue.update === 'function') {
    const state = importBackup(maybeValue);
    if (!state) return null;
    storeOrValue.update(() => state);
    return state;
  }
  return importBackup(storeOrValue);
}

export const importIntoStore = applyBackup;
export const replaceState = applyBackup;
export const restoreState = applyBackup;
