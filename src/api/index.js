/**
 * src/api/index.js
 *
 * All external API calls. Each fetcher resolves gracefully on failure —
 * a broken source never crashes the brief, it just renders empty.
 *
 * Sources:
 *  - Wikipedia REST API        (CORS OK)
 *  - Open Library              (CORS OK)
 *  - DEV.to                    (CORS OK, tag must be lowercase/no-spaces)
 *  - Semantic Scholar          (CORS OK, replaces arXiv which is browser-blocked)
 *  - CrossRef                  (CORS OK, fallback for papers)
 *  - Quotes                    (local curated bank — no network, zero latency)
 */

const CACHE     = new Map();
const CACHE_TTL = 1000 * 60 * 15; // 15 min

async function cachedFetch(url, opts = {}) {
  const hit = CACHE.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

/* ── Wikipedia ──────────────────────────────────────────── */
export async function fetchWikipedia(topic) {
  // 1. Direct slug — fastest path
  try {
    const slug = encodeURIComponent(topic.replace(/ /g, '_'));
    const data = await cachedFetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`
    );
    if (data.type !== 'disambiguation' && data.extract) {
      return _wikiShape(data);
    }
  } catch { /* fall through */ }

  // 2. Full-text search fallback — catches niche / multi-word topics
  try {
    const q   = encodeURIComponent(topic);
    const res = await cachedFetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&origin=*&srlimit=3&srnamespace=0`
    );
    const title = res?.query?.search?.[0]?.title;
    if (!title) return null;
    const slug2 = encodeURIComponent(title.replace(/ /g, '_'));
    const data  = await cachedFetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug2}`
    );
    return _wikiShape(data);
  } catch {
    return null;
  }
}

function _wikiShape(d) {
  return {
    title:   d.title,
    extract: d.extract,
    url:     d.content_urls?.desktop?.page
             || `https://en.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
    image:   d.thumbnail?.source || null,
  };
}

/* ── Open Library ───────────────────────────────────────── */
export async function fetchBooks(topic) {
  try {
    const q    = encodeURIComponent(topic);
    const data = await cachedFetch(
      `https://openlibrary.org/search.json?q=${q}&limit=6&fields=title,author_name,first_publish_year,key,cover_i`
    );
    return (data.docs || [])
      .filter(b => b.title && b.author_name)
      .slice(0, 4)
      .map(b => ({
        title:  b.title,
        author: b.author_name?.[0] || 'Unknown',
        year:   b.first_publish_year || null,
        url:    `https://openlibrary.org${b.key}`,
        cover:  b.cover_i
          ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`
          : null,
      }));
  } catch {
    return [];
  }
}

/* ── DEV.to ─────────────────────────────────────────────── */
export async function fetchDevArticles(topic) {
  // Tags must be lowercase, alphanumeric only — DEV.to 404s otherwise
  const tag = topic.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);

  if (tag) {
    try {
      const data = await cachedFetch(
        `https://dev.to/api/articles?tag=${tag}&per_page=6&state=rising`
      );
      if (Array.isArray(data) && data.length) return _devShape(data);
    } catch { /* fall through */ }
  }

  // Fallback: top trending articles (always non-empty)
  try {
    const data = await cachedFetch(`https://dev.to/api/articles?per_page=6&top=7`);
    return _devShape(data || []);
  } catch {
    return [];
  }
}

function _devShape(arr) {
  return arr.slice(0, 4).map(a => ({
    title:  a.title,
    author: a.user?.name || 'Unknown',
    tags:   a.tag_list?.slice(0, 3) || [],
    url:    a.url,
    reads:  a.public_reactions_count || 0,
  }));
}

/* ── Semantic Scholar ───────────────────────────────────── */
// Replaces arXiv which is blocked by CORS in all browsers.
// Falls back to CrossRef if Semantic Scholar rate-limits.
export async function fetchPapers(topic) {
  try {
    const q    = encodeURIComponent(topic);
    const data = await cachedFetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=5&fields=title,authors,year,externalIds,openAccessPdf,abstract`,
      { headers: { Accept: 'application/json' } }
    );
    const papers = (data.data || []).filter(p => p.title).slice(0, 4);
    if (papers.length) {
      return papers.map(p => ({
        title:    p.title,
        authors:  (p.authors || []).slice(0, 2).map(a => a.name),
        year:     p.year || '',
        abstract: p.abstract
          ? p.abstract.slice(0, 420).trimEnd() + (p.abstract.length > 420 ? '…' : '')
          : null,
        url: p.openAccessPdf?.url
          || (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null)
          || `https://www.semanticscholar.org/paper/${p.paperId}`,
      }));
    }
  } catch { /* fall through to CrossRef */ }

  // CrossRef fallback
  try {
    const q    = encodeURIComponent(topic);
    const data = await cachedFetch(
      `https://api.crossref.org/works?query=${q}&rows=5&select=title,author,published,URL,DOI`
    );
    return (data.message?.items || [])
      .filter(p => p.title?.length)
      .slice(0, 4)
      .map(p => ({
        title:    p.title[0],
        authors:  (p.author || []).slice(0, 2)
                    .map(a => `${a.given || ''} ${a.family || ''}`.trim()),
        year:     p.published?.['date-parts']?.[0]?.[0] || '',
        abstract: null,
        url:      p.URL || (p.DOI ? `https://doi.org/${p.DOI}` : '#'),
      }));
  } catch {
    return [];
  }
}

