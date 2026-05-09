/**
 * src/components/trackerDashboard.js
 * Renders the Research Tracker view.
 * Three tabs: Feed · Authors · Papers
 */

import { el } from '../utils/dom.js';
import {
  getTrackedAuthors, getTrackedPapers,
  removeTrackedAuthor, removeTrackedPaper, clearNewCitations,
} from '../utils/tracker.js';

/* ── Main export ────────────────────────────────────────── */
export function renderTrackerDashboard(container) {
  container.innerHTML = '';

  const authors = getTrackedAuthors();
  const papers  = getTrackedPapers();

  if (!authors.length && !papers.length) {
    renderEmptyState(container);
    return;
  }

  // Derive badge counts for tabs
  const feedCount    = buildFeedItems(authors).length;
  const newCitCount  = papers.filter(p => p.newCitations?.length > 0).length;

  // Tab definitions
  const tabDefs = [
    { id: 'feed',    label: 'Reading Feed', badge: feedCount    || null },
    { id: 'authors', label: 'Authors',      badge: authors.length || null },
    { id: 'papers',  label: 'Papers',       badge: newCitCount  || null },
  ];

  let activeTab = 'feed';

  // Tab bar
  const tabBar = el('div', { class: 'tracker-tabs' });
  const panels = {};

  tabDefs.forEach(({ id, label, badge }) => {
    const btn = el('button', { class: `tracker-tab${id === activeTab ? ' active' : ''}`, 'data-tab': id });
    btn.appendChild(el('span', {}, label));
    if (badge !== null) {
      btn.appendChild(el('span', { class: 'tab-badge' }, String(badge)));
    }
    btn.addEventListener('click', () => switchTab(id));
    tabBar.appendChild(btn);
  });

  container.appendChild(tabBar);

  // Panels
  const panelWrap = el('div', { class: 'tracker-panels' });

  panels.feed    = buildFeedPanel(authors, papers);
  panels.authors = buildAuthorsPanel(authors);
  panels.papers  = buildPapersPanel(papers);

  Object.entries(panels).forEach(([id, panel]) => {
    panel.dataset.panel = id;
    panel.classList.toggle('active', id === activeTab);
    panelWrap.appendChild(panel);
  });

  container.appendChild(panelWrap);

  function switchTab(id) {
    activeTab = id;
    tabBar.querySelectorAll('.tracker-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === id);
    });
    Object.entries(panels).forEach(([pid, panel]) => {
      panel.classList.toggle('active', pid === id);
    });
  }
}

/* ── Feed panel ─────────────────────────────────────────── */
function buildFeedItems(authors) {
  const seen  = new Set();
  const items = [];
  authors.forEach(author => {
    (author.latestPapers || []).forEach(paper => {
      if (!seen.has(paper.paperId)) {
        seen.add(paper.paperId);
        items.push({ ...paper, fromAuthor: author.name });
      }
    });
  });
  return items.sort((a, b) => (b.year || 0) - (a.year || 0));
}

