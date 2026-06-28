import { attachChannelsToMatches } from '../utils/channels.js';
import { filterMatchesByCalendarDate } from '../utils/matchCalendar.js';
import { resolveMatchStatus } from '../utils/matchPlayback.js';
import { getFlagUrl, slugifyTeam, teamAbbr, translateTeam } from '../utils/teams.js';

export const OPENFOOTBALL_WC_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const REFRESH_SECONDS = 180;
const FETCH_TIMEOUT_MS = 20_000;

let cachedMatches = [];
let cachedAt = null;

const ROUND_ES = {
  'Round of 32': 'Dieciseisavos',
  'Round of 16': 'Octavos de final',
  'Quarter-finals': 'Cuartos de final',
  'Semi-finals': 'Semifinales',
  Final: 'Final',
  'Third place': 'Tercer puesto',
};

function parseMatchTime(dateStr, timeStr) {
  const match = timeStr?.match(/(\d+):(\d+)\s+UTC([+-]\d+)/);
  if (!match) return null;

  const [, hh, mm, off] = match;
  const offset = parseInt(off, 10);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, +hh - offset, +mm, 0));
}

function formatStage(raw) {
  if (raw.group) {
    const groupLetter = raw.group.replace('Group ', '');
    const matchday = raw.round?.replace('Matchday ', 'Jornada ') || '';
    return matchday ? `Grupo ${groupLetter} · ${matchday}` : `Grupo ${groupLetter}`;
  }
  return ROUND_ES[raw.round] || raw.round || 'Eliminatorias';
}

function buildTeam(nameEn, goals) {
  const name = translateTeam(nameEn);
  return {
    name,
    nameEn,
    abbr: teamAbbr(nameEn),
    goals: goals ?? 0,
    flag: getFlagUrl(nameEn),
    badgeUrl: getFlagUrl(nameEn),
  };
}

function buildMatchId(raw) {
  return `of-${raw.date}-${slugifyTeam(raw.team1)}-${slugifyTeam(raw.team2)}`;
}

function goalToEvent(goal, side) {
  const type = goal.owngoal
    ? 'FootballOwnGoal'
    : goal.penalty
      ? 'FootballPenaltyGoal'
      : 'FootballGoal';

  return {
    type,
    teamSide: side,
    player: goal.name,
    minute: goal.minute ? `${goal.minute}'` : '',
    label: goal.owngoal ? 'Autogol' : goal.penalty ? 'Penalti' : 'Gol',
  };
}

export function normalizeOpenfootballMatch(raw) {
  const kickoff = parseMatchTime(raw.date, raw.time);
  const ft = raw.score?.ft ?? null;
  const hasScore = ft !== null;
  const goalsA = hasScore ? ft[0] : 0;
  const goalsB = hasScore ? ft[1] : 0;

  let status = 'Por empezar';
  let minute = null;

  if (hasScore) {
    status = 'Finalizado';
    minute = 'FT';
  } else if (kickoff) {
    const now = Date.now();
    if (kickoff.getTime() > now) {
      status = 'Por empezar';
    } else if (now - kickoff.getTime() > 2.5 * 60 * 60 * 1000) {
      status = 'Finalizado';
      minute = 'FT';
    } else {
      status = 'En Vivo';
      minute = 'En curso';
    }
  }

  const match = {
    id: buildMatchId(raw),
    teamA: buildTeam(raw.team1, goalsA),
    teamB: buildTeam(raw.team2, goalsB),
    minute,
    status,
    kickoffTime: kickoff ? kickoff.toISOString() : `${raw.date}T12:00:00.000Z`,
    kickoffDate: raw.date,
    group: raw.group?.replace('Group ', '') || '',
    matchday: raw.round?.startsWith('Matchday') ? raw.round.replace('Matchday ', '') : null,
    stage: formatStage(raw),
    venue: raw.ground || '',
    round: raw.round || '',
    scheduleSource: 'openfootball',
    openfootballGoals1: raw.goals1 || [],
    openfootballGoals2: raw.goals2 || [],
    youtubeQuery: `relato en vivo mundial 2026 ${translateTeam(raw.team1)} vs ${translateTeam(raw.team2)}`,
  };

  match.status = resolveMatchStatus(match);
  if (match.status === 'Finalizado' && !match.minute) {
    match.minute = 'FT';
  }

  return match;
}

export function buildMatchDetailPayload(match) {
  if (!match) {
    return {
      match: null,
      detail: { events: [], lineup: null, stats: null },
      message: 'Partido no encontrado',
    };
  }

  const events = [
    ...(match.openfootballGoals1 || []).map((goal) => goalToEvent(goal, 'home')),
    ...(match.openfootballGoals2 || []).map((goal) => goalToEvent(goal, 'away')),
  ].sort((a, b) => {
    const minuteA = parseInt(String(a.minute).replace(/\D/g, ''), 10) || 0;
    const minuteB = parseInt(String(b.minute).replace(/\D/g, ''), 10) || 0;
    return minuteA - minuteB;
  });

  const detail = {
    events,
    lineup: null,
    stats: {
      homeScore: match.teamA.goals,
      awayScore: match.teamB.goals,
      matchStatus: match.status,
      currentMinute: match.minute,
      displayStatus: match.displayStatus || match.status,
    },
    venue: match.venue,
    stage: match.stage,
  };

  return {
    match,
    detail,
    message: events.length
      ? 'Goles y resultado del calendario oficial'
      : match.status === 'Por empezar'
        ? 'Partido programado'
        : 'Sin detalle de goles disponible',
  };
}

function formatUpdatedMessage(isoString) {
  if (!isoString) return 'Calendario en vivo';

  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Calendario actualizado hace un momento';
  if (diffMin < 60) return `Calendario actualizado hace ${diffMin} min`;
  return `Calendario actualizado hace ${Math.floor(diffMin / 60)} h`;
}

export async function fetchOpenfootballSchedule() {
  const response = await fetch(`${OPENFOOTBALL_WC_URL}?t=${Date.now()}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error('openfootball_fetch_failed');
  }

  const data = await response.json();
  const matches = attachChannelsToMatches(
    (data.matches || []).map(normalizeOpenfootballMatch)
  );

  cachedMatches = matches;
  cachedAt = new Date().toISOString();

  return matches;
}

export function getCachedOpenfootballMatch(matchId) {
  return cachedMatches.find((match) => String(match.id) === String(matchId)) || null;
}

export async function fetchOpenfootballToday(date) {
  let matches = cachedMatches;

  if (!matches.length) {
    matches = await fetchOpenfootballSchedule();
  }

  const dayMatches = filterMatchesByCalendarDate(matches, date);

  return {
    matches: dayMatches,
    allMatches: matches,
    totalInSchedule: matches.length,
    lastUpdatedAt: cachedAt,
    source: 'openfootball',
    recommendedRefreshSeconds: REFRESH_SECONDS,
    message: formatUpdatedMessage(cachedAt),
    usingFallback: false,
  };
}

export function getOpenfootballRefreshSeconds() {
  return REFRESH_SECONDS;
}
