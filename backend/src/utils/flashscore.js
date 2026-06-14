import { countGoalsFromEvents } from './goalsFromEvents.js';
import { buildYoutubeQuery } from './teams.js';
import { teamNameToSpanish } from './teamNamesEs.js';

export function isFlashscoreMatchId(value) {
  return /^[A-Za-z0-9]{8}$/.test(String(value || ''));
}

export function mapFlashscoreStatus(status = {}) {
  if (status.is_cancelled || status.is_postponed) return 'Por empezar';
  if (status.is_in_progress) return 'En Vivo';
  if (status.is_finished || status.is_finished_after_extra_time || status.is_finished_after_penalties) {
    return 'Finalizado';
  }
  if (status.is_started) return 'En Vivo';
  return 'Por empezar';
}

export function normalizeFlashscoreMatch(raw, tournament = {}) {
  const home = raw.home_team || {};
  const away = raw.away_team || {};
  const statusInfo = raw.match_status || {};
  const status = mapFlashscoreStatus(statusInfo);
  const homeGoals = raw.scores?.home ?? 0;
  const awayGoals = raw.scores?.away ?? 0;
  const kickoffTime = raw.timestamp
    ? new Date(Number(raw.timestamp) * 1000).toISOString()
    : null;
  const homeName = home.name || 'Local';
  const awayName = away.name || 'Visitante';

  let minute = null;
  if (status === 'En Vivo' && statusInfo.live_time) {
    minute = `${statusInfo.live_time}'`;
  } else if (status === 'Finalizado') {
    minute = statusInfo.stage === 'Finished' ? 'FT' : statusInfo.stage || 'FT';
  }

  return {
    flashscoreId: raw.match_id,
    externalApiId: raw.match_id,
    id: raw.match_id,
    teamA: {
      name: homeName,
      nameEn: homeName,
      abbr: home.short_name || homeName.slice(0, 3).toUpperCase(),
      goals: homeGoals ?? 0,
      flag: home.small_image_path || null,
      badgeUrl: home.small_image_path || null,
    },
    teamB: {
      name: awayName,
      nameEn: awayName,
      abbr: away.short_name || awayName.slice(0, 3).toUpperCase(),
      goals: awayGoals ?? 0,
      flag: away.small_image_path || null,
      badgeUrl: away.small_image_path || null,
    },
    minute,
    status,
    displayStatus: statusInfo.stage || (status === 'En Vivo' ? 'En curso' : status),
    kickoffTime,
    kickoffDate: kickoffTime?.slice(0, 10) || null,
    stage: tournament.name || 'Mundial 2026',
    venue: '',
    youtubeQuery: buildYoutubeQuery(homeName, awayName),
    livescoreUrl: `https://www.flashscore.com/match/${raw.match_id}/`,
    scoreSource: 'flashscore',
  };
}

function mapEventType(type = '') {
  const value = String(type).toLowerCase();
  if (value.includes('goal') && value.includes('own')) return { type: 'FootballOwnGoal', label: 'Autogol' };
  if (value.includes('penalty')) return { type: 'FootballPenaltyGoal', label: 'Penalti' };
  if (value.includes('goal')) return { type: 'FootballGoal', label: 'Gol' };
  if (value.includes('red')) return { type: 'FootballRedCard', label: 'Tarjeta roja' };
  if (value.includes('yellow')) return { type: 'FootballYellowCard', label: 'Tarjeta amarilla' };
  if (value.includes('substitution')) return { type: 'FootballSubstitution', label: 'Cambio' };
  return { type: 'FootballEvent', label: type || 'Evento' };
}

export function parseFlashscoreSummary(summary = [], homeTeam, awayTeam) {
  const events = [];

  for (const item of summary) {
    const teamSide = item.team === 'home' ? 'home' : 'away';
    const teamName = teamSide === 'home' ? homeTeam : awayTeam;
    const players = item.players || [];

    const goal = players.find((p) => /goal/i.test(p.type) && !/own/i.test(p.type));
    const assist = players.find((p) => /assist/i.test(p.type));
    const card = players.find((p) => /card/i.test(p.type));
    const subOut = players.find((p) => /substitution.*out/i.test(p.type));
    const subIn = players.find((p) => /substitution.*in/i.test(p.type));

    if (goal) {
      const mapped = mapEventType(goal.type);
      events.push({
        minute: `${item.minutes}'`,
        type: mapped.type,
        label: mapped.label,
        player: goal.name,
        teamSide,
        teamName,
        assist: assist?.name || null,
        score: null,
      });
      continue;
    }

    if (card) {
      const mapped = mapEventType(card.type);
      events.push({
        minute: `${item.minutes}'`,
        type: mapped.type,
        label: mapped.label,
        player: card.name,
        teamSide,
        teamName,
        assist: null,
        score: null,
      });
      continue;
    }

    if (subOut || subIn) {
      events.push({
        minute: `${item.minutes}'`,
        type: 'FootballSubstitution',
        label: 'Cambio',
        player: subIn?.name || subOut?.name || players[0]?.name || '',
        teamSide,
        teamName,
        assist: subOut?.name && subIn?.name ? subOut.name : null,
        score: null,
      });
    }
  }

  return events.sort(
    (a, b) => parseInt(a.minute, 10) - parseInt(b.minute, 10)
  );
}

