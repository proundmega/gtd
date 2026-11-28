import { createStore } from './store.js';
import { addInboxItem, sortInboxNewestFirst } from './inbox.js';
import { clarifyToNextAction, trashInboxItem } from './clarify.js';
import {
  PROJECT_PLANNING_STEPS,
  clarifyToProject,
  completeProject,
  countActiveProjects,
  countOpenProjectActions,
  countProjectPlanningSteps,
  isProjectStalled,
  normalizeProjectPlanning,
  reopenProject,
  updateProjectPlanning,
} from './projects.js';
import {
  addArea,
  assignProjectToArea,
  countProjectsForArea,
  resolveAreaName,
} from './areas.js';
import { clarifyToWaiting, markWaitingReceived, countOpenWaiting } from './waiting.js';
import { clarifyToSomeday, activateSomedayItem, countOpenSomeday } from './someday.js';
import { clarifyToReference, countReference } from './reference.js';
import {
  clarifyToCalendar,
  countScheduled,
  groupCalendarItems,
  reactivateCalendarItem,
} from './calendar.js';
import {
  ACTION_ENERGIES,
  ACTION_PRIORITIES,
  completeAction,
  countOpenActions,
  filterActionsByContext,
  resolveProjectName,
  sortActionsNewestFirst,
  updateActionPlanning,
} from './actions.js';
import {
  buildReviewChecklist,
  completeWeeklyReview,
  getLastReview,
  getRecentReviews,
} from './review.js';
import {
  ENGAGE_ENERGIES,
  ENGAGE_TIME_OPTIONS,
  getEngageActions,
} from './engage.js';
import {
  addGoal,
  buildHorizons,
  removeGoal,
  saveHorizonSettings,
} from './horizons.js';
import {
  normalizeSearchQuery,
  searchGroups,
} from './search.js';
import {
  addContext,
  buildContexts,
  countActionsForContext,
  removeContext,
} from './contexts.js';
import {
  THEMES,
  getTheme,
  setTheme,
  applyTheme,
} from './theme.js';
import {
  BACKUP_FILENAME,
  exportBackup,
  getBackupError,
  importBackup,
} from './backup.js';

const store = createStore();
const app = document.querySelector('#app');
let clarifyItemId = null;
let actionsContext = 'all';
let planningActionId = null;
let planningProjectId = null;
let engageContext = 'all';
let engageEnergy = 'any';
let engageTime = 'any';
let searchQuery = '';
let backupError = '';
let contextError = '';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDate(value) {
  if (!value) return 'No follow-up date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function renderOptions(values, selected) {
  return values.map((value) => (
    `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`
  )).join('');
}

function renderClarifyPanel(state, item) {
  const options = state.settings.contexts
    .map((context) => `<option value="${escapeHtml(context)}">${escapeHtml(context)}</option>`)
    .join('');

  return `
    <div class="clarify-panel" role="dialog" aria-labelledby="clarify-heading">
      <h3 id="clarify-heading">Clarify &ldquo;${escapeHtml(item.title)}&rdquo;</h3>
      <p>Is this actionable?</p>
      <p class="hint">If it takes under two minutes, do it now.</p>
      <form id="clarify-form" class="clarify-form" data-item-id="${escapeHtml(item.id)}">
        <label for="clarify-outcome">Desired outcome</label>
        <input id="clarify-outcome" name="outcome" type="text" placeholder="What does done look like?" autocomplete="off">
        <label for="clarify-context">Next action context</label>
        <select id="clarify-context" name="context">
          <option value="">Choose a context&hellip;</option>
          ${options}
        </select>
        <label for="clarify-person">Waiting on</label>
        <input id="clarify-person" name="person" type="text" placeholder="Who are you waiting on?" autocomplete="off">
        <label for="clarify-follow-up">Follow-up date (optional)</label>
        <input id="clarify-follow-up" name="followUpDate" type="date">
        <label for="clarify-defer-date">Defer until (YYYY-MM-DD)</label>
        <input id="clarify-defer-date" name="deferDate" type="date" placeholder="YYYY-MM-DD">
        <label for="clarify-note">Reference note</label>
        <input id="clarify-note" name="note" type="text" placeholder="What should you remember about this?" autocomplete="off">
        <div class="clarify-actions">
          <button type="submit">Next Action</button>
          <button type="button" class="project" data-item-id="${escapeHtml(item.id)}">Project</button>
          <button type="button" class="waiting" data-item-id="${escapeHtml(item.id)}">Waiting For</button>
          <button type="button" class="someday" data-item-id="${escapeHtml(item.id)}">Someday/Maybe</button>
          <button type="button" class="defer" data-item-id="${escapeHtml(item.id)}">Defer</button>
          <button type="button" class="reference" data-item-id="${escapeHtml(item.id)}">Reference</button>
          <button type="button" class="trash" data-item-id="${escapeHtml(item.id)}">Trash</button>
        </div>
      </form>
    </div>
  `;
}

function renderInbox(state) {
  const items = sortInboxNewestFirst(state.inbox);
  const list = items.length
    ? `<ul class="inbox-list">
        ${items.map((item) => `
          <li class="inbox-item">
            <span class="inbox-title">${escapeHtml(item.title)}</span>
            <span class="inbox-meta">
              <time class="inbox-time" datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatTimestamp(item.createdAt))}</time>
              <button type="button" class="clarify" data-item-id="${escapeHtml(item.id)}">Clarify</button>
            </span>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">Your inbox is empty. Capture something to get started.</p>';

  const clarifyItem = clarifyItemId
    ? state.inbox.find((item) => item.id === clarifyItemId) ?? null
    : null;

  return `
    <section class="inbox" aria-labelledby="inbox-heading">
      <h2 id="inbox-heading">Inbox</h2>
      <form id="inbox-form" class="capture">
        <label for="inbox-title">Capture an item</label>
        <div class="capture-row">
          <input id="inbox-title" name="title" type="text" placeholder="What's on your mind?" autocomplete="off">
          <button type="submit">Add</button>
        </div>
      </form>
      ${clarifyItem ? renderClarifyPanel(state, clarifyItem) : ''}
      ${list}
    </section>
  `;
}

