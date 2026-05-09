/**
 * src/utils/history.js
 * localStorage history management. Max 30 entries, oldest dropped at limit.
 */

const KEY   = 'lexis:history';
const LIMIT = 30;

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveToHistory(topic, data) {
  const history = getHistory();
  const idx = history.findIndex(h => h.topic.toLowerCase() === topic.toLowerCase());
  if (idx !== -1) history.splice(idx, 1);
  history.unshift({ id: crypto.randomUUID(), topic, data, savedAt: Date.now() });
  if (history.length > LIMIT) history.splice(LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    history.pop();
    try { localStorage.setItem(KEY, JSON.stringify(history)); } catch { /* quota */ }
  }
  return history;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
  return [];
}

export function formatDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)     return 'Just now';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
