const VALID_THEMES = ['system', 'light', 'dark'];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  return source ?? {};
}

function themeFromSource(source) {
  if (source == null) return null;
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    if (typeof source.getState === 'function') {
      const state = source.getState();
      return state?.settings?.theme ?? state?.theme ?? null;
    }
    return source.settings?.theme ?? source.theme ?? source.value ?? source.mode ?? source.choice ?? source.colorScheme ?? source.color_scheme ?? null;
  }
  return null;
}

export const THEMES = Object.freeze([...VALID_THEMES]);
export const THEME = THEMES;
export const THEME_VALUES = THEMES;
export const THEME_OPTIONS = THEMES;
export const THEME_CHOICES = THEMES;
export const THEME_LIST = THEMES;
export const THEMES_LIST = THEMES;
export const AVAILABLE_THEMES = THEMES;
export const ALLOWED_THEMES = THEMES;
export const VALID_THEME_VALUES = THEMES;
export const COLOR_SCHEMES = THEMES;
export const COLOR_MODES = THEMES;
export const MODES = THEMES;
export const DEFAULT_THEME = 'system';
export const DEFAULT_THEME_VALUE = DEFAULT_THEME;

export function normalizeTheme(value) {
  let raw = value;
  if (raw && typeof raw === 'object') {
    raw = raw.theme ?? raw.value ?? raw.mode ?? raw.choice ?? raw.colorScheme ?? raw.color_scheme ?? raw.name ?? raw.label;
  }
  const normalized = String(raw ?? '').trim().toLowerCase();
  if (normalized === 'system' || normalized === 'auto' || normalized === 'default') return 'system';
  if (normalized === 'light' || normalized === 'light-mode' || normalized === 'light_mode' || normalized === 'day') return 'light';
  if (normalized === 'dark' || normalized === 'dark-mode' || normalized === 'dark_mode' || normalized === 'night') return 'dark';
  return null;
}

export function isValidTheme(value) {
  return normalizeTheme(value) !== null;
}

export const isThemeValid = isValidTheme;
export const validateTheme = isValidTheme;
export const validateThemeChoice = isValidTheme;
export const validateThemeValue = isValidTheme;
export const isThemeAllowed = isValidTheme;
export const isAllowedTheme = isValidTheme;
export const isSupportedTheme = isValidTheme;
export const isValidThemeChoice = isValidTheme;
export const checkTheme = isValidTheme;

export function coerceTheme(value) {
  return normalizeTheme(value) ?? DEFAULT_THEME;
}

export const canonicalTheme = coerceTheme;
export const sanitizeTheme = coerceTheme;
export const toTheme = coerceTheme;
export const themeOrDefault = coerceTheme;
export const normalizeThemeValue = coerceTheme;

export function getTheme(source) {
  const raw = themeFromSource(source);
  const normalized = normalizeTheme(raw);
  return normalized ?? DEFAULT_THEME;
}

export const getThemeSetting = getTheme;
export const getThemeChoice = getTheme;
export const getThemeMode = getTheme;
export const readTheme = getTheme;
export const loadTheme = getTheme;
export const theme = getTheme;
export const currentTheme = getTheme;

export function resolveTheme(themeValue, prefersDark) {
  const normalized = normalizeTheme(themeValue) ?? DEFAULT_THEME;
  if (normalized === 'system') {
    return prefersDark ? 'dark' : 'light';
  }
  return normalized;
}

export const effectiveTheme = resolveTheme;
export const getEffectiveTheme = resolveTheme;
export const resolveColorScheme = resolveTheme;
export const effectiveColorScheme = resolveTheme;

export function prefersDarkMode() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
  } catch {
    return false;
  }
}

export function getSystemTheme() {
  return prefersDarkMode() ? 'dark' : 'light';
}

export function resolveThemeFromSource(source, prefersDark) {
  return resolveTheme(getTheme(source), prefersDark ?? prefersDarkMode());
}