function renderActions(state) {
  const openActions = state.actions.filter((action) => action.status === 'active');
  const visibleActions = sortActionsNewestFirst(filterActionsByContext(openActions, actionsContext));

  const contextOptions = [
    `<option value="all"${actionsContext === 'all' ? ' selected' : ''}>All contexts</option>`,
    ...state.settings.contexts.map((context) => (
      `<option value="${escapeHtml(context)}"${actionsContext === context ? ' selected' : ''}>${escapeHtml(context)}</option>`
    )),
  ].join('');

  const list = openActions.length
    ? (visibleActions.length
      ? `<ul class="action-list">
          ${visibleActions.map((action) => {
            const projectName = resolveProjectName(action.projectId, state.projects);
            const priority = action.priority ?? 'medium';
            const energy = action.energy ?? 'medium';
            const timeMinutes = action.timeMinutes ?? 15;
            const planningForm = planningActionId === action.id
              ? `<form class="action-planning" data-item-id="${escapeHtml(action.id)}">
                  <label>Priority
                    <select name="priority">${renderOptions(ACTION_PRIORITIES, priority)}</select>
                  </label>
                  <label>Energy
                    <select name="energy">${renderOptions(ACTION_ENERGIES, energy)}</select>
                  </label>
                  <label>Time (minutes)
                    <input name="timeMinutes" type="number" min="1" step="1" value="${escapeHtml(timeMinutes)}">
                  </label>
                  <button type="submit">Save</button>
                  <button type="button" class="cancel-plan">Cancel</button>
                </form>`
              : '';
            return `
              <li class="action-item">
                <div class="action-main">
                  <h3 class="action-title">${escapeHtml(action.title)}</h3>
                  <p class="action-meta">
                    <span class="action-context">${escapeHtml(action.context)}</span>
                    ${projectName ? `<span class="action-project">${escapeHtml(projectName)}</span>` : ''}
                    <span class="action-priority">Priority: ${escapeHtml(priority)}</span>
                    <span class="action-energy">Energy: ${escapeHtml(energy)}</span>
                    <span class="action-duration">${escapeHtml(timeMinutes)} min</span>
                    <time class="action-time" datetime="${escapeHtml(action.createdAt)}">${escapeHtml(formatTimestamp(action.createdAt))}</time>
                  </p>
                  ${planningForm}
                </div>
                <div class="action-controls">
                  <button type="button" class="plan" data-item-id="${escapeHtml(action.id)}">Plan/Edit</button>
                  <button type="button" class="complete" data-item-id="${escapeHtml(action.id)}">Complete</button>
                </div>
              </li>
            `;
          }).join('')}
        </ul>`
      : '<p class="empty">No open actions in this context.</p>')
    : '<p class="empty">No open actions yet. Clarify an inbox item into a Next Action to get started.</p>';

  return `
    <section class="actions" aria-labelledby="actions-heading">
      <h2 id="actions-heading">Next Actions</h2>
      <div class="context-filter">
        <label for="action-context-filter">Context</label>
        <select id="action-context-filter">${contextOptions}</select>
      </div>
      ${list}
    </section>
  `;
}

function renderEngageMeta(action, state) {
  const projectName = resolveProjectName(action.projectId, state.projects);
  const priority = action.priority ?? 'medium';
  const energy = action.energy ?? 'medium';
  const timeMinutes = action.timeMinutes ?? 15;
  return `
    <p class="engage-meta">
      <span class="action-context">${escapeHtml(action.context)}</span>
      ${projectName ? `<span class="action-project">${escapeHtml(projectName)}</span>` : ''}
      <span class="action-energy">Energy: ${escapeHtml(energy)}</span>
      <span class="action-duration">${escapeHtml(timeMinutes)} min</span>
      <span class="action-priority">Priority: ${escapeHtml(priority)}</span>
    </p>
  `;
}

