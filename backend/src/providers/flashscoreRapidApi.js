import { fetchJson } from '../utils/http.js';

const BASE_URL = 'https://flashscore4.p.rapidapi.com/api/flashscore/v2';
const FOOTBALL_SPORT_ID = 1;
const WORLD_CUP_PATTERN = /world championship|world cup|mundial/i;

function apiHeaders(apiKey) {
  return {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
    Accept: 'application/json',
  };
}

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function isWorldCupTournament(tournament = {}) {
  const name = `${tournament.name || ''} ${tournament.tournament_url || ''}`;
  return WORLD_CUP_PATTERN.test(name);
}

function flattenWorldCupMatches(tournaments = []) {
  const matches = [];

  for (const tournament of tournaments) {
    if (!isWorldCupTournament(tournament)) continue;
    for (const match of tournament.matches || []) {
      matches.push({ match, tournament });
    }
  }

  return matches;
}

export async function fetchLiveFootballTournaments(apiKey) {
  return fetchJson(buildUrl('/matches/live', { sport_id: FOOTBALL_SPORT_ID }), {
    headers: apiHeaders(apiKey),
  });
}

export async function fetchFootballMatchesByDayOffset(apiKey, dayOffset = 0) {
  const day = Math.max(-7, Math.min(7, Number(dayOffset) || 0));
  return fetchJson(buildUrl('/matches/list', { sport_id: FOOTBALL_SPORT_ID, day }), {
    headers: apiHeaders(apiKey),
  });
}

export async function fetchWorldCupFlashscoreMatches(apiKey, dayOffset = 0) {
  const [live, listed] = await Promise.all([
    fetchLiveFootballTournaments(apiKey).catch(() => []),
    fetchFootballMatchesByDayOffset(apiKey, dayOffset).catch(() => []),
  ]);

  const merged = new Map();

  for (const entry of [...flattenWorldCupMatches(live), ...flattenWorldCupMatches(listed)]) {
    merged.set(entry.match.match_id, entry);
  }

  return [...merged.values()];
}

export async function fetchMatchSummary(apiKey, matchId) {
  return fetchJson(buildUrl('/matches/match/summary', { match_id: matchId }), {
    headers: apiHeaders(apiKey),
  });
}

export async function fetchMatchLineups(apiKey, matchId) {
  return fetchJson(buildUrl('/matches/match/lineups', { match_id: matchId }), {
    headers: apiHeaders(apiKey),
  });
}

export async function fetchMatchStats(apiKey, matchId) {
  return fetchJson(buildUrl('/matches/match/stats', { match_id: matchId }), {
    headers: apiHeaders(apiKey),
  });
}