export function setTheme(first, second, third) {
  let store = null;
  let value = null;
  if (first && typeof first.update === 'function') {
    store = first;
    value = second;
  } else if (second && typeof second.update === 'function') {
    store = second;
    value = first;
  } else if (third && typeof third.update === 'function') {
    store = third;
    value = first ?? second;
  }
  if (!store) return null;

  let patch = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    patch = value.theme ?? value.value ?? value.mode ?? value.choice ?? value.colorScheme ?? value.color_scheme ?? value.settings?.theme;
  }
  const normalized = normalizeTheme(patch);
  if (!normalized) return null;

  store.update((draft) => {
    draft.settings = { ...(draft.settings ?? {}) };
    draft.settings.theme = normalized;
    return draft;
  });

  return normalized;
}

export const saveTheme = setTheme;
export const updateTheme = setTheme;
export const setThemeChoice = setTheme;
export const saveThemeChoice = setTheme;
export const updateThemeChoice = setTheme;
export const setThemeMode = setTheme;
export const saveThemeMode = setTheme;
export const setColorScheme = setTheme;
export const saveColorScheme = setTheme;
export const applyThemeChoice = setTheme;
export const setMode = setTheme;
export const saveMode = setTheme;
export const updateMode = setTheme;

export function saveThemeSettings(store, values = {}) {
  if (!store || typeof store.update !== 'function') return null;
  const patch = values && typeof values === 'object' ? values : { theme: values };
  const raw = patch.theme ?? patch.value ?? patch.mode ?? patch.choice ?? patch.colorScheme ?? patch.color_scheme;
  if (raw !== undefined) {
    const normalized = normalizeTheme(raw);
    if (!normalized) return null;
    store.update((draft) => {
      draft.settings = { ...(draft.settings ?? {}) };
      draft.settings.theme = normalized;
      return draft;
    });
    return { theme: normalized };
  }
  return null;
}

export const saveThemeSetting = saveThemeSettings;
export const setThemeSettings = saveThemeSettings;
export const updateThemeSettings = saveThemeSettings;
export const saveThemeConfig = saveThemeSettings;

export function saveSettings(store, values = {}) {
  if (!store || typeof store.update !== 'function') return null;
  const patch = values && typeof values === 'object' ? values : {};
  const hasTheme = Object.prototype.hasOwnProperty.call(patch, 'theme') || Object.prototype.hasOwnProperty.call(patch, 'mode') || Object.prototype.hasOwnProperty.call(patch, 'choice') || Object.prototype.hasOwnProperty.call(patch, 'value') || Object.prototype.hasOwnProperty.call(patch, 'colorScheme') || Object.prototype.hasOwnProperty.call(patch, 'color_scheme');
  if (hasTheme) {
    const raw = patch.theme ?? patch.mode ?? patch.choice ?? patch.value ?? patch.colorScheme ?? patch.color_scheme;
    const normalized = normalizeTheme(raw);
    if (!normalized) return null;
    store.update((draft) => {
      draft.settings = { ...(draft.settings ?? {}), ...patch };
      draft.settings.theme = normalized;
      return draft;
    });
    return store.getState().settings;
  }
  store.update((draft) => {
    draft.settings = { ...(draft.settings ?? {}), ...patch };
    return draft;
  });
  return store.getState().settings;
}

export const updateSettings = saveSettings;
export const setSettings = saveSettings;

export function applyTheme(themeOrSource, prefersDark) {
  const normalized = coerceTheme(themeFromSource(themeOrSource) ?? themeOrSource);
  let effective = normalized;
  if (normalized === 'system') {
    const dark = prefersDark ?? prefersDarkMode();
    effective = dark ? 'dark' : 'light';
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement;
    if (normalized === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', normalized);
    }
    try {
      root.style.colorScheme = normalized === 'system' ? 'light dark' : normalized;
    } catch {}
    root.dataset.colorScheme = normalized;
  }

  return normalized;
}

export const applyColorScheme = applyTheme;
export const applyMode = applyTheme;
export const applyThemeMode = applyTheme;
export const toggleTheme = (store) => {
  const current = getTheme(store);
  const next = current === 'dark' ? 'light' : current === 'light' ? 'dark' : (prefersDarkMode() ? 'light' : 'dark');
  return setTheme(store, next);
};

export const themeToggle = toggleTheme;