/* ── Quotes — curated local bank ───────────────────────── */
// Quotable.io's SSL cert expired. This local bank has zero latency,
// zero CORS issues, and we control quality.
const QUOTE_BANK = [
  { content: "The measure of intelligence is the ability to change.", author: "Albert Einstein" },
  { content: "What we know is a drop, what we don't know is an ocean.", author: "Isaac Newton" },
  { content: "The art of knowing is knowing what to ignore.", author: "Rumi" },
  { content: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { content: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { content: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { content: "Knowledge is power.", author: "Francis Bacon" },
  { content: "The mind is not a vessel to be filled but a fire to be kindled.", author: "Plutarch" },
  { content: "It is not enough to have a good mind; the main thing is to use it well.", author: "René Descartes" },
  { content: "The more I learn, the more I realize how much I don't know.", author: "Albert Einstein" },
  { content: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { content: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { content: "The unexamined life is not worth living.", author: "Socrates" },
  { content: "Research is to see what everybody else has seen, and to think what nobody else has thought.", author: "Albert Szent-Györgyi" },
  { content: "The greatest enemy of knowledge is not ignorance — it is the illusion of knowledge.", author: "Stephen Hawking" },
  { content: "Science is organized knowledge. Wisdom is organized life.", author: "Immanuel Kant" },
  { content: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
  { content: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { content: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { content: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
  { content: "Nature is written in mathematical language.", author: "Galileo Galilei" },
  { content: "The beautiful thing about learning is nobody can take it away from you.", author: "B.B. King" },
  { content: "Logic will get you from A to B. Imagination will take you everywhere.", author: "Albert Einstein" },
  { content: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { content: "If you can't explain it simply, you don't understand it well enough.", author: "Albert Einstein" },
  { content: "The science of today is the technology of tomorrow.", author: "Edward Teller" },
  { content: "The good life is one inspired by love and guided by knowledge.", author: "Bertrand Russell" },
  { content: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { content: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { content: "Equipped with his five senses, man explores the universe and calls the adventure Science.", author: "Edwin Hubble" },
];

export function fetchQuote() {
  return Promise.resolve(
    QUOTE_BANK[Math.floor(Math.random() * QUOTE_BANK.length)]
  );
}

/* ── Orchestrator ───────────────────────────────────────── */
/**
 * Fetch all sources in parallel. Each resolves independently —
 * a failed source returns its empty value, not an exception.
 * onProgress(key) is called as each source settles.
 */
export async function fetchAll(topic, onProgress) {
  const wrap = (key, promise, empty = null) =>
    promise
      .then(r  => { onProgress(key); return r; })
      .catch(() => { onProgress(key); return empty; });

  const [wiki, books, devArticles, papers, quote] = await Promise.all([
    wrap('wiki',   fetchWikipedia(topic)),
    wrap('books',  fetchBooks(topic), []),
    wrap('dev',    fetchDevArticles(topic), []),
    wrap('papers', fetchPapers(topic), []),
    wrap('quote',  fetchQuote()),
  ]);

  return { wiki, books, devArticles, papers, quote };
}
