/**
 * src/api/tracker.js
 * API calls for the Research Tracker feature.
 * Separate from api/index.js to keep the brief pipeline clean.
 *
 * All calls go to Semantic Scholar (CORS-OK, no key).
 * Rate limit: 100 req / 5 min unauthenticated.
 * We stay safe by awaiting a 300ms sleep between batched calls.
 */

const CACHE     = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6-hour cache for tracker data

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cachedFetch(url, opts = {}) {
  const hit = CACHE.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

const SS_OPTS = { headers: { Accept: 'application/json' } };

/* ── Author search ──────────────────────────────────────── */
export async function searchAuthors(name) {
  try {
    const q    = encodeURIComponent(name);
    const data = await cachedFetch(
      `https://api.semanticscholar.org/graph/v1/author/search?query=${q}&fields=authorId,name,affiliations,paperCount,hIndex,citationCount`,
      SS_OPTS
    );
    return (data.data || []).slice(0, 6).map(a => ({
      authorId:     a.authorId,
      name:         a.name,
      affiliation:  a.affiliations?.[0]?.name || '',
      hIndex:       a.hIndex       || null,
      paperCount:   a.paperCount   || null,
      citationCount: a.citationCount || null,
    }));
  } catch { return []; }
}

/* ── Author papers ──────────────────────────────────────── */
export async function fetchAuthorPapers(authorId) {
  try {
    const data = await cachedFetch(
      `https://api.semanticscholar.org/graph/v1/author/${authorId}/papers?fields=paperId,title,year,citationCount,abstract,openAccessPdf,authors&sort=publicationDate:desc&limit=10`,
      SS_OPTS
    );
    return (data.data || []).map(p => ({
      paperId:       p.paperId,
      title:         p.title,
      year:          p.year          || null,
      citationCount: p.citationCount || 0,
      abstract:      p.abstract
        ? p.abstract.slice(0, 420).trimEnd() + (p.abstract.length > 420 ? '…' : '')
        : null,
      authors: (p.authors || []).slice(0, 3).map(a => a.name),
      url:     p.openAccessPdf?.url
               || `https://www.semanticscholar.org/paper/${p.paperId}`,
    }));
  } catch { return []; }
}

/* ── Paper citations ────────────────────────────────────── */
export async function fetchPaperCitations(paperId) {
  try {
    const data = await cachedFetch(
      `https://api.semanticscholar.org/graph/v1/paper/${paperId}/citations?fields=paperId,title,authors,year,citationCount&limit=25`,
      SS_OPTS
    );
    return (data.data || []).map(d => {
      const p = d.citingPaper || d;
      return {
        paperId: p.paperId,
        title:   p.title   || 'Untitled',
        authors: (p.authors || []).slice(0, 2).map(a => a.name),
        year:    p.year    || null,
        url:     `https://www.semanticscholar.org/paper/${p.paperId}`,
      };
    });
  } catch { return []; }
}

/* ── Paper details (for tracking from non-SS sources) ───── */
export async function fetchPaperDetails(paperId) {
  try {
    const data = await cachedFetch(
      `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=paperId,title,authors,year,abstract,citationCount,openAccessPdf`,
      SS_OPTS
    );
    return {
      paperId:       data.paperId,
      title:         data.title,
      authors:       (data.authors || []).slice(0, 3).map(a => a.name),
      year:          data.year          || null,
      abstract:      data.abstract
        ? data.abstract.slice(0, 420).trimEnd() + (data.abstract.length > 420 ? '…' : '')
        : null,
      citationCount: data.citationCount || 0,
      url:           data.openAccessPdf?.url
                     || `https://www.semanticscholar.org/paper/${data.paperId}`,
    };
  } catch { return null; }
}

/* ── Batched refresh helpers ────────────────────────────── */
// 300ms between calls keeps us well under the 100/5min rate limit.

export async function refreshTrackedAuthors(authors, onEach) {
  for (const author of authors) {
    const papers = await fetchAuthorPapers(author.authorId);
    onEach(author.authorId, papers);
    await sleep(300);
  }
}

export async function refreshTrackedPapers(papers, onEach) {
  for (const paper of papers) {
    const citations = await fetchPaperCitations(paper.paperId);
    onEach(paper.paperId, citations);
    await sleep(300);
  }
}
