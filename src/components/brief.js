/**
 * components/brief.js
 * Pure render function. Takes the data object and returns
 * a populated DOM node. No side effects.
 */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (!child) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function sectionLabel(text) {
  return el('p', { class: 'section-label' }, text);
}

function briefSection(labelText, ...children) {
  const section = el('div', { class: 'brief-section' });
  section.appendChild(sectionLabel(labelText));
  for (const child of children) {
    if (child) section.appendChild(child);
  }
  return section;
}

/* ── Definition ────────────────────────────────────────── */
function renderDefinition(wiki, topic) {
  const block = el('div', { class: 'definition-block' });

  if (wiki?.extract) {
    block.appendChild(el('p', { class: 'definition-text' }, wiki.extract));
    const src = el('p', { class: 'definition-source' });
    const link = el('a', { href: wiki.url, target: '_blank', rel: 'noopener' }, 'Wikipedia');
    src.appendChild(document.createTextNode('Source: '));
    src.appendChild(link);
    block.appendChild(src);
  } else {
    block.appendChild(
      el('p', { class: 'section-empty' }, `No Wikipedia summary found for "${topic}". Try a more specific term.`)
    );
  }

  return briefSection('01 — Definition', block);
}

/* ── Quote ─────────────────────────────────────────────── */
function renderQuote(quote) {
  if (!quote) return null;

  const block = el('div', { class: 'quote-block' });
  block.appendChild(el('p', { class: 'quote-text' }, `"${quote.content}"`));
  block.appendChild(el('p', { class: 'quote-author' }, `— ${quote.author}`));

  return briefSection('02 — Perspective', block);
}

/* ── Books ─────────────────────────────────────────────── */
function renderBooks(books) {
  const grid = el('div', { class: 'cards-grid' });

  if (!books?.length) {
    grid.appendChild(el('p', { class: 'section-empty' }, 'No books found.'));
  } else {
    for (const book of books) {
      const card = el('a', {
        class: 'card',
        href: book.url,
        target: '_blank',
        rel: 'noopener',
      });
      card.appendChild(el('p', { class: 'card-title' }, book.title));
      const meta = el('p', { class: 'card-meta' });
      meta.textContent = book.year ? `${book.author} · ${book.year}` : book.author;
      card.appendChild(meta);
      card.appendChild(el('span', { class: 'card-tag' }, 'Book'));
      grid.appendChild(card);
    }
  }

  return briefSection('03 — Deep Reading', grid);
}

/* ── Articles ───────────────────────────────────────────── */
function renderArticles(articles) {
  const grid = el('div', { class: 'cards-grid' });

  if (!articles?.length) {
    grid.appendChild(el('p', { class: 'section-empty' }, 'No articles found.'));
  } else {
    for (const article of articles) {
      const card = el('a', {
        class: 'card',
        href: article.url,
        target: '_blank',
        rel: 'noopener',
      });
      card.appendChild(el('p', { class: 'card-title' }, article.title));
      const meta = el('p', { class: 'card-meta' });
      meta.textContent = `${article.author} · ${article.reads} reactions`;
      card.appendChild(meta);
      if (article.tags.length) {
        const tagsEl = el('p', {});
        for (const tag of article.tags) {
          tagsEl.appendChild(el('span', { class: 'card-tag' }, `#${tag}`));
          tagsEl.appendChild(document.createTextNode(' '));
        }
        card.appendChild(tagsEl);
      }
      grid.appendChild(card);
    }
  }

  return briefSection('04 — Practitioner View', grid);
}

/* ── Papers ─────────────────────────────────────────────── */
function renderPapers(papers) {
  const grid = el('div', { class: 'cards-grid' });

  if (!papers?.length) {
    grid.appendChild(el('p', { class: 'section-empty' }, 'No arXiv papers found for this topic.'));
  } else {
    for (const paper of papers) {
      const card = el('a', {
        class: 'card',
        href: paper.url,
        target: '_blank',
        rel: 'noopener',
      });
      card.appendChild(el('p', { class: 'card-title' }, paper.title));
      const meta = el('p', { class: 'card-meta' });
      const authStr = paper.authors.length ? paper.authors.join(', ') + (paper.year ? ` · ${paper.year}` : '') : paper.year || '';
      meta.textContent = authStr;
      card.appendChild(meta);
      card.appendChild(el('span', { class: 'card-tag' }, 'Research Paper'));
      grid.appendChild(card);
    }
  }

  return briefSection('05 — Research Frontier', grid);
}

/* ── Masthead ───────────────────────────────────────────── */
function renderMasthead(topic) {
  const masthead = el('div', { class: 'brief-masthead' });
  masthead.appendChild(el('p', { class: 'brief-meta' }, 'Research Brief'));
  masthead.appendChild(el('h1', { class: 'brief-title' }, topic));
  masthead.appendChild(
    el('p', { class: 'brief-timestamp' },
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Lexis`)
  );
  return masthead;
}

/* ── Main render ─────────────────────────────────────────── */
export function renderBrief(container, topic, data) {
  container.innerHTML = '';

  const sections = [
    renderMasthead(topic),
    renderDefinition(data.wiki, topic),
    renderQuote(data.quote),
    renderBooks(data.books),
    renderArticles(data.devArticles),
    renderPapers(data.papers),
  ].filter(Boolean);

  for (const section of sections) {
    container.appendChild(section);
  }

  // Stagger reveal animations
  const animatable = container.querySelectorAll('.brief-section');
  animatable.forEach((s, i) => {
    s.style.animationDelay = `${0.05 + i * 0.08}s`;
    s.classList.add('revealed');
  });
}
