/** @type {import('./types.js')} */
import { getAllCachedMatches } from './services/matchCache.js';
import { getPdfSchedule } from './services/localSchedule.js';
import { matchIsOnDate } from './utils/timezone.js';

let memoryCache = {
  matches: [],
  lastUpdated: null,
  source: 'init',
  stale: true,
  lastError: null,
  apiBudget: null,
  recommendedRefreshSeconds: 300,
  message: 'Iniciando...',
  budgetExhausted: false,
};

let isUpdating = false;

export function getCache() {
  return memoryCache;
}

export function setCache(nextCache) {
  memoryCache = { ...memoryCache, ...nextCache };
  return memoryCache;
}

export async function refreshCache(updateFn) {
  isUpdating = true;

  try {
    const result = await updateFn();
    memoryCache = {
      matches: result.allMatches || result.matches,
      lastUpdated: result.lastUpdatedAt,
      source: result.source,
      stale: false,
      lastError: result.internalError || null,
      apiBudget: result.apiBudget,
      recommendedRefreshSeconds: result.recommendedRefreshSeconds,
      message: result.message,
      budgetExhausted: result.budgetExhausted || false,
    };
    return result;
  } catch (error) {
    memoryCache = {
      ...memoryCache,
      stale: true,
      lastError: error.message,
    };
    throw error;
  } finally {
    isUpdating = false;
  }
}

export async function hydrateMemoryFromDisk() {
  const disk = await getAllCachedMatches();
  if (disk.matches.length) {
    memoryCache.matches = disk.matches;
    memoryCache.lastUpdated = disk.lastUpdatedAt;
  }
}

export function filterMatchesByDate(matches, date) {
  if (!date) return matches;
  return matches.filter((match) => matchIsOnDate(match, date));
}

export async function getFallbackScheduleMatches() {
  const cache = getCache();
  if (cache.matches?.length) return cache.matches;
  return getPdfSchedule();
}

export function filterMatchesByStatus(matches, status) {
  if (!status || status === 'all') return matches;
  return matches.filter((match) => match.status === status);
}
