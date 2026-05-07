/**
 * api/index.js
 * All external API calls. Each fetcher resolves to null on failure
 * so the brief still renders with partial data.
 */

const CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

async function cachedFetch(url) {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

/* ── Wikipedia ───────────────────────────────────────────── */
export async function fetchWikipedia(topic) {
  try {
    const slug = encodeURIComponent(topic.replace(/ /g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
    const data = await cachedFetch(url);
    return {
      title:   data.title,
      extract: data.extract,
      url:     data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${slug}`,
      image:   data.thumbnail?.source || null,
    };
  } catch {
    // Try search fallback
    try {
      const search = encodeURIComponent(topic);
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${search}&format=json&origin=*&srlimit=1`;
      const data = await cachedFetch(url);
      const title = data?.query?.search?.[0]?.title;
      if (!title) return null;
      return fetchWikipedia(title);
    } catch {
      return null;
    }
  }
}

/* ── Open Library ─────────────────────────────────────────── */
export async function fetchBooks(topic) {
  try {
    const q = encodeURIComponent(topic);
    const url = `https://openlibrary.org/search.json?q=${q}&limit=5&fields=title,author_name,first_publish_year,key,cover_i`;
    const data = await cachedFetch(url);
    return (data.docs || [])
      .filter(b => b.title && b.author_name)
      .slice(0, 4)
      .map(b => ({
        title:  b.title,
        author: b.author_name?.[0] || 'Unknown',
        year:   b.first_publish_year || null,
        url:    `https://openlibrary.org${b.key}`,
        cover:  b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-S.jpg` : null,
      }));
  } catch {
    return [];
  }
}

/* ── DEV.to ──────────────────────────────────────────────── */
export async function fetchDevArticles(topic) {
  try {
    const q = encodeURIComponent(topic);
    const url = `https://dev.to/api/articles?tag=${q}&per_page=5&top=1`;
    let data = await cachedFetch(url);

    // Tag search might return nothing; fall back to general search
    if (!data.length) {
      const url2 = `https://dev.to/api/articles?per_page=6&top=1`;
      data = await cachedFetch(url2);
    }

    return data.slice(0, 4).map(a => ({
      title:  a.title,
      author: a.user?.name || 'Unknown',
      tags:   a.tag_list?.slice(0, 3) || [],
      url:    a.url,
      reads:  a.public_reactions_count || 0,
    }));
  } catch {
    return [];
  }
}

/* ── arXiv ────────────────────────────────────────────────── */
export async function fetchArxiv(topic) {
  try {
    const q = encodeURIComponent(topic);
    const url = `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=4&sortBy=relevance`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const entries = [...doc.querySelectorAll('entry')];

    return entries.slice(0, 4).map(e => ({
      title:   e.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || 'Untitled',
      authors: [...e.querySelectorAll('author name')].map(n => n.textContent).slice(0, 2),
      summary: e.querySelector('summary')?.textContent?.trim().slice(0, 200) + '...' || '',
      url:     e.querySelector('id')?.textContent?.trim() || '#',
      year:    e.querySelector('published')?.textContent?.slice(0, 4) || '',
    }));
  } catch {
    return [];
  }
}

/* ── Quotable ────────────────────────────────────────────── */
export async function fetchQuote(topic) {
  // Map topic to a rough tag category
  const tagMap = {
    science: ['science', 'knowledge', 'wisdom'],
    technology: ['technology', 'change', 'future'],
    history: ['history', 'time', 'change'],
    philosophy: ['philosophy', 'wisdom', 'life'],
    math: ['mathematics', 'education', 'knowledge'],
    art: ['art', 'creativity', 'beauty'],
    business: ['success', 'work', 'leadership'],
  };

  const lc = topic.toLowerCase();
  let tags = ['wisdom'];
  for (const [key, val] of Object.entries(tagMap)) {
    if (lc.includes(key)) { tags = val; break; }
  }

  for (const tag of tags) {
    try {
      const url = `https://api.quotable.io/random?tags=${tag}&minLength=60&maxLength=200`;
      const data = await cachedFetch(url);
      if (data.content) {
        return { content: data.content, author: data.author };
      }
    } catch { /* try next tag */ }
  }

  // Final fallback — any quote
  try {
    const data = await cachedFetch('https://api.quotable.io/random?minLength=60&maxLength=200');
    return data.content ? { content: data.content, author: data.author } : null;
  } catch {
    return null;
  }
}

/* ── Orchestrator ────────────────────────────────────────── */
/**
 * Fetch all sources in parallel. Each resolves independently.
 * Returns a { wiki, books, devArticles, papers, quote } object.
 * onProgress(sourceKey) is called as each source settles.
 */
export async function fetchAll(topic, onProgress) {
  const wrap = (key, promise) =>
    promise.then(result => { onProgress(key); return result; })
           .catch(()    => { onProgress(key); return null; });

  const [wiki, books, devArticles, papers, quote] = await Promise.all([
    wrap('wiki',  fetchWikipedia(topic)),
    wrap('books', fetchBooks(topic)),
    wrap('dev',   fetchDevArticles(topic)),
    wrap('arxiv', fetchArxiv(topic)),
    wrap('quote', fetchQuote(topic)),
  ]);

  return { wiki, books, devArticles, papers, quote };
}
