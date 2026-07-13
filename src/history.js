import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const HISTORY_FILE = join(homedir(), '.wh', 'history.json');
const MAX_ENTRIES = 500;

/**
 * Load history entries from disk.
 * @returns {Array} History entries
 */
function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save history entries to disk.
 */
function saveHistory(entries) {
  mkdirSync(join(homedir(), '.wh'), { recursive: true });
  writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2) + '\n');
}

/**
 * Append a new entry to the history log.
 * Enforces FIFO cap at MAX_ENTRIES.
 *
 * @param {object} entry
 * @param {string} entry.command - Command name (improve, translate, etc.)
 * @param {string} entry.input - Input text
 * @param {string} entry.output - Output text from LLM
 * @param {string} entry.model - Model used
 */
export function appendHistory({ command, input, output, model }) {
  const entries = loadHistory();
  entries.push({
    id: entries.length + 1,
    timestamp: new Date().toISOString(),
    command,
    input,
    output,
    model
  });

  // FIFO eviction: keep only the last MAX_ENTRIES
  while (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  // Re-number IDs after eviction
  entries.forEach((e, i) => { e.id = i + 1; });

  saveHistory(entries);
}

/**
 * Get history entries (reverse chronological).
 * @param {number} [limit=20] - Max entries to return
 * @returns {Array} History entries, newest first
 */
export function getHistory(limit = 20) {
  const entries = loadHistory();
  return entries.slice(-limit).reverse();
}

/**
 * Get a single history entry by ID.
 * @param {number} id - Entry ID (1-based)
 * @returns {object|null} Entry or null if not found
 */
export function getHistoryEntry(id) {
  const entries = loadHistory();
  return entries.find(e => e.id === id) || null;
}

/**
 * Clear all history.
 */
export function clearHistory() {
  saveHistory([]);
}