function renderEngage(state) {
  const actions = getEngageActions(state, {
    context: engageContext,
    energy: engageEnergy,
    timeMinutes: engageTime,
  });
  const best = actions[0] ?? null;
  const rest = actions.slice(1);

  const contextOptions = [
    `<option value="all"${engageContext === 'all' ? ' selected' : ''}>All contexts</option>`,
    ...state.settings.contexts.map((context) => (
      `<option value="${escapeHtml(context)}"${engageContext === context ? ' selected' : ''}>${escapeHtml(context)}</option>`
    )),
  ].join('');

  const energyOptions = ENGAGE_ENERGIES.map((value) => {
    const label = value === 'any'
      ? 'Any energy'
      : `${value.charAt(0).toUpperCase()}${value.slice(1)} energy`;
    return `<option value="${escapeHtml(value)}"${engageEnergy === value ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');

  const timeOptions = ENGAGE_TIME_OPTIONS.map((value) => {
    const normalized = String(value);
    const label = normalized === 'any' ? 'Any time' : `${normalized} min`;
    return `<option value="${escapeHtml(normalized)}"${String(engageTime) === normalized ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');

  const bestCard = best
    ? `<article class="engage-best" aria-labelledby="engage-best-title">
        <p class="engage-best-label">Best next action</p>
        <h3 id="engage-best-title" class="engage-best-title">${escapeHtml(best.title)}</h3>
        ${renderEngageMeta(best, state)}
        <button type="button" class="complete" data-item-id="${escapeHtml(best.id)}">Complete</button>
      </article>`
    : '';

  const remaining = rest.length
    ? `<h3 class="engage-list-heading">Other available actions</h3>
      <ul class="engage-list">
        ${rest.map((action) => `
          <li class="engage-item">
            <div class="engage-main">
              <h4 class="engage-title">${escapeHtml(action.title)}</h4>
              ${renderEngageMeta(action, state)}
            </div>
            <button type="button" class="complete" data-item-id="${escapeHtml(action.id)}">Complete</button>
          </li>
        `).join('')}
      </ul>`
    : (best
      ? '<p class="empty">That is the best next action for these filters.</p>'
      : '<p class="empty">No active actions match your context, energy and time. Adjust the filters or clarify something new.</p>');

  return `
    <section class="engage" aria-labelledby="engage-heading">
      <h2 id="engage-heading">Engage</h2>
      <p class="engage-intro">Choose the best next action for your context, energy and time.</p>
      <div class="engage-filters">
        <label for="engage-context-filter">Context</label>
        <select id="engage-context-filter">${contextOptions}</select>
        <label for="engage-energy-filter">Energy</label>
        <select id="engage-energy-filter">${energyOptions}</select>
        <label for="engage-time-filter">Time</label>
        <select id="engage-time-filter">${timeOptions}</select>
      </div>
      ${bestCard}
      ${remaining}
    </section>
  `;
}

function renderAreas(state) {
  const areas = [...state.areas].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });

  const list = areas.length
    ? `<ul class="area-list">
        ${areas.map((area) => {
          const projectCount = countProjectsForArea(area, state.projects);
          return `
            <li class="area-item">
              <div class="area-main">
                <h3 class="area-name">${escapeHtml(area.name)}</h3>
                ${area.description ? `<p class="area-description">${escapeHtml(area.description)}</p>` : ''}
              </div>
              <span class="area-meta">
                <span class="area-project-count">${projectCount} project${projectCount === 1 ? '' : 's'}</span>
                <time class="area-time" datetime="${escapeHtml(area.createdAt)}">${escapeHtml(formatTimestamp(area.createdAt))}</time>
              </span>
            </li>
          `;
        }).join('')}
      </ul>`
    : '<p class="empty">No areas yet. Add one to group projects by responsibility.</p>';

  return `
    <section class="areas" aria-labelledby="areas-heading">
      <h2 id="areas-heading">Areas of Focus</h2>
      <form id="area-form" class="area-form">
        <label for="area-name">Name</label>
        <input id="area-name" name="name" type="text" placeholder="e.g. Health" autocomplete="off" required>
        <label for="area-description">Description (optional)</label>
        <input id="area-description" name="description" type="text" placeholder="What does this responsibility cover?" autocomplete="off">
        <button type="submit">Add Area</button>
      </form>
      ${list}
    </section>
  `;
}

function renderContexts(state) {
  const contexts = buildContexts(state);
  const theme = getTheme(state);
  const themeOptions = THEMES.map((value) => (
    `<option value="${escapeHtml(value)}"${value === theme ? ' selected' : ''}>${escapeHtml(value)}</option>`
  )).join('');

  const list = contexts.length
    ? `<ul class="context-list">
        ${contexts.map((entry) => `
          <li class="context-item">
            <div class="context-main">
              <h3 class="context-name">${escapeHtml(entry.context)}</h3>
              <p class="context-usage">${entry.count} active action${entry.count === 1 ? '' : 's'}</p>
            </div>
            <button type="button" class="remove-context" data-context="${escapeHtml(entry.context)}">Remove</button>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">No contexts yet. Add one below.</p>';

  return `
    <section class="contexts" aria-labelledby="contexts-heading">
      <h2 id="contexts-heading">Settings: Contexts</h2>
      <p class="contexts-intro">Contexts describe where or with what you can do an action.</p>
      ${contextError ? `<p class="context-error" role="alert">${escapeHtml(contextError)}</p>` : ''}
      <form id="context-form" class="context-form">
        <label for="context-name">Context</label>
        <input id="context-name" name="name" type="text" placeholder="e.g. @work" autocomplete="off" required>
        <button type="submit">Add Context</button>
      </form>
      ${list}
    </section>
    <section class="settings-theme" aria-labelledby="theme-heading">
      <h2 id="theme-heading">Settings: Theme</h2>
      <form id="theme-form" class="theme-form">
        <label for="theme-choice">Theme</label>
        <select id="theme-choice" name="theme">
          ${themeOptions}
        </select>
        <button type="submit">Save Theme</button>
      </form>
    </section>
  `;
}

function renderHorizons(state) {
  const goals = Array.isArray(state.goals) ? state.goals : [];
  const settings = state.settings ?? {};
  const rows = buildHorizons(state);

  const rowList = rows.map((row) => `
    <li class="horizon-item horizon-${escapeHtml(row.key)}">
      <div class="horizon-main">
        <h3 class="horizon-title">${escapeHtml(row.title)}</h3>
        <p class="horizon-description">${escapeHtml(row.description)}</p>
      </div>
      <span class="horizon-meta">
        ${row.count == null ? '' : `<span class="horizon-count">${row.count}</span>`}
        <span class="horizon-summary">${escapeHtml(row.summary)}</span>
      </span>
    </li>
  `).join('');

  const goalList = goals.length
    ? `<ul class="goal-list">
        ${goals.map((goal) => `
          <li class="goal-item">
            <div class="goal-main">
              <h4 class="goal-title">${escapeHtml(goal.title)}</h4>
              ${goal.description ? `<p class="goal-description">${escapeHtml(goal.description)}</p>` : ''}
            </div>
            <button type="button" class="remove-goal" data-item-id="${escapeHtml(goal.id)}">Remove</button>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">No goals yet. Add one to define your objectives.</p>';

  return `
    <section class="horizons" aria-labelledby="horizons-heading">
      <h2 id="horizons-heading">Horizons of Focus</h2>
      <p class="horizons-intro">Work from purpose down to the next action.</p>
      <form id="horizon-form" class="horizon-form">
        <label for="horizon-purpose">Purpose</label>
        <textarea id="horizon-purpose" name="purpose" rows="3" placeholder="Why do you do what you do?">${escapeHtml(settings.purpose ?? '')}</textarea>
        <label for="horizon-principles">Principles</label>
        <textarea id="horizon-principles" name="principles" rows="3" placeholder="What values guide your choices?">${escapeHtml(settings.principles ?? '')}</textarea>
        <label for="horizon-vision">Vision</label>
        <textarea id="horizon-vision" name="vision" rows="3" placeholder="What does success look like?">${escapeHtml(settings.vision ?? '')}</textarea>
        <button type="submit">Save Horizons</button>
      </form>
      <ul class="horizon-list">${rowList}</ul>
      <div class="goals">
        <h3>Goals &amp; Objectives</h3>
        <form id="goal-form" class="goal-form">
          <label for="goal-title">Add a goal</label>
          <input id="goal-title" name="title" type="text" placeholder="e.g. Run a half marathon" autocomplete="off" required>
          <label for="goal-description">Description (optional)</label>
          <input id="goal-description" name="description" type="text" placeholder="What does achieving it look like?" autocomplete="off">
          <button type="submit">Add Goal</button>
        </form>
        ${goalList}
      </div>
    </section>
  `;
}

function renderProjects(state) {
  const projects = [...state.projects].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });
  const activeProjects = projects.filter((project) => project.status === 'active');
  const completedProjects = projects.filter((project) => project.status === 'completed');

  function renderActiveProject(project) {
    const openActions = countOpenProjectActions(project, state.actions);
    const areaName = resolveAreaName(project.areaId, state.areas);
    const areaOptions = state.areas.map((area) => (
      `<option value="${escapeHtml(area.id)}"${area.id === project.areaId ? ' selected' : ''}>${escapeHtml(area.name)}</option>`
    )).join('');
    const planning = normalizeProjectPlanning(project.planning);
    const planningCount = countProjectPlanningSteps(project);
    const stalled = isProjectStalled(project, state.actions);
    const planningForm = planningProjectId === project.id
      ? `<form class="project-planning-form" data-item-id="${escapeHtml(project.id)}">
          <p class="project-planning-completion">${planningCount}/${PROJECT_PLANNING_STEPS.length} steps filled</p>
          ${PROJECT_PLANNING_STEPS.map((step) => `
            <label for="project-${escapeHtml(project.id)}-${escapeHtml(step.key)}">${escapeHtml(step.label)}</label>
            <textarea id="project-${escapeHtml(project.id)}-${escapeHtml(step.key)}" name="${escapeHtml(step.key)}" rows="2" placeholder="${escapeHtml(step.placeholder)}">${escapeHtml(planning[step.key])}</textarea>
          `).join('')}
          <div class="project-planning-actions">
            <button type="submit">Save Plan</button>
            <button type="button" class="cancel-project-plan">Cancel</button>
          </div>
        </form>`
      : '';
    return `
      <li class="project-item">
        <div class="project-main">
          <h3 class="project-title">${escapeHtml(project.title)}</h3>
          <p class="project-outcome">${escapeHtml(project.outcome)}</p>
          <p class="project-area">Area: ${areaName ? escapeHtml(areaName) : 'No area'}</p>
          ${planningForm}
        </div>
        <span class="project-meta">
          <span class="project-status">${escapeHtml(project.status)}</span>
          ${stalled ? '<span class="project-stalled">Stalled</span>' : ''}
          <span class="project-open-actions">${openActions} open action${openActions === 1 ? '' : 's'}</span>
          <span class="project-planning-count">${planningCount}/${PROJECT_PLANNING_STEPS.length} steps filled</span>
          <button type="button" class="plan-project" data-item-id="${escapeHtml(project.id)}">Plan</button>
          <button type="button" class="complete-project" data-item-id="${escapeHtml(project.id)}">Complete</button>
          <label class="project-area-label" for="project-area-${escapeHtml(project.id)}">Assign area</label>
          <select id="project-area-${escapeHtml(project.id)}" class="project-area-select" data-item-id="${escapeHtml(project.id)}">
            <option value=""${project.areaId ? '' : ' selected'}>No area</option>
            ${areaOptions}
          </select>
        </span>
      </li>
    `;
  }

  function renderCompletedProject(project) {
    const areaName = resolveAreaName(project.areaId, state.areas);
    return `
      <li class="project-item completed-project-item">
        <div class="project-main">
          <h3 class="project-title">${escapeHtml(project.title)}</h3>
          <p class="project-outcome">${escapeHtml(project.outcome)}</p>
          <p class="project-area">Area: ${areaName ? escapeHtml(areaName) : 'No area'}</p>
          <p class="project-completed-at">Completed ${escapeHtml(formatTimestamp(project.completedAt))}</p>
        </div>
        <span class="project-meta">
          <span class="project-status">${escapeHtml(project.status)}</span>
          <button type="button" class="reopen-project" data-item-id="${escapeHtml(project.id)}">Reopen</button>
        </span>
      </li>
    `;
  }

  const activeList = activeProjects.length
    ? `<ul class="project-list">
        ${activeProjects.map(renderActiveProject).join('')}
      </ul>`
    : '<p class="empty">No active projects. Clarify an inbox item into a project to get started.</p>';

  const completedList = completedProjects.length
    ? `<ul class="project-list completed-project-list">
        ${completedProjects.map(renderCompletedProject).join('')}
      </ul>`
    : '<p class="empty">No completed projects yet.</p>';

  return `
    <section class="projects" aria-labelledby="projects-heading">
      <h2 id="projects-heading">Projects</h2>
      ${activeList}
      <section class="completed-projects" aria-labelledby="completed-projects-heading">
        <h2 id="completed-projects-heading">Completed</h2>
        ${completedList}
      </section>
    </section>
  `;
}

