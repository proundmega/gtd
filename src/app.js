import { createStore } from './store.js';
import { addInboxItem, sortInboxNewestFirst } from './inbox.js';

const store = createStore();
const app = document.querySelector('#app');

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

function renderInbox(state) {
  const items = sortInboxNewestFirst(state.inbox);
  const list = items.length
    ? `<ul class="inbox-list">
        ${items.map((item) => `
          <li class="inbox-item">
            <span class="inbox-title">${escapeHtml(item.title)}</span>
            <time class="inbox-time" datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatTimestamp(item.createdAt))}</time>
          </li>
        `).join('')}
      </ul>`
    : '<p class="empty">Your inbox is empty. Capture something to get started.</p>';

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
  } else {
    view.innerHTML = '<p class="empty">Your GTD workspace is ready. Capture something to get started.</p>';
  }
}

store.subscribe(render);
window.addEventListener('hashchange', render);
render();
