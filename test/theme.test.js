import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage, createStore, emptyState, STORAGE_KEY } from '../src/store.js';
import {
  DEFAULT_THEME,
  THEMES,
  applyTheme,
  coerceTheme,
  getTheme,
  isValidTheme,
  normalizeTheme,
  resolveTheme,
  setTheme,
} from '../src/theme.js';

test('empty state defaults to the reviewer-selected dark theme', () => {
  assert.equal(DEFAULT_THEME, 'dark');
  assert.equal(emptyState().settings.theme, 'dark');
  assert.equal(getTheme(emptyState()), 'dark');
});

test('theme choices are system, light and dark', () => {
  assert.deepEqual([...THEMES], ['system', 'light', 'dark']);
});

test('normalizeTheme accepts aliases and rejects unknown values', () => {
  assert.equal(normalizeTheme('System'), 'system');
  assert.equal(normalizeTheme('auto'), 'system');
  assert.equal(normalizeTheme('LIGHT'), 'light');
  assert.equal(normalizeTheme('night'), 'dark');
  assert.equal(normalizeTheme('sepia'), null);
  assert.equal(isValidTheme('dark'), true);
  assert.equal(isValidTheme('sepia'), false);
  assert.equal(coerceTheme('sepia'), 'dark');
});

test('setTheme stores and persists a valid choice', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);

  assert.equal(setTheme(store, 'light'), 'light');
  assert.equal(store.getState().settings.theme, 'light');
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).settings.theme, 'light');
});

test('setTheme rejects invalid choices without changing state', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  const before = storage.getItem(STORAGE_KEY);

  assert.equal(setTheme(store, 'sepia'), null);
  assert.equal(store.getState().settings.theme, 'dark');
  assert.equal(storage.getItem(STORAGE_KEY), before);
});

test('saved theme choices survive reloading the store', () => {
  const storage = createMemoryStorage();
  const store = createStore(storage);
  setTheme(store, 'light');

  const reloaded = createStore(storage);
  assert.equal(getTheme(reloaded), 'light');
});

test('invalid persisted themes fall back to the default', () => {
  const storage = createMemoryStorage(JSON.stringify({
    ...emptyState(),
    settings: { ...emptyState().settings, theme: 'sepia' },
  }));

  const store = createStore(storage);
  assert.equal(store.getState().settings.theme, 'dark');
});

test('system theme follows prefers-color-scheme', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('applyTheme updates the document root data-theme', () => {
  const attributes = new Map();
  const previousDocument = globalThis.document;
  globalThis.document = {
    documentElement: {
      style: {},
      dataset: {},
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
    },
  };

  try {
    assert.equal(applyTheme('dark'), 'dark');
    assert.equal(attributes.get('data-theme'), 'dark');
    assert.equal(globalThis.document.documentElement.style.colorScheme, 'dark');

    assert.equal(applyTheme('light'), 'light');
    assert.equal(attributes.get('data-theme'), 'light');

    assert.equal(applyTheme('system'), 'system');
    assert.equal(attributes.has('data-theme'), false);
    assert.equal(globalThis.document.documentElement.style.colorScheme, 'light dark');
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
});
