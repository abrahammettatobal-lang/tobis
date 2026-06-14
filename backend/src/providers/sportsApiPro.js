import { fetchJson } from '../utils/http.js';

const BASE_URL = 'https://v4.football.sportsapipro.com';

function apiHeaders(apiKey) {
  return { 'x-api-key': apiKey };
}

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function fetchWorldCupOverview(apiKey) {
  return fetchJson(buildUrl('/api/v1/world-cup'), { headers: apiHeaders(apiKey) });
}

export async function fetchWorldCupMatches(apiKey, date) {
  const params = date ? { date } : {};
  return fetchJson(buildUrl('/api/v1/world-cup/matches', params), {
    headers: apiHeaders(apiKey),
  });
}

/** Una sola llamada API: partidos del día (endpoint recomendado para ahorrar presupuesto). */
export async function fetchWorldCupDayPack(apiKey, date) {
  return fetchWorldCupMatches(apiKey, date);
}

export async function fetchWorldCupStandings(apiKey) {
  return fetchJson(buildUrl('/api/v1/world-cup/standings'), {
    headers: apiHeaders(apiKey),
  });
}

export async function fetchMatchDetail(apiKey, matchId) {
  return fetchJson(buildUrl(`/api/v1/match/${matchId}`), {
    headers: apiHeaders(apiKey),
  });
}

function getUtcDateString(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function fetchWorldCupMatchesWindow(apiKey, daysBack = 2, daysForward = 14) {
  const dates = [];
  for (let offset = -daysBack; offset <= daysForward; offset += 1) {
    dates.push(getUtcDateString(offset));
  }

  const requests = [
    fetchWorldCupOverview(apiKey).catch(() => ({ matches: [] })),
    fetchWorldCupMatches(apiKey).catch(() => ({ matches: [] })),
    ...dates.map((date) =>
      fetchWorldCupMatches(apiKey, date).catch(() => ({ matches: [] }))
    ),
  ];

  const responses = await Promise.all(requests);
  const matches = [];

  for (const payload of responses) {
    if (Array.isArray(payload?.matches)) {
      matches.push(...payload.matches);
    }
  }

  const unique = new Map();
  for (const match of matches) {
    unique.set(match.id, match);
  }

  return [...unique.values()];
}

export async function enrichLiveAndFinishedMatches(apiKey, matches) {
  const targets = matches.filter(
    (match) =>
      match.inplay ||
      match.matchStatus === 8 ||
      (match.homeScore != null && match.awayScore != null)
  );

  const enriched = await Promise.all(
    targets.slice(0, 20).map(async (match) => {
      try {
        const detail = await fetchMatchDetail(apiKey, match.id);
        return { ...match, ...detail, id: match.id };
      } catch {
        return match;
      }
    })
  );

  const enrichedMap = new Map(enriched.map((match) => [match.id, match]));
  return matches.map((match) => enrichedMap.get(match.id) || match);
}
