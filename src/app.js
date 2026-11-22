import { createStore } from './store.js';

const store = createStore();
const app = document.querySelector('#app');

function render() {
  const state = store.getState();
  app.innerHTML = `
    <header class="topbar">
      <h1>GTD Planner</h1>
      <nav aria-label="GTD sections">
        <a href="#inbox">Inbox (${state.inbox.length})</a>
        <a href="#actions">Next Actions (${state.actions.length})</a>
        <a href="#projects">Projects (${state.projects.length})</a>
        <a href="#review">Weekly Review</a>
      </nav>
    </header>
    <main id="view" class="view"></main>
  `;
  const view = app.querySelector('#view');
  view.innerHTML = '<p class="empty">Your GTD workspace is ready. Capture something to get started.</p>';
}

render();
