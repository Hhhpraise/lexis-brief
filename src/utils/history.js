/**
 * utils/history.js
 * Manages brief history in localStorage.
 * Max 30 entries. Oldest dropped when limit hit.
 */

const KEY   = 'lexis:history';
const LIMIT = 30;

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveToHistory(topic, data) {
  const history = getHistory();

  // Avoid exact duplicate topics (case-insensitive)
  const exists = history.findIndex(h => h.topic.toLowerCase() === topic.toLowerCase());
  if (exists !== -1) history.splice(exists, 1);

  history.unshift({
    id:        crypto.randomUUID(),
    topic,
    data,
    savedAt:   Date.now(),
  });

  if (history.length > LIMIT) history.splice(LIMIT);

  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch (e) {
    // Storage quota exceeded — drop oldest and retry
    history.pop();
    localStorage.setItem(KEY, JSON.stringify(history));
  }

  return history;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
  return [];
}

export function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;

  if (diff < 60_000)      return 'Just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
