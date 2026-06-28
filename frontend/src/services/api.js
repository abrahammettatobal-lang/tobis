import {
  buildMatchDetailPayload,
  fetchOpenfootballSchedule,
  fetchOpenfootballToday,
  getCachedOpenfootballMatch,
} from './openfootball.js';
import { getStaticMatchDetail, getStaticSchedulePayload } from './scheduleFallback.js';
import { filterMatchesByCalendarDate } from '../utils/matchCalendar.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
const LIVE_STREAM_TIMEOUT_MS = 35_000;

async function fetchFromApi(path, timeoutMs = 25_000) {
  const response = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error('api_failed');
  }
  return response.json();
}

export async function fetchMatchDetail(matchId, date) {
  let match = getCachedOpenfootballMatch(matchId);

  if (!match) {
    try {
      await fetchOpenfootballSchedule();
      match = getCachedOpenfootballMatch(matchId);
    } catch {
      /* fallback below */
    }
  }

  if (match) {
    return buildMatchDetailPayload(match);
  }

  return getStaticMatchDetail(matchId);
}

export async function fetchLiveStream(matchId, { date, refresh = false } = {}) {
  if (!API_BASE) {
    return {
      status: 'unavailable',
      message: 'Backend no configurado',
    };
  }

  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (refresh) params.set('refresh', '1');
  const query = params.toString();

  return fetchFromApi(
    `/api/worldcup/match/${matchId}/live-stream${query ? `?${query}` : ''}`,
    LIVE_STREAM_TIMEOUT_MS
  );
}

export async function fetchWorldCupToday(date) {
  try {
    return await fetchOpenfootballToday(date);
  } catch (error) {
    console.warn('[tobis] Openfootball no disponible, usando calendario local:', error?.message);
    return getStaticSchedulePayload(date, { backendUnreachable: true });
  }
}

export function formatKickoffTime(isoString) {
  const parsed = new Date(isoString);
  return parsed.toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLabel(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function todayIsoDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
  }).format(new Date());
}

export function filterDayMatches(allMatches, date) {
  return filterMatchesByCalendarDate(allMatches, date);
}

/** @deprecated Usar fetchWorldCupToday */
export async function fetchMatches({ date } = {}) {
  const payload = await fetchWorldCupToday(date);
  return {
    matches: payload.matches,
    meta: {
      lastUpdated: payload.lastUpdatedAt,
      source: payload.source,
      recommendedRefreshSeconds: payload.recommendedRefreshSeconds,
      message: payload.message,
    },
  };
}