function renderWaiting(state) {
  const items = [...state.waiting].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });

  const list = items.length
    ? `<ul class="waiting-list">
        ${items.map((item) => `
          <li class="waiting-item">
            <div class="waiting-main">
              <h3 class="waiting-title">${escapeHtml(item.title)}</h3>
              <p class="waiting-person">Waiting on: ${escapeHtml(item.person)}</p>
            </div>
            <span class="waiting-meta">
              <span class="waiting-follow-up">Follow up: ${escapeHtml(formatDate(item.followUpDate))}</span>
              <span class="waiting-status">${escapeHtml(item.status)}</span>
              ${item.status === 'waiting' ? `<button type="button" class="received" data-item-id="${escapeHtml(item.id)}">Received</button>` : ''}
            </span>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">No waiting-for items yet. Clarify an inbox item into Waiting For to get started.</p>';

  return `
    <section class="waiting" aria-labelledby="waiting-heading">
      <h2 id="waiting-heading">Waiting For</h2>
      ${list}
    </section>
  `;
}

function renderSomeday(state) {
  const items = [...state.someday].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });

  const options = state.settings.contexts
    .map((context) => `<option value="${escapeHtml(context)}">${escapeHtml(context)}</option>`)
    .join('');

  const list = items.length
    ? `<ul class="someday-list">
        ${items.map((item) => `
          <li class="someday-item">
            <div class="someday-main">
              <h3 class="someday-title">${escapeHtml(item.title)}</h3>
              <p class="someday-meta">
                <span class="someday-status">${escapeHtml(item.status)}</span>
                <time class="someday-time" datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatTimestamp(item.createdAt))}</time>
              </p>
            </div>
            <span class="someday-activate">
              <select class="someday-context" aria-label="Activation context for ${escapeHtml(item.title)}">
                <option value="">Choose a context&hellip;</option>
                ${options}
              </select>
              <button type="button" class="activate" data-item-id="${escapeHtml(item.id)}">Activate</button>
            </span>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">No Someday/Maybe items yet. Park an inbox item to get started.</p>';

  return `
    <section class="someday" aria-labelledby="someday-heading">
      <h2 id="someday-heading">Someday/Maybe</h2>
      ${list}
    </section>
  `;
}