function positionCategory(position = '') {
  const value = String(position).toLowerCase();
  if (value.includes('goalkeeper') || value.includes('keeper') || value === 'gk') return 'gk';
  if (value.includes('back') || value.includes('def')) return 'def';
  if (value.includes('mid')) return 'mid';
  if (value.includes('wing') || value.includes('forward') || value.includes('striker')) return 'fwd';
  return 'mid';
}

function layoutTeamHalf(starters, side) {
  const rows = { gk: [], def: [], mid: [], fwd: [] };

  for (const player of starters) {
    rows[player.rowCategory].push(player);
  }

  const rowY =
    side === 'home'
      ? { gk: 88, def: 74, mid: 62, fwd: 52 }
      : { gk: 12, def: 26, mid: 38, fwd: 48 };

  for (const category of Object.keys(rows)) {
    rows[category].forEach((player, index, list) => {
      player.y = rowY[category] ?? (side === 'home' ? 70 : 30);
      player.x = list.length === 1 ? 50 : 12 + ((index + 1) / (list.length + 1)) * 76;
      player.side = side;
    });
  }

  return Object.values(rows).flat();
}

function mapFlashscorePlayer(row, formationHint = 'mid') {
  return {
    id: row.player_id,
    name: row.name,
    number: row.number,
    position: formationHint,
    isSubstitute: false,
    rowCategory: positionCategory(formationHint),
    photo: row.image_path || null,
  };
}

function inferFormationFromString(formation = '') {
  const parts = String(formation).split('-').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return formation;
}

function mapSideLineup(sideBlock = {}) {
  const starters = (sideBlock.startingLineups || []).map((row, index, list) => {
    const category =
      index === 0
        ? 'gk'
        : index <= Math.ceil(list.length * 0.35)
          ? 'def'
          : index <= Math.ceil(list.length * 0.7)
            ? 'mid'
            : 'fwd';
    return mapFlashscorePlayer(row, category);
  });

  const substitutes = (sideBlock.substitutes || []).map((row) => ({
    ...mapFlashscorePlayer(row, 'mid'),
    isSubstitute: true,
  }));

  return {
    starters: layoutTeamHalf(starters, sideBlock.side === 'away' ? 'away' : 'home'),
    substitutes,
    all: [...starters, ...substitutes],
    formation: inferFormationFromString(sideBlock.formation),
  };
}

export function parseFlashscoreLineups(lineups = []) {
  if (!Array.isArray(lineups) || !lineups.length) return null;

  const home = lineups.find((side) => side.side === 'home');
  const away = lineups.find((side) => side.side === 'away');
  if (!home && !away) return null;

  return {
    home: home ? mapSideLineup(home) : null,
    away: away ? mapSideLineup(away) : null,
  };
}

export function parseFlashscoreStats(statsPayload = {}, match, homeTeam, awayTeam, events = []) {
  const rows = statsPayload.match || statsPayload || [];
  const findStat = (label) => rows.find((row) => row.name === label);

  const possession = findStat('Ball possession');
  const xg = findStat('Expected goals (xG)');

  const goalTally = countGoalsFromEvents(events);
  const homeScore = Math.max(match.teamA?.goals ?? 0, goalTally.home);
  const awayScore = Math.max(match.teamB?.goals ?? 0, goalTally.away);

  return {
    homeScore,
    awayScore,
    homeRedCards: match.teamA?.red_cards ?? 0,
    awayRedCards: match.teamB?.red_cards ?? 0,
    currentMinute: match.minute,
    inplayStatus: match.displayStatus || match.status,
    possession: possession
      ? { home: possession.home_team, away: possession.away_team }
      : null,
    expectedGoals: xg ? { home: xg.home_team, away: xg.away_team } : null,
    referee: null,
    venue: match.venue || null,
    homeTeam,
    awayTeam,
  };
}

export function localizeFlashscoreMatch(match) {
  return {
    ...match,
    teamA: {
      ...match.teamA,
      name: teamNameToSpanish(match.teamA.name),
    },
    teamB: {
      ...match.teamB,
      name: teamNameToSpanish(match.teamB.name),
    },
  };
}

export function computeFlashscoreDayOffset(targetDate, todayDate) {
  const target = new Date(`${targetDate}T12:00:00`);
  const today = new Date(`${todayDate}T12:00:00`);
  const diff = Math.round((target - today) / 86_400_000);
  return Math.max(-7, Math.min(7, diff));
}
