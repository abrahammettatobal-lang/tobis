import {
  getStaticMatchDetail,
  getStaticSchedulePayload,
} from './scheduleFallback.js';
import { filterMatchesByCalendarDate } from '../utils/matchCalendar.js';

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_TIMEOUT_MS = 25_000;
const LIVE_STREAM_TIMEOUT_MS = 35_000;

async function fetchFromApi(path, timeoutMs = API_TIMEOUT_MS) {
  const response = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error('api_failed');
  }
  return response.json();
}

export async function fetchMatchDetail(matchId, date) {
  if (API_BASE) {
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const query = params.toString();
      return await fetchFromApi(
        `/api/worldcup/match/${matchId}${query ? `?${query}` : ''}`
      );
    } catch {
      /* fallback below */
    }
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
  if (API_BASE) {
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const query = params.toString();
      const payload = await fetchFromApi(
        `/api/worldcup/today${query ? `?${query}` : ''}`
      );

      if (payload.allMatches?.length || payload.matches?.length) {
        return payload;
      }
    } catch (error) {
      console.warn('[tobis] API no disponible, usando calendario local:', error?.message);
    }
  }

  return getStaticSchedulePayload(date);
}

export function isLiveDataSource(source) {
  return source === 'api' || source === 'cache';
}

/** @deprecated Usar fetchWorldCupToday */
export async function fetchMatches({ date } = {}) {
  const payload = await fetchWorldCupToday(date);
  return {
    matches: payload.matches,
    meta: {
      lastUpdated: payload.lastUpdatedAt,
      source: payload.source,
      apiBudget: payload.apiBudget,
      recommendedRefreshSeconds: payload.recommendedRefreshSeconds,
      message: payload.message,
      budgetExhausted: payload.budgetExhausted,
    },
  };
}

export function formatKickoffTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-MX', {
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
