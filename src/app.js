import { createStore } from './store.js';
import { addInboxItem, sortInboxNewestFirst } from './inbox.js';
import { clarifyToNextAction, trashInboxItem } from './clarify.js';
import { clarifyToProject, countOpenProjectActions } from './projects.js';
import { clarifyToWaiting, markWaitingReceived, countOpenWaiting } from './waiting.js';
import { clarifyToSomeday, activateSomedayItem, countOpenSomeday } from './someday.js';
import { clarifyToReference, countReference } from './reference.js';

const store = createStore();
const app = document.querySelector('#app');
let clarifyItemId = null;

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
        <label for="clarify-note">Reference note</label>
        <input id="clarify-note" name="note" type="text" placeholder="What should you remember about this?" autocomplete="off">
        <div class="clarify-actions">
          <button type="submit">Next Action</button>
          <button type="button" class="project" data-item-id="${escapeHtml(item.id)}">Project</button>
          <button type="button" class="waiting" data-item-id="${escapeHtml(item.id)}">Waiting For</button>
          <button type="button" class="someday" data-item-id="${escapeHtml(item.id)}">Someday/Maybe</button>
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

function renderProjects(state) {
  const projects = [...state.projects].sort((a, b) => {
    const aTime = Date.parse(a.createdAt) || 0;
    const bTime = Date.parse(b.createdAt) || 0;
    return bTime - aTime;
  });

  const list = projects.length
    ? `<ul class="project-list">
        ${projects.map((project) => {
          const openActions = countOpenProjectActions(project, state.actions);
          return `
            <li class="project-item">
              <div class="project-main">
                <h3 class="project-title">${escapeHtml(project.title)}</h3>
                <p class="project-outcome">${escapeHtml(project.outcome)}</p>
              </div>
              <span class="project-meta">
                <span class="project-status">${escapeHtml(project.status)}</span>
                <span class="project-open-actions">${openActions} open action${openActions === 1 ? '' : 's'}</span>
              </span>
            </li>
          `;
        }).join('')}
      </ul>`
    : '<p class="empty">No projects yet. Clarify an inbox item into a project to get started.</p>';

  return `
    <section class="projects" aria-labelledby="projects-heading">
      <h2 id="projects-heading">Projects</h2>
      ${list}
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

function render() {
  const state = store.getState();
  const section = window.location.hash.slice(1) || 'inbox';

  app.innerHTML = `
    <header class="topbar">
      <h1>GTD Planner</h1>
      <nav aria-label="GTD sections">
        <a href="#inbox"${section === 'inbox' ? ' aria-current="page"' : ''}>Inbox (${state.inbox.length})</a>
        <a href="#actions"${section === 'actions' ? ' aria-current="page"' : ''}>Next Actions (${state.actions.length})</a>
        <a href="#projects"${section === 'projects' ? ' aria-current="page"' : ''}>Projects (${state.projects.length})</a>
        <a href="#waiting"${section === 'waiting' ? ' aria-current="page"' : ''}>Waiting For (${countOpenWaiting(state.waiting)})</a>
        <a href="#someday"${section === 'someday' ? ' aria-current="page"' : ''}>Someday/Maybe (${countOpenSomeday(state.someday)})</a>
        <a href="#reference"${section === 'reference' ? ' aria-current="page"' : ''}>Reference (${countReference(state.reference)})</a>
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
  } else if (section === 'projects') {
    view.innerHTML = renderProjects(state);
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
  } else {
    view.innerHTML = '<p class="empty">Your GTD workspace is ready. Capture something to get started.</p>';
  }
}

store.subscribe(render);
window.addEventListener('hashchange', render);
render();
