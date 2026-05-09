/**
 * src/utils/tracker.js
 * localStorage management for tracked authors and papers.
 *
 * Author schema:
 *   { authorId, name, affiliation, hIndex, paperCount,
 *     addedAt, lastChecked, latestPapers[] }
 *
 * Paper schema:
 *   { paperId, title, authors[], year, abstract, url,
 *     addedAt, lastChecked, citationCount,
 *     newCitations[], knownCitationIds[] }
 */

const AUTHORS_KEY = 'lexis:tracked-authors';
const PAPERS_KEY  = 'lexis:tracked-papers';
const LIMIT       = 50;
const REFRESH_TTL = 1000 * 60 * 60 * 6; // 6 hours

function load(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* storage quota — silently skip */ }
}

/* ── Authors ──────────────────────────────────────────────── */

export function getTrackedAuthors() { return load(AUTHORS_KEY); }

export function isTrackingAuthor(authorId) {
  return getTrackedAuthors().some(a => a.authorId === authorId);
}

export function addTrackedAuthor(author) {
  const list = getTrackedAuthors();
  if (list.some(a => a.authorId === author.authorId)) return list;
  list.unshift({
    authorId:    author.authorId,
    name:        author.name,
    affiliation: author.affiliation || '',
    hIndex:      author.hIndex     || null,
    paperCount:  author.paperCount || null,
    addedAt:     Date.now(),
    lastChecked: null,
    latestPapers: [],
  });
  if (list.length > LIMIT) list.splice(LIMIT);
  save(AUTHORS_KEY, list);
  return list;
}

export function removeTrackedAuthor(authorId) {
  const list = getTrackedAuthors().filter(a => a.authorId !== authorId);
  save(AUTHORS_KEY, list);
  return list;
}

export function updateAuthorPapers(authorId, papers) {
  const list   = getTrackedAuthors();
  const author = list.find(a => a.authorId === authorId);
  if (!author) return list;
  author.latestPapers = papers;
  author.lastChecked  = Date.now();
  save(AUTHORS_KEY, list);
  return list;
}

/* ── Papers ───────────────────────────────────────────────── */

export function getTrackedPapers() { return load(PAPERS_KEY); }

export function isTrackingPaper(paperId) {
  return getTrackedPapers().some(p => p.paperId === paperId);
}

export function addTrackedPaper(paper) {
  const list = getTrackedPapers();
  if (list.some(p => p.paperId === paper.paperId)) return list;
  list.unshift({
    paperId:          paper.paperId,
    title:            paper.title,
    authors:          paper.authors          || [],
    year:             paper.year             || null,
    abstract:         paper.abstract         || null,
    url:              paper.url              || null,
    addedAt:          Date.now(),
    lastChecked:      null,
    citationCount:    paper.citationCount    || 0,
    newCitations:     [],
    knownCitationIds: [],
  });
  if (list.length > LIMIT) list.splice(LIMIT);
  save(PAPERS_KEY, list);
  return list;
}

export function removeTrackedPaper(paperId) {
  const list = getTrackedPapers().filter(p => p.paperId !== paperId);
  save(PAPERS_KEY, list);
  return list;
}

export function updatePaperCitations(paperId, allCitations) {
  const list  = getTrackedPapers();
  const paper = list.find(p => p.paperId === paperId);
  if (!paper) return list;

  const known   = new Set(paper.knownCitationIds);
  paper.newCitations     = allCitations.filter(c => !known.has(c.paperId));
  paper.knownCitationIds = allCitations.map(c => c.paperId);
  paper.lastChecked      = Date.now();
  paper.citationCount    = allCitations.length;
  save(PAPERS_KEY, list);
  return list;
}

export function clearNewCitations(paperId) {
  const list  = getTrackedPapers();
  const paper = list.find(p => p.paperId === paperId);
  if (paper) { paper.newCitations = []; save(PAPERS_KEY, list); }
  return list;
}

/* ── Helpers ──────────────────────────────────────────────── */

export function needsRefresh(item) {
  return !item.lastChecked || (Date.now() - item.lastChecked > REFRESH_TTL);
}

export function getTrackerBadgeCount() {
  return getTrackedPapers().filter(p => p.newCitations?.length > 0).length;
}
