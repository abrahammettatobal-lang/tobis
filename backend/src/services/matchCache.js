import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './apiBudget.js';

const CACHE_FILE = path.join(DATA_DIR, 'matches-cache.json');

const DEFAULT_STORE = {
  byDate: {},
  allMatches: [],
  lastUpdatedAt: null,
};

async function readStore() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

async function writeStore(store) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.warn('[match-cache] No se pudo escribir caché:', error.message);
  }
}

function rebuildAllMatches(byDate) {
  const map = new Map();
  for (const bucket of Object.values(byDate)) {
    for (const match of bucket.matches || []) {
      map.set(match.id, match);
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );
}

export async function getCachedMatches(date) {
  const store = await readStore();
  const bucket = store.byDate[date];

  return {
    matches: bucket?.matches || [],
    lastUpdatedAt: bucket?.lastUpdatedAt || store.lastUpdatedAt || null,
    source: bucket?.source || 'cache',
  };
}

export async function saveCachedMatches(date, { matches, source = 'api', lastUpdatedAt }) {
  const store = await readStore();
  const stamp = lastUpdatedAt || new Date().toISOString();

  store.byDate[date] = {
    matches,
    source,
    lastUpdatedAt: stamp,
  };
  store.lastUpdatedAt = stamp;
  store.allMatches = rebuildAllMatches(store.byDate);

  await writeStore(store);
  return store.byDate[date];
}

export async function getAllCachedMatches() {
  const store = await readStore();
  return {
    matches: store.allMatches,
    lastUpdatedAt: store.lastUpdatedAt,
  };
}

export async function getLastCacheUpdate() {
  const store = await readStore();
  return store.lastUpdatedAt;
}