function renderReference(state) {
  const items = [...state.reference].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });

  const list = items.length
    ? `<ul class="reference-list">
        ${items.map((item) => `
          <li class="reference-item">
            <div class="reference-main">
              <h3 class="reference-title">${escapeHtml(item.title)}</h3>
              <p class="reference-note">${escapeHtml(item.note)}</p>
            </div>
            <span class="reference-meta">
              <span class="reference-status">${escapeHtml(item.status)}</span>
              <time class="reference-time" datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatTimestamp(item.createdAt))}</time>
            </span>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">No reference items yet. File an inbox item as Reference to get started.</p>';

  return `
    <section class="reference" aria-labelledby="reference-heading">
      <h2 id="reference-heading">Reference</h2>
      ${list}
    </section>
  `;
}

function renderCalendar(state) {
  const items = [...state.calendar];
  const groups = groupCalendarItems(items);
  const options = state.settings.contexts
    .map((context) => `<option value="${escapeHtml(context)}">${escapeHtml(context)}</option>`)
    .join('');

  const groupMeta = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
  ];

  const list = items.length
    ? `<div class="calendar-groups">
        ${groupMeta.map(({ key, label }) => {
          const groupItems = groups[key];
          return `
            <section class="calendar-group" aria-labelledby="calendar-${key}">
              <h3 id="calendar-${key}">${label} (${groupItems.length})</h3>
              ${groupItems.length
                ? `<ul class="calendar-list">
                    ${groupItems.map((item) => `
                      <li class="calendar-item">
                        <div class="calendar-main">
                          <h4 class="calendar-title">${escapeHtml(item.title)}</h4>
                          <p class="calendar-meta">
                            <span class="calendar-date">Deferred to ${escapeHtml(formatDate(item.deferDate))}</span>
                            <span class="calendar-status">${escapeHtml(item.status)}</span>
                            <time class="calendar-time" datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatTimestamp(item.createdAt))}</time>
                          </p>
                        </div>
                        <span class="calendar-reactivate">
                          <select class="calendar-context" aria-label="Reactivation context for ${escapeHtml(item.title)}">
                            <option value="">Choose a context&hellip;</option>
                            ${options}
                          </select>
                          <button type="button" class="reactivate" data-item-id="${escapeHtml(item.id)}">Reactivate</button>
                        </span>
                      </li>
                    `).join('')}
                  </ul>`
                : '<p class="empty">Nothing deferred here.</p>'}
            </section>
          `;
        }).join('')}
      </div>`
    : '<p class="empty">No scheduled items yet. Defer an inbox item to get started.</p>';

  return `
    <section class="calendar" aria-labelledby="calendar-heading">
      <h2 id="calendar-heading">Calendar</h2>
      ${list}
    </section>
  `;
}

