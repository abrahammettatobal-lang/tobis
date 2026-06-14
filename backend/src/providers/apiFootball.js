import { fetchJson } from '../utils/http.js';

const BASE_URL = 'https://v3.football.api-sports.io';
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = 2026;

function apiHeaders(apiKey) {
  return { 'x-apisports-key': apiKey };
}

function assertApiFootballResponse(payload) {
  if (!payload?.errors) return;

  const errors = payload.errors;
  if (typeof errors === 'object' && Object.keys(errors).length === 0) return;

  const message =
    errors.token ||
    errors.error ||
    errors.plan ||
    (typeof errors === 'string' ? errors : JSON.stringify(errors));

  throw new Error(message);
}

export async function fetchWorldCupFixtures(apiKey) {
  const payload = await fetchJson(
    `${BASE_URL}/fixtures?league=${WORLD_CUP_LEAGUE_ID}&season=${WORLD_CUP_SEASON}`,
    { headers: apiHeaders(apiKey) }
  );

  assertApiFootballResponse(payload);
  return payload.response || [];
}

export async function fetchLiveFixtures(apiKey) {
  const payload = await fetchJson(`${BASE_URL}/fixtures?live=all`, {
    headers: apiHeaders(apiKey),
  });

  assertApiFootballResponse(payload);

  return (payload.response || []).filter(
    (fixture) =>
      fixture.league?.id === WORLD_CUP_LEAGUE_ID &&
      fixture.league?.season === WORLD_CUP_SEASON
  );
}

export async function fetchApiFootballStatus(apiKey) {
  const payload = await fetchJson(`${BASE_URL}/status`, {
    headers: apiHeaders(apiKey),
  });

  assertApiFootballResponse(payload);
  return payload.response || payload;
}
