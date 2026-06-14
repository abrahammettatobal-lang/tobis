import { fetchMatchDetail } from '../providers/sportsApiPro.js';
import {
  fetchMatchLineups,
  fetchMatchStats,
  fetchMatchSummary,
} from '../providers/flashscoreRapidApi.js';
import { fetchLiveScoreIncidents } from '../providers/livescoreIncidents.js';
import { fetchTheSportsDbTimeline } from '../providers/theSportsDbTimeline.js';
import {
  fetchTheSportsDbLineup,
  findTheSportsDbEventId,
} from '../providers/theSportsDbLineup.js';
import { getDailyApiBudget, incrementDailyApiUsage } from './apiBudget.js';
import { getLocalSchedule, resolveMatchFromSchedules } from './localSchedule.js';
import { isMatchProbablyLive } from './refreshPolicy.js';
import { resolveMatchScores } from '../utils/goalsFromEvents.js';
import {
  isFlashscoreMatchId,
  parseFlashscoreLineups,
  parseFlashscoreStats,
  parseFlashscoreSummary,
} from '../utils/flashscore.js';

const detailCache = new Map();
const INCIDENTS_TIMEOUT_MS = 8_000;
const LOOKUP_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = {
  live: 3 * 60 * 1000,
  finished: 6 * 60 * 60 * 1000,
  scheduled: 30 * 60 * 1000,
};

function getCacheTtl(match) {
  if (match.status === 'Finalizado') return CACHE_TTL_MS.finished;
  if (match.status === 'En Vivo' || isMatchProbablyLive(match)) return CACHE_TTL_MS.live;
  return CACHE_TTL_MS.scheduled;
}

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY || process.env.FLASHSCORE_RAPIDAPI_KEY;
}

function getSportsApiKey() {
  return process.env.SPORTSAPI_KEY || process.env.SPORTSAPIPRO_KEY;
}

function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

function resolveFlashscoreId(match) {
  if (match?.flashscoreId) return String(match.flashscoreId);
  if (isFlashscoreMatchId(match?.externalApiId)) return String(match.externalApiId);
  return null;
}

function parseScorers(rawScorers, homeTeam, awayTeam) {
  if (!rawScorers) return [];

  let list = rawScorers;
  if (typeof rawScorers === 'string') {
    try {
      list = JSON.parse(rawScorers);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(list)) return [];

  const seen = new Set();

  return list
    .filter((item) => {
      const key = `${item.player}-${item.match_time}-${item.competitor}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({
      minute: `${item.match_time}'`,
      type: item.is_own_goal ? 'FootballOwnGoal' : 'FootballGoal',
      label: item.is_own_goal ? 'Autogol' : item.is_by_penalty ? 'Penalti' : 'Gol',
      player: formatPlayerName(item.player),
      teamSide: item.competitor === 'home' ? 'home' : 'away',
      teamName: item.competitor === 'home' ? homeTeam : awayTeam,
      assist: null,
      score: null,
    }));
}

function formatPlayerName(value = '') {
  if (!value.includes(',')) return value;
  const [last, first] = value.split(',').map((part) => part.trim());
  return `${first} ${last}`.trim();
}

function mergeEvents(...sources) {
  const map = new Map();

  for (const list of sources) {
    for (const event of list) {
      const key = `${event.minute}-${event.type}-${event.player}-${event.teamSide}`;
      if (!map.has(key)) map.set(key, event);
    }
  }

  return [...map.values()].sort(
    (a, b) => parseMinute(a.minute) - parseMinute(b.minute)
  );
}

