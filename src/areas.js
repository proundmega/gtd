import { nextId } from './store.js';

function list(value) {
  return Array.isArray(value) ? value : [];
}

function projectsFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.projects)) return value.projects;
  return [];
}

export function resolveAreaName(areaId, areas) {
  if (!areaId) return null;
  const area = list(areas).find((candidate) => candidate.id === areaId);
  return area ? area.name : null;
}

export function addArea(store, name, description = '') {
  const trimmedName = String(name ?? '').trim();
  if (!trimmedName) return null;

  const area = {
    id: nextId('area'),
    name: trimmedName,
    description: String(description ?? '').trim(),
    createdAt: new Date().toISOString(),
  };

  store.update((draft) => {
    draft.areas = list(draft.areas);
    draft.areas.unshift(area);
    return draft;
  });

  return area;
}

export function assignProjectToArea(store, projectId, areaId) {
  const state = store.getState();
  const project = list(state.projects).find((candidate) => candidate.id === projectId);
  if (!project) return null;

  const selected = areaId == null ? '' : String(areaId).trim();
  if (selected && !list(state.areas).some((area) => area.id === selected)) {
    return null;
  }

  const updated = { ...project, areaId: selected || null };

  store.update((draft) => {
    draft.projects = list(draft.projects).map((candidate) => (
      candidate.id === projectId ? updated : candidate
    ));
    return draft;
  });

  return updated;
}

export function clearProjectArea(store, projectId) {
  return assignProjectToArea(store, projectId, null);
}

export function countProjectsForArea(areaOrId, projects) {
  let areaId = areaOrId;
  let projectList = projects;

  if (Array.isArray(areaOrId) && !Array.isArray(projects)) {
    projectList = areaOrId;
    areaId = projects;
  }

  if (areaId && typeof areaId === 'object') areaId = areaId.id;

  const selected = areaId == null ? '' : String(areaId).trim();
  if (!selected) return 0;

  return projectsFrom(projectList).filter((project) => project.areaId === selected).length;
}

export function countProjectsByArea(projectsOrArea, projectsMaybe) {
  if (!Array.isArray(projectsOrArea)
    && projectsOrArea
    && Array.isArray(projectsOrArea.projects)
    && projectsMaybe === undefined) {
    if (Array.isArray(projectsOrArea.areas)) {
      return countProjectsByArea(projectsOrArea.areas, projectsOrArea.projects);
    }
    return countProjectsByArea(projectsOrArea.projects);
  }

  if (Array.isArray(projectsOrArea)) {
    if (Array.isArray(projectsMaybe)) {
      const counts = {};
      projectsOrArea.forEach((entry) => {
        const id = entry && typeof entry === 'object' ? entry.id : entry;
        if (id == null) return;
        counts[id] = countProjectsForArea(id, projectsMaybe);
      });
      return counts;
    }

    if (projectsMaybe === undefined) {
      const counts = {};
      projectsFrom(projectsOrArea).forEach((project) => {
        if (!project.areaId) return;
        counts[project.areaId] = (counts[project.areaId] || 0) + 1;
      });
      return counts;
    }
  }

  return countProjectsForArea(projectsOrArea, projectsMaybe);
}

export const createArea = addArea;
export const addAreaOfFocus = addArea;
export const createAreaOfFocus = addArea;

export const setProjectArea = assignProjectToArea;
export const updateProjectArea = assignProjectToArea;
export const assignAreaToProject = assignProjectToArea;
export const moveProjectToArea = assignProjectToArea;

export const countAreaProjects = countProjectsForArea;
export const countProjectsInArea = countProjectsForArea;
export const getAreaProjectCount = countProjectsForArea;
export const getProjectCountForArea = countProjectsForArea;

export const countProjectsPerArea = countProjectsByArea;
export const getProjectCountsByArea = countProjectsByArea;
