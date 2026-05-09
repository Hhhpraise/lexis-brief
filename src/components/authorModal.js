/**
 * src/components/authorModal.js
 * Author search + confirm modal. Opened when user clicks an author name
 * in a paper card. Searches Semantic Scholar and returns a tracked author.
 */

import { el }           from '../utils/dom.js';
import { searchAuthors } from '../api/tracker.js';

let overlay   = null;
let onConfirm = null;

export function openAuthorModal(prefilledName, onTrack) {
  onConfirm = onTrack;
  if (!overlay) overlay = buildModal();

  const input   = overlay.querySelector('#author-search-input');
  const results = overlay.querySelector('#author-search-results');
  input.value       = prefilledName || '';
  results.innerHTML = '';

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  input.focus();

  if (prefilledName?.trim()) runSearch(prefilledName.trim());
}

export function closeAuthorModal() {
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

/* ── Build modal DOM (once) ─────────────────────────────── */
function buildModal() {
  const ov = document.createElement('div');
  ov.id = 'modal-author';
  ov.className = 'modal-overlay';
  ov.setAttribute('aria-hidden', 'true');

  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-label': 'Track Author' });

  // Header
  const header = el('div', { class: 'modal-header' });
  header.appendChild(el('h3', { class: 'modal-title' }, 'Track an Author'));
  const closeBtn = el('button', { class: 'panel-close', 'aria-label': 'Close modal' });
  closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;
  closeBtn.addEventListener('click', closeAuthorModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Search row
  const searchRow = el('div', { class: 'modal-search-row' });
  const input = el('input', {
    type: 'text',
    id: 'author-search-input',
    class: 'modal-search-input',
    placeholder: 'Search by name…',
    autocomplete: 'off',
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') runSearch(input.value.trim());
  });

  const searchBtn = el('button', { class: 'modal-search-btn' }, 'Search');
  searchBtn.addEventListener('click', () => runSearch(input.value.trim()));

  searchRow.appendChild(input);
  searchRow.appendChild(searchBtn);
  modal.appendChild(searchRow);

  // Results area
  const results = el('div', { id: 'author-search-results', class: 'author-search-results' });
  modal.appendChild(results);

  ov.appendChild(modal);
  ov.addEventListener('click', e => { if (e.target === ov) closeAuthorModal(); });
  document.body.appendChild(ov);
  return ov;
}

/* ── Search ──────────────────────────────────────────────── */
async function runSearch(name) {
  if (!name) return;
  const results = overlay.querySelector('#author-search-results');
  results.innerHTML = '';
  results.appendChild(el('p', { class: 'modal-loading' }, 'Searching Semantic Scholar…'));

  const authors = await searchAuthors(name);
  results.innerHTML = '';

  if (!authors.length) {
    results.appendChild(
      el('p', { class: 'modal-empty' }, 'No authors found. Try a different spelling.')
    );
    return;
  }

  authors.forEach(author => {
    const card = el('div', { class: 'author-result-card' });
    const info = el('div', { class: 'author-result-info' });
    info.appendChild(el('p', { class: 'author-result-name' }, author.name));

    const parts = [];
    if (author.affiliation)           parts.push(author.affiliation);
    if (author.hIndex !== null)        parts.push(`h-index: ${author.hIndex}`);
    if (author.paperCount)             parts.push(`${author.paperCount} papers`);
    if (parts.length) {
      info.appendChild(el('p', { class: 'author-result-meta' }, parts.join(' · ')));
    }
    card.appendChild(info);

    const trackBtn = el('button', { class: 'author-track-btn' }, 'Track');
    trackBtn.addEventListener('click', () => {
      if (onConfirm) onConfirm(author);
      closeAuthorModal();
      trackBtn.textContent = '✓ Tracking';
      trackBtn.disabled    = true;
    });
    card.appendChild(trackBtn);
    results.appendChild(card);
  });
}