function parseMinute(value) {
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function buildStatsFromApi(raw = {}, homeTeam, awayTeam) {
  return {
    homeScore: raw.homeScore ?? raw.home_score ?? null,
    awayScore: raw.awayScore ?? raw.away_score ?? null,
    homeRedCards: raw.ht_red_cards ?? 0,
    awayRedCards: raw.at_red_cards ?? 0,
    currentMinute: raw.current_time ? `${raw.current_time}'` : null,
    inplayStatus: raw.inplay_status || raw.inplayStatus || null,
    referee: raw.referee_name || null,
    venue: raw.venue_name || null,
    homeTeam,
    awayTeam,
  };
}

async function fetchFlashscoreDetail(match, flashscoreId) {
  const apiKey = getRapidApiKey();
  if (!apiKey || !flashscoreId) return null;

  const [summary, lineups, stats] = await Promise.all([
    fetchMatchSummary(apiKey, flashscoreId).catch(() => []),
    fetchMatchLineups(apiKey, flashscoreId).catch(() => []),
    fetchMatchStats(apiKey, flashscoreId).catch(() => ({})),
  ]);

  const events = parseFlashscoreSummary(summary, match.teamA.name, match.teamB.name);
  const lineup = parseFlashscoreLineups(lineups);
  const parsedStats = parseFlashscoreStats(
    stats,
    match,
    match.teamA.name,
    match.teamB.name,
    events
  );

  return {
    events,
    lineup,
    stats: parsedStats,
    apiRaw: { summary, lineups, stats },
    source: 'flashscore',
  };
}

async function shouldFetchPaidDetail(match, cached) {
  if (getRapidApiKey() && resolveFlashscoreId(match)) return false;
  if (!getSportsApiKey()) return false;

  const budget = await getDailyApiBudget();
  if (budget.remainingToday <= 0) return false;

  const kickoffMs = new Date(match.kickoffTime || 0).getTime();
  const kickoffPassed = !Number.isNaN(kickoffMs) && kickoffMs <= Date.now();

  if (!cached && kickoffPassed) {
    return true;
  }

  if (!cached) {
    return match.status !== 'Por empezar' || isMatchProbablyLive(match);
  }

  const age = Date.now() - cached.fetchedAt;
  if (match.status === 'Finalizado') return false;
  if (match.status === 'En Vivo' || isMatchProbablyLive(match)) {
    return age >= CACHE_TTL_MS.live;
  }

  return false;
}

export async function getMatchDetail(match) {
  if (!match?.id) return null;

  const cached = detailCache.get(match.id);
  if (cached && Date.now() - cached.fetchedAt < getCacheTtl(match)) {
    return cached.payload;
  }

  const flashscoreId = resolveFlashscoreId(match);
  let flashscoreDetail = null;

  if (flashscoreId) {
    flashscoreDetail = await withTimeout(
      fetchFlashscoreDetail(match, flashscoreId).catch(() => null),
      12_000,
      null
    );
  }

  const [incidents, sportsDbEventId] = await Promise.all([
    flashscoreDetail?.events?.length
      ? Promise.resolve([])
      : withTimeout(fetchLiveScoreIncidents(match.livescoreUrl).catch(() => []), INCIDENTS_TIMEOUT_MS, []),
    withTimeout(findTheSportsDbEventId(match).catch(() => null), LOOKUP_TIMEOUT_MS, null),
  ]);

  let timelineEvents = [];
  if (!flashscoreDetail?.events?.length && !incidents.length && sportsDbEventId) {
    timelineEvents = await withTimeout(
      fetchTheSportsDbTimeline(sportsDbEventId).catch(() => []),
      LOOKUP_TIMEOUT_MS,
      []
    );
  }

  const lineup =
    flashscoreDetail?.lineup ||
    (sportsDbEventId
      ? await withTimeout(fetchTheSportsDbLineup(sportsDbEventId).catch(() => null), LOOKUP_TIMEOUT_MS, null)
      : null);

  let apiDetail = null;
  let apiSource = flashscoreDetail ? 'flashscore' : 'free';

  if (!flashscoreDetail && (await shouldFetchPaidDetail(match, cached))) {
    const apiMatchId = match.externalApiId || match.id;
    try {
      await incrementDailyApiUsage();
      apiDetail = await fetchMatchDetail(getSportsApiKey(), apiMatchId);
      apiSource = 'api';
    } catch {
      apiDetail = null;
    }
  }

  const apiRaw = apiDetail?.raw || apiDetail;
  const apiEvents = parseScorers(
    apiRaw?.scorers,
    match.teamA.name,
    match.teamB.name
  );

  const events = flashscoreDetail?.events?.length
    ? flashscoreDetail.events
    : mergeEvents(incidents, timelineEvents, apiEvents);

  const stats =
    flashscoreDetail?.stats ||
    (apiRaw
      ? buildStatsFromApi(apiRaw, match.teamA.name, match.teamB.name)
      : {
          homeRedCards: events.filter(
            (e) => e.type === 'FootballRedCard' && e.teamSide === 'home'
          ).length,
          awayRedCards: events.filter(
            (e) => e.type === 'FootballRedCard' && e.teamSide === 'away'
          ).length,
          currentMinute: match.minute,
          inplayStatus: match.displayStatus,
          referee: null,
          venue: match.venue,
          homeTeam: match.teamA.name,
          awayTeam: match.teamB.name,
        });

  const scores = resolveMatchScores(match, { stats, events });
  stats.homeScore = scores.home;
  stats.awayScore = scores.away;

  const payload = {
    matchId: match.id,
    events,
    lineup,
    stats,
    apiRaw: flashscoreDetail?.apiRaw || (apiSource === 'api' ? apiRaw : null),
    source: apiSource,
    lastUpdatedAt: new Date().toISOString(),
  };

  detailCache.set(match.id, { fetchedAt: Date.now(), payload });
  return payload;
}

export function findMatchById(matchId, matches = []) {
  return matches.find((match) => String(match.id) === String(matchId)) || null;
}

export async function resolveMatchById(matchId, cachedMatches = []) {
  const direct = findMatchById(matchId, cachedMatches);
  if (direct) return direct;

  const fromSchedule = await resolveMatchFromSchedules(matchId);
  if (fromSchedule) return fromSchedule;

  const local = await getLocalSchedule();
  return findMatchById(matchId, local);
}
