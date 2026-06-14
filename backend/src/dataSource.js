import {
  enrichLiveAndFinishedMatches,
  fetchMatchDetail,
  fetchWorldCupMatchesWindow,
  fetchWorldCupStandings,
} from './providers/sportsApiPro.js';
import {
  fetchLiveFixtures,
  fetchWorldCupFixtures,
} from './providers/apiFootball.js';
import { scrapeWorldCupMatches } from './scraper.js';
import { getCache } from './cache.js';
import {
  mergeMatches,
  mergeMatchesPreferPrimary,
  normalizeApiFootballFixture,
  normalizeSportsApiProMatch,
} from './utils/match.js';

function getRecentCachedMatches(days = 3) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  return getCache().matches.filter((match) => match.kickoffDate >= cutoffIso);
}

function getApiKey() {
  return (
    process.env.SPORTSAPI_KEY ||
    process.env.SPORTSAPIPRO_KEY ||
    process.env.APISPORTS_KEY ||
    process.env.API_FOOTBALL_KEY
  );
}

async function fetchFromSportsApiPro(apiKey) {
  const rawMatches = await fetchWorldCupMatchesWindow(apiKey);
  const enriched = await enrichLiveAndFinishedMatches(apiKey, rawMatches);
  const normalized = enriched.map(normalizeSportsApiProMatch);
  const recentCached = getRecentCachedMatches();
  const normalizedIds = new Set(normalized.map((match) => match.id));

  const missingCached = recentCached
    .filter((match) => !normalizedIds.has(match.id))
    .slice(0, 12);

  const refreshed = await Promise.all(
    missingCached.map(async (cached) => {
      try {
        const detail = await fetchMatchDetail(apiKey, cached.id);
        return normalizeSportsApiProMatch({ ...detail, id: cached.id });
      } catch {
        return cached;
      }
    })
  );

  return mergeMatches(recentCached, mergeMatches(normalized, refreshed));
}

async function fetchFromApiFootball(apiKey) {
  const [seasonFixtures, liveFixtures] = await Promise.all([
    fetchWorldCupFixtures(apiKey),
    fetchLiveFixtures(apiKey).catch(() => []),
  ]);

  const normalizedSeason = seasonFixtures.map(normalizeApiFootballFixture);
  const normalizedLive = liveFixtures.map(normalizeApiFootballFixture);
  return mergeMatches(normalizedSeason, normalizedLive);
}

export async function fetchWorldCupMatches(locale = 'en') {
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      let matches = await fetchFromSportsApiPro(apiKey);

      if (matches.length < 8) {
        const fallback = await scrapeWorldCupMatches(locale);
        matches = mergeMatchesPreferPrimary(matches, fallback.matches);
      }

      if (matches.length > 0) {
        return {
          matches,
          source: matches.length >= 8 ? 'sportsapipro-v4' : 'sportsapipro+scraper',
        };
      }
    } catch (error) {
      console.warn(`[sportsapipro] ${error.message}`);
    }

    try {
      const matches = await fetchFromApiFootball(apiKey);
      if (matches.length > 0) {
        return { matches, source: 'api-football' };
      }
    } catch (error) {
      console.warn(`[api-football] ${error.message}`);
    }
  }

  return scrapeWorldCupMatches(locale);
}

export async function fetchStandings() {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const payload = await fetchWorldCupStandings(apiKey);
  return payload?.standings || null;
}
