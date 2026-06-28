import scheduleData from '../data/worldcup-schedule.json';
import { filterMatchesByCalendarDate } from '../utils/matchCalendar.js';
import { attachChannelsToMatches } from '../utils/channels.js';

const allMatches = attachChannelsToMatches(scheduleData.matches || []);

export function getStaticSchedulePayload(date, { backendUnreachable = false } = {}) {
  const dayMatches = filterMatchesByCalendarDate(allMatches, date);

  return {
    matches: dayMatches,
    allMatches,
    lastUpdatedAt: null,
    source: 'local',
    message: 'Calendario local (sin conexión a openfootball).',
    usingFallback: true,
    internalError: backendUnreachable ? 'Backend no responde' : null,
    totalInSchedule: allMatches.length,
    recommendedRefreshSeconds: 300,
    budgetExhausted: false,
  };
}

export function getStaticMatchById(matchId) {
  return allMatches.find((match) => String(match.id) === String(matchId)) || null;
}

export function getStaticMatchDetail(matchId) {
  const match = getStaticMatchById(matchId);
  return {
    detail: match
      ? {
          lineup: null,
          stats: null,
          events: [],
          venue: match.venue || '',
          stage: match.stage || '',
        }
      : null,
    message: match ? 'Información del calendario oficial' : 'Partido no encontrado',
  };
}

export { allMatches as staticAllMatches };
