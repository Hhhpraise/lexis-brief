/**
 * components/brief.js
 * Pure render function. Takes the data object, returns a populated DOM.
 * v2: adds Wikipedia hero image, renames arxiv→papers section.
 */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

function sectionLabel(text) {
  return el('p', { class: 'section-label' }, text);
}

function section(labelText, ...children) {
  const s = el('div', { class: 'brief-section' });
  s.appendChild(sectionLabel(labelText));
  children.filter(Boolean).forEach(c => s.appendChild(c));
  return s;
}

/* ── Hero image (Wikipedia thumbnail) ───────────────────── */
function renderHeroImage(imageUrl, alt) {
  if (!imageUrl) return null;
  const wrap = el('div', { class: 'brief-hero-image' });
  const img  = el('img', { src: imageUrl, alt: alt || '', loading: 'lazy' });
  img.onerror = () => wrap.remove(); // silently remove if image 404s
  wrap.appendChild(img);
  return wrap;
}

/* ── Masthead ───────────────────────────────────────────── */
export function renderMasthead(topic, imageUrl) {
  const masthead = el('div', { class: 'brief-masthead' });
  masthead.appendChild(el('p', { class: 'brief-meta' }, 'Research Brief'));
  masthead.appendChild(el('h1', { class: 'brief-title' }, topic));
  masthead.appendChild(
    el('p', { class: 'brief-timestamp' },
      `Generated ${new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })} · Lexis`)
  );
  const img = renderHeroImage(imageUrl, topic);
  if (img) masthead.appendChild(img);
  return masthead;
}

/* ── Definition ─────────────────────────────────────────── */
function renderDefinition(wiki, topic) {
  const block = el('div', { class: 'definition-block' });

  if (wiki?.extract) {
    block.appendChild(el('p', { class: 'definition-text' }, wiki.extract));
    const src  = el('p', { class: 'definition-source' });
    const link = el('a', { href: wiki.url, target: '_blank', rel: 'noopener' }, 'Wikipedia');
    src.append('Source: ', link);
    block.appendChild(src);
  } else {
    block.appendChild(
      el('p', { class: 'section-empty' },
        `No Wikipedia summary found for "${topic}". Try a more specific or common term.`)
    );
  }

  return section('01 — Definition', block);
}

/* ── Quote ──────────────────────────────────────────────── */
function renderQuote(quote) {
  if (!quote) return null;
  const block = el('div', { class: 'quote-block' });
  block.appendChild(el('p', { class: 'quote-text' }, `"${quote.content}"`));
  block.appendChild(el('p', { class: 'quote-author' }, `— ${quote.author}`));
  return section('02 — Perspective', block);
}

/* ── Books ──────────────────────────────────────────────── */
function renderBooks(books) {
  const grid = el('div', { class: 'cards-grid' });
  if (!books?.length) {
    grid.appendChild(el('p', { class: 'section-empty' }, 'No books found for this topic.'));
  } else {
    books.forEach(book => {
      const card = el('a', { class: 'card', href: book.url, target: '_blank', rel: 'noopener' });
      card.appendChild(el('p', { class: 'card-title' }, book.title));
      const meta = el('p', { class: 'card-meta' });
      meta.textContent = book.year ? `${book.author} · ${book.year}` : book.author;
      card.appendChild(meta);
      card.appendChild(el('span', { class: 'card-tag' }, 'Book'));
      grid.appendChild(card);
    });
  }
  return section('03 — Deep Reading', grid);
}

/* ── Articles ───────────────────────────────────────────── */
function renderArticles(articles) {
  const grid = el('div', { class: 'cards-grid' });
  if (!articles?.length) {
    grid.appendChild(el('p', { class: 'section-empty' }, 'No articles found.'));
  } else {
    articles.forEach(a => {
      const card = el('a', { class: 'card', href: a.url, target: '_blank', rel: 'noopener' });
      card.appendChild(el('p', { class: 'card-title' }, a.title));
      card.appendChild(el('p', { class: 'card-meta' }, `${a.author} · ${a.reads} reactions`));
      if (a.tags.length) {
        const tagsEl = el('p', {});
        a.tags.forEach(t => {
          tagsEl.appendChild(el('span', { class: 'card-tag' }, `#${t}`));
        });
        card.appendChild(tagsEl);
      }
      grid.appendChild(card);
    });
  }
  return section('04 — Practitioner View', grid);
}

/* ── Papers (Semantic Scholar / CrossRef) ───────────────── */
function renderPapers(papers) {
  const grid = el('div', { class: 'cards-grid' });
  if (!papers?.length) {
    grid.appendChild(el('p', { class: 'section-empty' }, 'No research papers found for this topic.'));
  } else {
    papers.forEach(p => {
      const card = el('a', { class: 'card', href: p.url || '#', target: '_blank', rel: 'noopener' });
      card.appendChild(el('p', { class: 'card-title' }, p.title));
      const authStr = [p.authors?.join(', '), p.year].filter(Boolean).join(' · ');
      if (authStr) card.appendChild(el('p', { class: 'card-meta' }, authStr));
      card.appendChild(el('span', { class: 'card-tag' }, 'Research Paper'));
      grid.appendChild(card);
    });
  }
  return section('05 — Research Frontier', grid);
}

/* ── Main ────────────────────────────────────────────────── */
export function renderBrief(container, topic, data) {
  container.innerHTML = '';

  const sections = [
    renderMasthead(topic, data.wiki?.image),
    renderDefinition(data.wiki, topic),
    renderQuote(data.quote),
    renderBooks(data.books),
    renderArticles(data.devArticles),
    renderPapers(data.papers),
  ].filter(Boolean);

  sections.forEach(s => container.appendChild(s));

  // Stagger reveal animations
  container.querySelectorAll('.brief-section').forEach((s, i) => {
    s.style.animationDelay = `${0.05 + i * 0.09}s`;
    s.classList.add('revealed');
  });
}
