/**
 * src/components/brief.js
 *
 * Pure render function. Takes data, returns populated DOM.
 * No side effects, no global state.
 */

/* ── Tiny DOM helper ────────────────────────────────────── */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    node.appendChild(
      typeof child === 'string'
        ? document.createTextNode(child)
        : child
    );
  }
  return node;
}

function label(text) {
  return el('p', { class: 'section-label' }, text);
}

function section(labelText, ...children) {
  const s = el('div', { class: 'brief-section' });
  s.appendChild(label(labelText));
  children.filter(Boolean).forEach(c => s.appendChild(c));
  return s;
}

/* ── Masthead ───────────────────────────────────────────── */
function renderMasthead(topic, imageUrl) {
  const wrap = el('div', { class: 'brief-masthead' });
  wrap.appendChild(el('p', { class: 'brief-meta' }, 'Research Brief'));
  wrap.appendChild(el('h1', { class: 'brief-title' }, topic));
  wrap.appendChild(
    el('p', { class: 'brief-timestamp' },
      `Generated ${new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })} · Lexis`)
  );

  if (imageUrl) {
    const imgWrap = el('div', { class: 'brief-hero-image' });
    const img = el('img', { src: imageUrl, alt: topic, loading: 'lazy' });
    img.onerror = () => imgWrap.remove();
    imgWrap.appendChild(img);
    wrap.appendChild(imgWrap);
  }

  return wrap;
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
        `No Wikipedia summary found for "${topic}". Try a broader or more common term.`)
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
    books.forEach(b => {
      const card = el('a', { class: 'card', href: b.url, target: '_blank', rel: 'noopener' });
      card.appendChild(el('p', { class: 'card-title' }, b.title));
      const meta = b.year ? `${b.author} · ${b.year}` : b.author;
      card.appendChild(el('p', { class: 'card-meta' }, meta));
      const row = el('p', { class: 'card-tag-row' });
      row.appendChild(el('span', { class: 'card-tag' }, 'Book'));
      card.appendChild(row);
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
        const row = el('p', { class: 'card-tag-row' });
        a.tags.forEach(t => row.appendChild(el('span', { class: 'card-tag' }, `#${t}`)));
        card.appendChild(row);
      }
      grid.appendChild(card);
    });
  }
  return section('04 — Practitioner View', grid);
}

/* ── Papers ─────────────────────────────────────────────── */
function renderPapers(papers) {
  const grid = el('div', { class: 'cards-grid' });
  if (!papers?.length) {
    grid.appendChild(
      el('p', { class: 'section-empty' }, 'No research papers found for this topic.')
    );
  } else {
    papers.forEach(p => {
      // data-abstract enables the hover tooltip (desktop only via JS matchMedia)
      const attrs = {
        class: 'card',
        href: p.url || '#',
        target: '_blank',
        rel: 'noopener',
      };
      if (p.abstract) attrs['data-abstract'] = p.abstract;

      const card = el('a', attrs);
      card.appendChild(el('p', { class: 'card-title' }, p.title));

      const authStr = [p.authors?.join(', '), p.year].filter(Boolean).join(' · ');
      if (authStr) card.appendChild(el('p', { class: 'card-meta' }, authStr));

      const row = el('p', { class: 'card-tag-row' });
      row.appendChild(el('span', { class: 'card-tag' }, 'Research Paper'));
      if (p.abstract) {
        // hint tag — hidden on touch via CSS `@media (hover: none)`
        row.appendChild(el('span', { class: 'card-tag card-tag--hint' }, 'Hover for abstract'));
      }
      card.appendChild(row);
      grid.appendChild(card);
    });
  }
  return section('05 — Research Frontier', grid);
}

/* ── Main export ────────────────────────────────────────── */
export function renderBrief(container, topic, data) {
  container.innerHTML = '';

  const blocks = [
    renderMasthead(topic, data.wiki?.image),
    renderDefinition(data.wiki, topic),
    renderQuote(data.quote),
    renderBooks(data.books),
    renderArticles(data.devArticles),
    renderPapers(data.papers),
  ].filter(Boolean);

  blocks.forEach(b => container.appendChild(b));

  // Stagger section reveal animations
  container.querySelectorAll('.brief-section').forEach((s, i) => {
    s.style.animationDelay = `${0.05 + i * 0.09}s`;
    s.classList.add('revealed');
  });
}