function renderSearch(state) {
  const term = normalizeSearchQuery(searchQuery);
  const groups = term ? searchGroups(state, term) : [];
  const total = groups.reduce((count, group) => count + group.count, 0);

  const results = groups.length
    ? `<div class="search-results">
        ${groups.map((group) => `
          <section class="search-group" aria-labelledby="search-${escapeHtml(group.key)}">
            <h3 id="search-${escapeHtml(group.key)}">${escapeHtml(group.label)} (${group.count})</h3>
            <ul class="search-list">
              ${group.items.map((item) => {
                const title = item.title || item.name || '';
                const detail = item.field === 'title' || item.field === 'name'
                  ? ''
                  : `${item.fieldLabel}: ${item.matched}`;
                return `
                  <li class="search-item">
                    <div class="search-main">
                      <h4 class="search-title">${escapeHtml(title)}</h4>
                      ${detail ? `<p class="search-detail">${escapeHtml(detail)}</p>` : ''}
                    </div>
                    <span class="search-list-label">${escapeHtml(group.label)}</span>
                  </li>
                `;
              }).join('')}
            </ul>
          </section>
        `).join('')}
      </div>`
    : `<p class="empty">${term
      ? `No matches for &ldquo;${escapeHtml(searchQuery.trim())}&rdquo;.`
      : 'Enter a search term to search across your GTD lists.'}</p>`;

  return `
    <section class="search" aria-labelledby="search-heading">
      <h2 id="search-heading">Search</h2>
      <form id="search-form" class="search-form" role="search">
        <label for="search-query">Search all lists</label>
        <div class="search-row">
          <input id="search-query" name="query" type="search" value="${escapeHtml(searchQuery)}" placeholder="Search titles, outcomes, people, notes&hellip;" autocomplete="off">
          <button type="submit">Search</button>
        </div>
      </form>
      ${term ? `<p class="search-summary">${total} result${total === 1 ? '' : 's'} across ${groups.length} list${groups.length === 1 ? '' : 's'}.</p>` : ''}
      ${results}
      <div class="backup">
        <h3>Backup</h3>
        <p class="hint">Export a full backup of this GTD planner or restore one from a JSON file.</p>
        <div class="backup-controls">
          <button type="button" id="export-backup">Export JSON</button>
          <label class="import-backup" for="import-backup">Import JSON</label>
          <input id="import-backup" type="file" accept="application/json,.json">
        </div>
        ${backupError ? `<p class="backup-error" role="alert">${escapeHtml(backupError)}</p>` : ''}
      </div>
    </section>
  `;
}

function renderReview(state) {
  const checklist = buildReviewChecklist(state);
  const lastReview = getLastReview(state);
  const recentReviews = getRecentReviews(state, 5);

  const checklistList = `<ul class="review-checklist">
    ${checklist.map((item) => `
      <li class="review-checklist-item">
        <span class="review-checklist-label">${escapeHtml(item.label)}</span>
        <span class="review-checklist-count">${item.count}</span>
      </li>
    `).join('')}
  </ul>`;

  const history = recentReviews.length
    ? `<ul class="review-history-list">
        ${recentReviews.map((review) => `
          <li class="review-history-item">
            <time class="review-history-time" datetime="${escapeHtml(review.completedAt)}">${escapeHtml(formatTimestamp(review.completedAt))}</time>
            <span class="review-history-counts">Inbox ${review.snapshot.inbox} &middot; Actions ${review.snapshot.nextActions} &middot; Projects ${review.snapshot.projectsWithoutActions} &middot; Waiting ${review.snapshot.waitingFor} &middot; Someday ${review.snapshot.somedayMaybe} &middot; Calendar ${review.snapshot.calendar} &middot; Areas ${review.snapshot.areas}</span>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">No reviews recorded yet.</p>';

  return `
    <section class="review" aria-labelledby="review-heading">
      <h2 id="review-heading">Weekly Review</h2>
      <p class="review-last">Last review: ${lastReview
        ? `<time datetime="${escapeHtml(lastReview.completedAt)}">${escapeHtml(formatTimestamp(lastReview.completedAt))}</time>`
        : 'No reviews yet.'}</p>
      ${checklistList}
      <button type="button" class="complete-review">Complete Weekly Review</button>
      <h3>Recent reviews</h3>
      ${history}
    </section>
  `;
}

