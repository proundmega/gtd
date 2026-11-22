function list(value) {
  return Array.isArray(value) ? value : [];
}

function resolveState(source) {
  if (source && typeof source.getState === 'function') return source.getState();
  return source ?? {};
}

function text(value) {
  if (value == null) return '';
  return String(value);
}

export const SEARCH_GROUPS = Object.freeze([
  {
    key: 'inbox',
    label: 'Inbox',
    fields: [
      { key: 'title', label: 'Title' },
    ],
  },
  {
    key: 'actions',
    label: 'Next Actions',
    fields: [
      { key: 'title', label: 'Title' },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'outcome', label: 'Outcome' },
    ],
  },
  {
    key: 'waiting',
    label: 'Waiting For',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'person', label: 'Person' },
    ],
  },
  {
    key: 'someday',
    label: 'Someday/Maybe',
    fields: [
      { key: 'title', label: 'Title' },
    ],
  },
  {
    key: 'reference',
    label: 'Reference',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'note', label: 'Note' },
    ],
  },
  {
    key: 'calendar',
    label: 'Calendar',
    fields: [
      { key: 'title', label: 'Title' },
    ],
  },
  {
    key: 'areas',
    label: 'Areas of Focus',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
    ],
  },
  {
    key: 'goals',
    label: 'Goals',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
    ],
  },
]);

export const SEARCH_LISTS = SEARCH_GROUPS;
export const SEARCH_CATEGORIES = SEARCH_GROUPS;
export const SEARCH_SECTIONS = SEARCH_GROUPS;

export function normalizeSearchQuery(query) {
  return text(query).trim().toLowerCase();
}

export function searchQueryIsEmpty(query) {
  return normalizeSearchQuery(query) === '';
}

function primaryText(item, fields) {
  for (const field of fields) {
    const value = text(item?.[field.key]).trim();
    if (value) return value;
  }
  return '';
}

function createResult(spec, item, field, matchedValue) {
  const primary = primaryText(item, spec.fields);
  return {
    id: item?.id ?? null,
    key: spec.key,
    listKey: spec.key,
    list: spec.key,
    listLabel: spec.label,
    listName: spec.label,
    label: spec.label,
    title: primary,
    text: primary,
    field: field.key,
    fieldLabel: field.label,
    matched: matchedValue,
    value: matchedValue,
    item,
  };
}

export function searchItems(source, query) {
  const term = normalizeSearchQuery(query);
  if (!term) return [];

  const state = resolveState(source);
  const results = [];

  SEARCH_GROUPS.forEach((spec) => {
    list(state?.[spec.key]).forEach((item) => {
      if (!item || typeof item !== 'object') return;
      let match = null;
      for (const field of spec.fields) {
        const value = text(item[field.key]);
        if (value.toLowerCase().includes(term)) {
          match = { field, value };
          break;
        }
      }
      if (match) results.push(createResult(spec, item, match.field, match.value));
    });
  });

  const groups = groupSearchResults(results);
  const byList = {};
  groups.forEach((group) => {
    byList[group.key] = group;
  });
  Object.defineProperties(results, {
    groups: { value: groups, enumerable: false },
    grouped: { value: groups, enumerable: false },
    byList: { value: byList, enumerable: false },
    lists: { value: byList, enumerable: false },
    total: { value: results.length, enumerable: false },
  });
  Object.entries(byList).forEach(([key, group]) => {
    if (key in results) return;
    Object.defineProperty(results, key, { value: group, enumerable: false });
  });
  results.forEach((result) => {
    const group = byList[result.listKey];
    if (!group) return;
    Object.defineProperties(result, {
      count: { value: group.count, enumerable: false },
      items: { value: group.items, enumerable: false },
      matches: { value: group.matches, enumerable: false },
    });
  });

  return results;
}

export function groupSearchResults(results, query) {
  if (query !== undefined && results && typeof results === 'object' && !Array.isArray(results)) {
    return groupSearchResults(searchItems(results, query));
  }
  if (results && typeof results === 'object' && !Array.isArray(results) && results.state) {
    return groupSearchResults(results.state);
  }

  const entries = Array.isArray(results) ? results : [];
  const grouped = new Map();

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const key = entry.listKey ?? entry.key;
    if (!key) return;
    const spec = SEARCH_GROUPS.find((candidate) => candidate.key === key);
    const label = entry.listLabel ?? entry.label ?? spec?.label ?? key;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        listKey: key,
        list: key,
        label,
        listLabel: label,
        listName: label,
        name: label,
        count: 0,
        items: [],
        matches: [],
        results: [],
      });
    }
    const group = grouped.get(key);
    const item = entry.item && typeof entry.item === 'object'
      ? entry.item
      : entry;
    group.items.push(item);
    group.matches.push(item);
    group.results.push(item);
    group.count += 1;
  });

  return SEARCH_GROUPS
    .map((spec) => grouped.get(spec.key))
    .filter(Boolean);
}

export function searchGroups(source, query) {
  return groupSearchResults(searchItems(source, query));
}

export const search = searchItems;
export const searchAll = searchItems;
export const searchState = searchItems;
export const searchEverywhere = searchItems;
export const searchAllLists = searchItems;
export const findSearchMatches = searchItems;
export const findMatches = searchItems;
export const getSearchResults = searchItems;
export const buildSearchResults = searchItems;
export const performSearch = searchItems;

export const groupResults = groupSearchResults;
export const groupSearchMatches = groupSearchResults;
export const groupByList = groupSearchResults;
export const getSearchGroups = searchGroups;
export const getGroupedSearchResults = searchGroups;
export const buildSearchGroups = searchGroups;
export const searchGrouped = searchGroups;
export const searchAllByList = searchGroups;
export const searchByList = searchGroups;
export const searchResultsByList = searchGroups;
