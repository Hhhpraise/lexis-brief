/**
 * src/main.js
 * Application controller.
 * Owns view transitions, loading orchestration, and all event wiring.
 */

import { fetchAll }                from './api/index.js';
import { renderBrief }             from './components/brief.js';
import { initAbstractTooltip }     from './components/abstractTooltip.js';
import {
  getHistory, saveToHistory,
  clearHistory, formatDate,
} from './utils/history.js';

/* ── DOM refs ───────────────────────────────────────────── */
const views = {
  search:  document.getElementById('view-search'),
  loading: document.getElementById('view-loading'),
  brief:   document.getElementById('view-brief'),
};

const searchInput     = document.getElementById('search-input');
const searchBtn       = document.getElementById('search-btn');
const searchBox       = document.getElementById('search-box');
const briefContainer  = document.getElementById('brief-container');
const loadingTopic    = document.getElementById('loading-topic-label');
const loadingBar      = document.getElementById('loading-bar');

const btnHistory      = document.getElementById('btn-history');
const btnBack         = document.getElementById('btn-back');
const btnSave         = document.getElementById('btn-save');
const btnCloseHistory = document.getElementById('btn-close-history');
const btnClearHistory = document.getElementById('btn-clear-history');
const historyList     = document.getElementById('history-list');
const historyPanel    = document.getElementById('panel-history');
const panelOverlay    = document.getElementById('panel-overlay');

const stageEls = {
  wiki:   document.getElementById('stage-wiki'),
  books:  document.getElementById('stage-books'),
  dev:    document.getElementById('stage-dev'),
  papers: document.getElementById('stage-papers'),
  quote:  document.getElementById('stage-quote'),
};

const STAGE_KEYS   = ['wiki', 'books', 'dev', 'papers', 'quote'];
const TOTAL_STAGES = STAGE_KEYS.length;

/* ── State ──────────────────────────────────────────────── */
let currentView  = 'search';
let currentTopic = '';
let currentData  = null;
let isFetching   = false;

/* ── View transitions ───────────────────────────────────── */
function showView(name) {
  if (name === currentView) return;

  const prev = views[currentView];
  prev.classList.add('exiting');
  prev.classList.remove('active');
  setTimeout(() => prev.classList.remove('exiting'), 380);

  // Slight delay so exit animation leads
  setTimeout(() => views[name].classList.add('active'), 60);
  currentView = name;
}

/* ── Loading ────────────────────────────────────────────── */
function resetLoading() {
  loadingBar.style.width = '0%';
  STAGE_KEYS.forEach(k => stageEls[k].classList.remove('active', 'done'));
}

function onProgress(key) {
  const el = stageEls[key];
  if (!el) return;
  el.classList.remove('active');
  el.classList.add('done');
  const done = STAGE_KEYS.filter(k => stageEls[k].classList.contains('done')).length;
  loadingBar.style.width = `${(done / TOTAL_STAGES) * 100}%`;
}

/* ── Search ─────────────────────────────────────────────── */
async function runSearch(rawTopic) {
  const topic = rawTopic.trim();
  if (!topic || isFetching) return;
  isFetching = true;

  currentTopic = topic;
  currentData  = null;

  resetLoading();
  loadingTopic.textContent = `"${topic}"`;
  showView('loading');

  // Stagger stage dots to show perceived activity
  STAGE_KEYS.forEach((k, i) => {
    setTimeout(() => {
      if (!stageEls[k].classList.contains('done'))
        stageEls[k].classList.add('active');
    }, i * 200);
  });

  try {
    const data = await fetchAll(topic, onProgress);
    currentData = data;

    // Flush any stages not yet marked done
    STAGE_KEYS.forEach(k => {
      stageEls[k].classList.remove('active');
      stageEls[k].classList.add('done');
    });
    loadingBar.style.width = '100%';

    await sleep(300); // let user see 100% complete

    renderBrief(briefContainer, topic, data);
    showView('brief');

  } catch (err) {
    console.error('[Lexis] Fetch error:', err);
    showView('search');
    flashError('Something went wrong. Please try again.');
  } finally {
    isFetching = false;
  }
}

/* ── History panel ──────────────────────────────────────── */
function openHistory() {
  renderHistoryPanel();
  historyPanel.classList.add('open');
  panelOverlay.classList.add('active');
  historyPanel.setAttribute('aria-hidden', 'false');
}

function closeHistory() {
  historyPanel.classList.remove('open');
  panelOverlay.classList.remove('active');
  historyPanel.setAttribute('aria-hidden', 'true');
}

function renderHistoryPanel() {
  const history = getHistory();
  historyList.innerHTML = '';

  if (!history.length) {
    historyList.innerHTML = '<p class="empty-state">No saved briefs yet.</p>';
    return;
  }

  history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <p class="history-item-topic">${escapeHtml(entry.topic)}</p>
      <p class="history-item-date">${formatDate(entry.savedAt)}</p>
    `;
    item.addEventListener('click', () => {
      closeHistory();
      currentTopic = entry.topic;
      currentData  = entry.data;
      renderBrief(briefContainer, entry.topic, entry.data);
      showView('brief');
    });
    historyList.appendChild(item);
  });
}

/* ── Save brief ─────────────────────────────────────────── */
function saveBrief() {
  if (!currentTopic || !currentData) return;
  saveToHistory(currentTopic, currentData);

  const original = btnSave.innerHTML;
  btnSave.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
      <polyline points="20 6 9 12 4 10"/>
    </svg>
    Saved`;
  btnSave.style.color = 'var(--green)';
  setTimeout(() => {
    btnSave.innerHTML = original;
    btnSave.style.color = '';
  }, 2200);
}

/* ── Utilities ──────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function flashError(msg) {
  searchBox.style.borderColor = 'var(--red)';
  searchBox.style.boxShadow   = '0 0 0 3px rgba(176,58,46,0.15)';
  searchInput.placeholder     = msg;
  setTimeout(() => {
    searchBox.style.borderColor = '';
    searchBox.style.boxShadow   = '';
    searchInput.placeholder     = 'e.g. quantum computing, stoicism, WebAssembly...';
  }, 3000);
}

/* ── Events ─────────────────────────────────────────────── */
searchBtn.addEventListener('click', () => runSearch(searchInput.value));

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') runSearch(searchInput.value);
});

document.querySelectorAll('.topic-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    searchInput.value = pill.dataset.topic;
    runSearch(pill.dataset.topic);
  });
});

btnBack.addEventListener('click', () => {
  searchInput.value = '';
  showView('search');
});

btnSave.addEventListener('click', saveBrief);
btnHistory.addEventListener('click', openHistory);
btnCloseHistory.addEventListener('click', closeHistory);
panelOverlay.addEventListener('click', closeHistory);

btnClearHistory.addEventListener('click', () => {
  clearHistory();
  renderHistoryPanel();
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (historyPanel.classList.contains('open')) closeHistory();
  else if (currentView === 'brief') showView('search');
});

/* ── Init ───────────────────────────────────────────────── */
initAbstractTooltip(); // no-op on touch devices
searchInput.focus();