function buildFeedPanel(authors) {
  const panel = el('div', { class: 'tracker-panel' });
  const feed  = buildFeedItems(authors);

  if (!feed.length) {
    panel.appendChild(
      el('p', { class: 'tracker-empty' },
        authors.length
          ? 'No papers loaded yet. Hit "Refresh All" to populate your feed.'
          : 'Track some authors to build your reading feed.')
    );
    return panel;
  }

  const list = el('div', { class: 'feed-list' });

  feed.forEach(paper => {
    const item = el('div', { class: 'feed-item' });

    item.appendChild(
      el('a', { class: 'feed-item-title', href: paper.url || '#', target: '_blank', rel: 'noopener' },
        paper.title)
    );

    const parts = [];
    if (paper.authors?.length)  parts.push(paper.authors.slice(0, 2).join(', '));
    if (paper.year)              parts.push(String(paper.year));
    if (paper.citationCount)     parts.push(`${paper.citationCount} citations`);
    if (parts.length) item.appendChild(el('p', { class: 'feed-item-meta' }, parts.join(' · ')));

    item.appendChild(el('p', { class: 'feed-item-source' }, `via ${paper.fromAuthor}`));
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

/* ── Authors panel ──────────────────────────────────────── */
function buildAuthorsPanel(authors) {
  const panel = el('div', { class: 'tracker-panel' });

  if (!authors.length) {
    panel.appendChild(
      el('p', { class: 'tracker-empty' },
        'No tracked authors yet. In a brief, click any author name on a paper card to track them.')
    );
    return panel;
  }

  const grid = el('div', { class: 'author-cards' });

  authors.forEach(author => {
    const card = el('div', { class: 'author-card' });

    // Header
    const header = el('div', { class: 'author-card-header' });
    const info   = el('div', { class: 'author-info' });
    info.appendChild(el('p', { class: 'author-name' }, author.name));

    const metaParts = [];
    if (author.affiliation) metaParts.push(author.affiliation);
    if (author.hIndex)      metaParts.push(`h-index: ${author.hIndex}`);
    if (author.paperCount)  metaParts.push(`${author.paperCount} papers`);
    if (metaParts.length) {
      info.appendChild(el('p', { class: 'author-meta' }, metaParts.join(' · ')));
    }

    if (author.lastChecked) {
      const date = new Date(author.lastChecked).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });
      info.appendChild(el('p', { class: 'author-checked' }, `Last checked ${date}`));
    }
    header.appendChild(info);

    const removeBtn = el('button', { class: 'remove-btn', title: 'Stop tracking' });
    removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    removeBtn.addEventListener('click', () => {
      removeTrackedAuthor(author.authorId);
      card.style.transition = 'opacity 0.25s, transform 0.25s';
      card.style.opacity    = '0';
      card.style.transform  = 'translateX(8px)';
      setTimeout(() => card.remove(), 280);
    });
    header.appendChild(removeBtn);
    card.appendChild(header);

    // Papers list
    if (author.latestPapers?.length) {
      const papersList = el('div', { class: 'author-papers' });
      author.latestPapers.slice(0, 5).forEach(paper => {
        const row = el('a', {
          class: 'author-paper-row',
          href: paper.url || '#',
          target: '_blank', rel: 'noopener',
        });
        row.appendChild(el('span', { class: 'author-paper-title' }, paper.title));
        const yearCit = [
          paper.year            ? String(paper.year)               : null,
          paper.citationCount   ? `${paper.citationCount} cit.`    : null,
        ].filter(Boolean).join(' · ');
        if (yearCit) row.appendChild(el('span', { class: 'author-paper-meta' }, yearCit));
        papersList.appendChild(row);
      });
      card.appendChild(papersList);
    } else {
      card.appendChild(
        el('p', { class: 'author-no-papers' }, 'Hit Refresh All to load papers.')
      );
    }

    grid.appendChild(card);
  });

  panel.appendChild(grid);
  return panel;
}

/* ── Papers panel ───────────────────────────────────────── */
function buildPapersPanel(papers) {
  const panel = el('div', { class: 'tracker-panel' });

  if (!papers.length) {
    panel.appendChild(
      el('p', { class: 'tracker-empty' },
        'No tracked papers yet. Click "+ Track" on any paper card in a brief.')
    );
    return panel;
  }

  const list = el('div', { class: 'paper-track-list' });

  papers.forEach(paper => {
    const card = el('div', { class: 'paper-track-card' });

    // Header
    const header  = el('div', { class: 'paper-track-header' });
    const info    = el('div', { class: 'paper-track-info' });
    const actions = el('div', { class: 'paper-track-actions' });

    info.appendChild(
      el('a', {
        class: 'paper-track-title',
        href: paper.url || '#',
        target: '_blank', rel: 'noopener',
      }, paper.title)
    );

    const parts = [];
    if (paper.authors?.length)  parts.push(paper.authors.slice(0, 2).join(', '));
    if (paper.year)              parts.push(String(paper.year));
    if (paper.citationCount)     parts.push(`${paper.citationCount} total citations`);
    if (parts.length) info.appendChild(el('p', { class: 'paper-track-meta' }, parts.join(' · ')));

    header.appendChild(info);

    if (paper.newCitations?.length) {
      actions.appendChild(
        el('span', { class: 'citation-badge' }, `+${paper.newCitations.length} new`)
      );
    }

    const removeBtn = el('button', { class: 'remove-btn', title: 'Stop tracking' });
    removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    removeBtn.addEventListener('click', () => {
      removeTrackedPaper(paper.paperId);
      card.style.transition = 'opacity 0.25s';
      card.style.opacity    = '0';
      setTimeout(() => card.remove(), 280);
    });
    actions.appendChild(removeBtn);
    header.appendChild(actions);
    card.appendChild(header);

    // New citations section
    if (paper.newCitations?.length) {
      const citSection = el('div', { class: 'citation-section' });
      citSection.appendChild(
        el('p', { class: 'citation-section-label' }, 'New citations since last check')
      );

      const citList = el('div', { class: 'citation-list' });
      paper.newCitations.forEach(cit => {
        const row = el('a', {
          class: 'citation-row',
          href: cit.url || '#',
          target: '_blank', rel: 'noopener',
        });
        row.appendChild(el('span', { class: 'citation-title' }, cit.title || 'Untitled'));
        const meta = [
          cit.authors?.slice(0, 2).join(', '),
          cit.year ? String(cit.year) : null,
        ].filter(Boolean).join(' · ');
        if (meta) row.appendChild(el('span', { class: 'citation-meta' }, meta));
        citList.appendChild(row);
      });
      citSection.appendChild(citList);

      const dismissBtn = el('button', { class: 'dismiss-btn' }, 'Mark as seen');
      dismissBtn.addEventListener('click', () => {
        clearNewCitations(paper.paperId);
        citSection.style.transition = 'opacity 0.25s';
        citSection.style.opacity    = '0';
        setTimeout(() => {
          citSection.remove();
          card.querySelector('.citation-badge')?.remove();
        }, 280);
      });
      citSection.appendChild(dismissBtn);
      card.appendChild(citSection);
    }

    list.appendChild(card);
  });

  panel.appendChild(list);
  return panel;
}

/* ── Empty state ────────────────────────────────────────── */
function renderEmptyState(container) {
  const wrap = el('div', { class: 'tracker-empty-state' });
  wrap.appendChild(el('p', { class: 'tracker-empty-title' }, 'Your research tracker is empty.'));
  wrap.appendChild(
    el('p', { class: 'tracker-empty-sub' },
      'Generate a brief, then click an author name or "+ Track" on any paper card to start building your research feed.')
  );
  container.appendChild(wrap);
}