function render() {
  const state = store.getState();
  applyTheme(state.settings?.theme);
  const section = window.location.hash.slice(1) || 'inbox';
  if (section !== 'contexts' && section !== 'settings') contextError = '';

  app.innerHTML = `
    <header class="topbar">
      <h1>GTD Planner</h1>
      <nav aria-label="GTD sections">
        <a href="#inbox"${section === 'inbox' ? ' aria-current="page"' : ''}>Inbox (${state.inbox.length})</a>
        <a href="#actions"${section === 'actions' ? ' aria-current="page"' : ''}>Next Actions (${countOpenActions(state.actions)})</a>
        <a href="#engage"${section === 'engage' ? ' aria-current="page"' : ''}>Engage</a>
        <a href="#projects"${section === 'projects' ? ' aria-current="page"' : ''}>Projects (${countActiveProjects(state.projects)})</a>
        <a href="#areas"${section === 'areas' ? ' aria-current="page"' : ''}>Areas (${state.areas.length})</a>
        <a href="#contexts"${section === 'contexts' ? ' aria-current="page"' : ''}>Contexts (${state.settings.contexts.length})</a>
        <a href="#horizons"${section === 'horizons' ? ' aria-current="page"' : ''}>Horizons</a>
        <a href="#waiting"${section === 'waiting' ? ' aria-current="page"' : ''}>Waiting For (${countOpenWaiting(state.waiting)})</a>
        <a href="#someday"${section === 'someday' ? ' aria-current="page"' : ''}>Someday/Maybe (${countOpenSomeday(state.someday)})</a>
        <a href="#calendar"${section === 'calendar' ? ' aria-current="page"' : ''}>Calendar (${countScheduled(state.calendar)})</a>
        <a href="#reference"${section === 'reference' ? ' aria-current="page"' : ''}>Reference (${countReference(state.reference)})</a>
        <a href="#search"${section === 'search' ? ' aria-current="page"' : ''}>Search</a>
        <a href="#review"${section === 'review' ? ' aria-current="page"' : ''}>Weekly Review</a>
      </nav>
    </header>
    <main id="view" class="view"></main>
  `;

  const view = app.querySelector('#view');
  if (section === 'inbox') {
    view.innerHTML = renderInbox(state);
    const form = view.querySelector('#inbox-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('#inbox-title');
      if (addInboxItem(store, input.value)) {
        input.value = '';
      }
    });

    view.addEventListener('click', (event) => {
      const clarifyButton = event.target.closest('button.clarify');
      if (clarifyButton) {
        clarifyItemId = clarifyButton.dataset.itemId;
        render();
        return;
      }

      const projectButton = event.target.closest('button.project');
      if (projectButton) {
        const form = projectButton.closest('#clarify-form');
        const outcome = form.querySelector('#clarify-outcome').value;
        const context = form.querySelector('#clarify-context').value;
        if (clarifyToProject(store, projectButton.dataset.itemId, outcome, context)) {
          clarifyItemId = null;
        }
        render();
        return;
      }

      const trashButton = event.target.closest('button.trash');
      if (trashButton) {
        trashInboxItem(store, trashButton.dataset.itemId);
        clarifyItemId = null;
        render();
        return;
      }

      const waitingButton = event.target.closest('button.waiting');
      if (waitingButton) {
        const form = waitingButton.closest('#clarify-form');
        const person = form.querySelector('#clarify-person').value;
        const followUpDate = form.querySelector('#clarify-follow-up').value;
        if (clarifyToWaiting(store, waitingButton.dataset.itemId, person, followUpDate)) {
          clarifyItemId = null;
        }
        render();
        return;
      }

      const somedayButton = event.target.closest('button.someday');
      if (somedayButton) {
        if (clarifyToSomeday(store, somedayButton.dataset.itemId)) {
          clarifyItemId = null;
        }
        render();
        return;
      }

      const deferButton = event.target.closest('button.defer');
      if (deferButton) {
        const form = deferButton.closest('#clarify-form');
        const deferDate = form.querySelector('#clarify-defer-date').value;
        if (clarifyToCalendar(store, deferButton.dataset.itemId, deferDate)) {
          clarifyItemId = null;
        }
        render();
        return;
      }

      const referenceButton = event.target.closest('button.reference');
      if (referenceButton) {
        const form = referenceButton.closest('#clarify-form');
        const note = form.querySelector('#clarify-note').value;
        if (clarifyToReference(store, referenceButton.dataset.itemId, note)) {
          clarifyItemId = null;
        }
        render();
      }
    });

    const clarifyForm = view.querySelector('#clarify-form');
    if (clarifyForm) {
      clarifyForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const context = clarifyForm.querySelector('#clarify-context').value;
        if (clarifyToNextAction(store, clarifyForm.dataset.itemId, context)) {
          clarifyItemId = null;
        }
        render();
      });
    }
  } else if (section === 'actions') {
    view.innerHTML = renderActions(state);
    const filter = view.querySelector('#action-context-filter');
    filter.addEventListener('change', () => {
      actionsContext = filter.value;
      render();
    });
    view.addEventListener('click', (event) => {
      const planButton = event.target.closest('button.plan');
      if (planButton) {
        planningActionId = planningActionId === planButton.dataset.itemId
          ? null
          : planButton.dataset.itemId;
        render();
        return;
      }

      const cancelPlanButton = event.target.closest('button.cancel-plan');
      if (cancelPlanButton) {
        planningActionId = null;
        render();
        return;
      }

      const completeButton = event.target.closest('button.complete');
      if (completeButton) {
        completeAction(store, completeButton.dataset.itemId);
        render();
      }
    });
    view.addEventListener('submit', (event) => {
      if (!event.target.matches('form.action-planning')) return;
      event.preventDefault();
      const form = event.target;
      const priority = form.querySelector('[name="priority"]').value;
      const energy = form.querySelector('[name="energy"]').value;
      const timeMinutes = Number(form.querySelector('[name="timeMinutes"]').value);
      if (updateActionPlanning(store, form.dataset.itemId, { priority, energy, timeMinutes })) {
        planningActionId = null;
        render();
      }
    });
  } else if (section === 'engage') {
    view.innerHTML = renderEngage(state);
    view.querySelector('#engage-context-filter').addEventListener('change', (event) => {
      engageContext = event.target.value;
      render();
    });
    view.querySelector('#engage-energy-filter').addEventListener('change', (event) => {
      engageEnergy = event.target.value;
      render();
    });
    view.querySelector('#engage-time-filter').addEventListener('change', (event) => {
      engageTime = event.target.value;
      render();
    });
    view.addEventListener('click', (event) => {
      const completeButton = event.target.closest('button.complete');
      if (completeButton) {
        completeAction(store, completeButton.dataset.itemId);
        render();
      }
    });
  } else if (section === 'projects') {
    view.innerHTML = renderProjects(state);
    view.addEventListener('change', (event) => {
      const select = event.target.closest('select.project-area-select');
      if (select) {
        assignProjectToArea(store, select.dataset.itemId, select.value);
        render();
      }
    });
    view.addEventListener('click', (event) => {
      const completeButton = event.target.closest('button.complete-project');
      if (completeButton) {
        if (planningProjectId === completeButton.dataset.itemId) planningProjectId = null;
        completeProject(store, completeButton.dataset.itemId);
        render();
        return;
      }

      const reopenButton = event.target.closest('button.reopen-project');
      if (reopenButton) {
        reopenProject(store, reopenButton.dataset.itemId);
        render();
        return;
      }

      const planButton = event.target.closest('button.plan-project');
      if (planButton) {
        planningProjectId = planningProjectId === planButton.dataset.itemId
          ? null
          : planButton.dataset.itemId;
        render();
        return;
      }

      const cancelPlanButton = event.target.closest('button.cancel-project-plan');
      if (cancelPlanButton) {
        planningProjectId = null;
        render();
      }
    });
    view.addEventListener('submit', (event) => {
      if (!event.target.matches('form.project-planning-form')) return;
      event.preventDefault();
      const form = event.target;
      const planning = {};
      PROJECT_PLANNING_STEPS.forEach((step) => {
        planning[step.key] = form.querySelector(`[name="${step.key}"]`).value;
      });
      if (updateProjectPlanning(store, form.dataset.itemId, planning)) {
        planningProjectId = null;
      }
      render();
    });
  } else if (section === 'areas') {
    view.innerHTML = renderAreas(state);
    const form = view.querySelector('#area-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = form.querySelector('#area-name');
      const description = form.querySelector('#area-description');
      if (addArea(store, name.value, description.value)) {
        name.value = '';
        description.value = '';
      }
    });
  } else if (section === 'contexts' || section === 'settings') {
    view.innerHTML = renderContexts(state);
    const form = view.querySelector('#context-form');
    const input = form.querySelector('#context-name');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const trimmed = input.value.trim();
      if (!trimmed) {
        contextError = 'Context name cannot be empty.';
        render();
        return;
      }
      contextError = '';
      if (!addContext(store, trimmed)) {
        contextError = `"${trimmed}" is already a context.`;
        render();
        return;
      }
      input.value = '';
    });
    const themeForm = view.querySelector('#theme-form');
    const themeSelect = view.querySelector('#theme-choice');
    if (themeForm) {
      themeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = themeSelect ? themeSelect.value : '';
        setTheme(store, value);
        applyTheme(store.getState().settings.theme);
        render();
      });
    }
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        setTheme(store, themeSelect.value);
        applyTheme(store.getState().settings.theme);
        render();
      });
    }

    view.addEventListener('click', (event) => {
      const removeButton = event.target.closest('button.remove-context');
      if (!removeButton) return;
      const name = removeButton.dataset.context;
      const used = countActionsForContext(name, state.actions);
      if (used > 0) {
        contextError = `Cannot remove ${name}: ${used} active action${used === 1 ? '' : 's'} still use it.`;
        render();
        return;
      }
      contextError = '';
      if (!removeContext(store, name)) {
        contextError = `Could not remove ${name}.`;
        render();
      }
    });
  } else if (section === 'horizons') {
    view.innerHTML = renderHorizons(state);
    const horizonForm = view.querySelector('#horizon-form');
    horizonForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveHorizonSettings(store, {
        purpose: horizonForm.querySelector('#horizon-purpose').value,
        principles: horizonForm.querySelector('#horizon-principles').value,
        vision: horizonForm.querySelector('#horizon-vision').value,
      });
      render();
    });

    const goalForm = view.querySelector('#goal-form');
    goalForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = goalForm.querySelector('#goal-title');
      const description = goalForm.querySelector('#goal-description');
      if (addGoal(store, title.value, description.value)) {
        title.value = '';
        description.value = '';
      }
    });

    view.addEventListener('click', (event) => {
      const removeButton = event.target.closest('button.remove-goal');
      if (removeButton) {
        removeGoal(store, removeButton.dataset.itemId);
        render();
      }
    });
  } else if (section === 'waiting') {
    view.innerHTML = renderWaiting(state);
    view.addEventListener('click', (event) => {
      const receivedButton = event.target.closest('button.received');
      if (receivedButton) {
        markWaitingReceived(store, receivedButton.dataset.itemId);
        render();
      }
    });
  } else if (section === 'someday') {
    view.innerHTML = renderSomeday(state);
    view.addEventListener('click', (event) => {
      const activateButton = event.target.closest('button.activate');
      if (activateButton) {
        const row = activateButton.closest('.someday-item');
        const context = row.querySelector('.someday-context').value;
        activateSomedayItem(store, activateButton.dataset.itemId, context);
        render();
      }
    });
  } else if (section === 'reference') {
    view.innerHTML = renderReference(state);
  } else if (section === 'calendar') {
    view.innerHTML = renderCalendar(state);
    view.addEventListener('click', (event) => {
      const reactivateButton = event.target.closest('button.reactivate');
      if (reactivateButton) {
        const row = reactivateButton.closest('.calendar-item');
        const context = row.querySelector('.calendar-context').value;
        reactivateCalendarItem(store, reactivateButton.dataset.itemId, context);
        render();
      }
    });
  } else if (section === 'search') {
    view.innerHTML = renderSearch(state);
    const searchForm = view.querySelector('#search-form');
    const searchInput = view.querySelector('#search-query');

    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      searchQuery = searchInput.value;
      render();
    });

    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      render();
      const nextInput = app.querySelector('#search-query');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });

    view.querySelector('#export-backup').addEventListener('click', () => {
      const blob = new Blob([exportBackup(store.getState())], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = BACKUP_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });

    view.querySelector('#import-backup').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const contents = await file.text();
        const imported = importBackup(contents);
        if (!imported) {
          backupError = getBackupError(contents) || 'Invalid backup file.';
          render();
          return;
        }
        backupError = '';
        store.update(() => imported);
      } catch {
        backupError = 'Could not read the selected backup file.';
        render();
      }
    });
  } else if (section === 'review') {
    view.innerHTML = renderReview(state);
    view.addEventListener('click', (event) => {
      if (event.target.closest('button.complete-review')) {
        completeWeeklyReview(store);
        render();
      }
    });
  } else {
    view.innerHTML = '<p class="empty">Your GTD workspace is ready. Capture something to get started.</p>';
  }
}

store.subscribe(render);
window.addEventListener('hashchange', render);
render();
