import { buildYoutubeQuery, getFlagUrl, slugifyTeam } from './teams.js';
import { normalizeTeamForKey } from './teamNamesEs.js';

export function parseLiveScoreDateTime(value) {
  if (!value || value.length !== 14) return null;
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.slice(8, 10);
  const minute = value.slice(10, 12);
  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

export function mapLiveScoreStatus(event) {
  const details = event.matchStatusDetails || {};
  const raw = (event.eventStatus || '').toUpperCase();

  if (details.isInProgress || raw === 'LIVE' || raw === 'IN_PROGRESS') {
    return 'En Vivo';
  }

  if (
    details.isFinished ||
    raw === 'PAST' ||
    raw === 'FINISHED' ||
    event.status === 'FT' ||
    event.status === 'AET' ||
    event.status === 'PEN'
  ) {
    return 'Finalizado';
  }

  return 'Por empezar';
}

export function normalizeLiveScoreEvent(event, locale = 'en') {
  const kickoffTime =
    parseLiveScoreDateTime(event.startDateTimeString) ||
    new Date().toISOString();
  const kickoffDate = kickoffTime.slice(0, 10);
  const status = mapLiveScoreStatus(event);
  const homeGoals = Number.parseInt(event.homeTeamScore ?? event.homeFullTimeScore ?? '0', 10);
  const awayGoals = Number.parseInt(event.awayTeamScore ?? event.awayFullTimeScore ?? '0', 10);
  const homeName = event.homeTeamName || 'Local';
  const awayName = event.awayTeamName || 'Visitante';
  const slug = `${slugifyTeam(homeName)}-vs-${slugifyTeam(awayName)}`;

  return {
    id: String(event.id),
    liveScoreEventId: String(event.id),
    teamA: {
      name: homeName,
      abbr: event.homeTeamAbr || homeName.slice(0, 3).toUpperCase(),
      goals: Number.isNaN(homeGoals) ? 0 : homeGoals,
      flag: getFlagUrl(homeName, event.homeTeamBadge || event.homeTeamImgSlug),
      badgeUrl: getFlagUrl(homeName, event.homeTeamBadge || event.homeTeamImgSlug),
    },
    teamB: {
      name: awayName,
      abbr: event.awayTeamAbr || awayName.slice(0, 3).toUpperCase(),
      goals: Number.isNaN(awayGoals) ? 0 : awayGoals,
      flag: getFlagUrl(awayName, event.awayTeamBadge || event.awayTeamImgSlug),
      badgeUrl: getFlagUrl(awayName, event.awayTeamBadge || event.awayTeamImgSlug),
    },
    minute:
      status === 'En Vivo'
        ? event.matchStatusDetails?.liveTime || event.status || "En curso"
        : status === 'Finalizado'
          ? 'FT'
          : null,
    status,
    kickoffTime,
    kickoffDate,
    stage: event.stageName || event.competitionName || 'Mundial 2026',
    venue: event.venue || '',
    youtubeQuery: buildYoutubeQuery(homeName, awayName),
    livescoreUrl: `https://www.livescore.com/${locale}/football/international/world-cup-2026/${slug}/${event.id}/`,
  };
}

export function getDisplayStatus(match) {
  if (match.status === 'Finalizado') return 'Terminado';
  if (match.status === 'Por empezar') return 'Programado';
  if (match.minute === 'HT') return 'Medio tiempo';
  if (match.status === 'En Vivo') return 'En vivo';
  return match.status;
}

const IMPORTANT_STAGE = /final|semi|semifinal|tercer|third|3rd|cuartos|quarter|knockout/i;

export function isImportantMatchStage(stage = '') {
  return IMPORTANT_STAGE.test(stage);
}

export function enrichMatchMetadata(match) {
  return {
    ...match,
    displayStatus: getDisplayStatus(match),
    isImportant: isImportantMatchStage(match.stage),
  };
}

export function mapSportsApiProStatus(match) {
  if (match.inplay) return 'En Vivo';

  const code = Number(match.matchStatus);
  if (code === 8) return 'Finalizado';
  if (code === 1) return 'Por empezar';
  if (code >= 2 && code <= 7) return 'En Vivo';

  if (match.homeScore != null && match.awayScore != null && !match.inplay) {
    return 'Finalizado';
  }

  return 'Por empezar';
}

export function mapSportsApiProMinute(match, status) {
  if (status === 'Finalizado') return 'FT';

  const labels = {
    2: "1'",
    3: "1'",
    4: 'HT',
    5: "2'",
    6: "2'",
    7: 'ET',
  };

  if (status === 'En Vivo') {
    return labels[match.matchStatus] || 'En curso';
  }

  return null;
}

export function parseSportsApiProDate(value) {
  if (!value) return new Date().toISOString();
  return value.replace(' ', 'T').replace('+00', '+00:00');
}

export function normalizeSportsApiProMatch(match) {
  const homeName = match.homeTeam || 'Local';
  const awayName = match.awayTeam || 'Visitante';
  const status = mapSportsApiProStatus(match);
  const kickoffTime = parseSportsApiProDate(match.matchDate);
  const kickoffDate = kickoffTime.slice(0, 10);
  const homeGoals = match.homeScore ?? 0;
  const awayGoals = match.awayScore ?? 0;

  return {
    id: String(match.id || match.matchId),
    externalApiId: String(match.id || match.matchId),
    teamA: {
      name: homeName,
      abbr: match.homeTeamAbbr || homeName.slice(0, 3).toUpperCase(),
      goals: homeGoals ?? 0,
      flag: getFlagUrl(homeName),
      badgeUrl: getFlagUrl(homeName),
    },
    teamB: {
      name: awayName,
      abbr: match.awayTeamAbbr || awayName.slice(0, 3).toUpperCase(),
      goals: awayGoals ?? 0,
      flag: getFlagUrl(awayName),
      badgeUrl: getFlagUrl(awayName),
    },
    minute: mapSportsApiProMinute(match, status),
    status,
    kickoffTime,
    kickoffDate,
    stage: match.leagueRound || match.leagueName || 'Mundial 2026',
    venue: match.venue || '',
    youtubeQuery: buildYoutubeQuery(homeName, awayName),
    livescoreUrl: `https://www.livescore.com/en/football/international/world-cup-2026/${slugifyTeam(homeName)}-vs-${slugifyTeam(awayName)}/${match.id || match.matchId}/`,
  };
}

export function mapApiFootballStatus(shortStatus, elapsed) {
  const value = (shortStatus || '').toUpperCase();

  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT'].includes(value)) {
    return 'En Vivo';
  }

  if (['FT', 'AET', 'PEN'].includes(value)) {
    return 'Finalizado';
  }

  if (elapsed != null && elapsed > 0) {
    return 'En Vivo';
  }

  return 'Por empezar';
}

export function normalizeApiFootballFixture(fixture) {
  const homeName = fixture.teams.home.name;
  const awayName = fixture.teams.away.name;
  const statusShort = fixture.fixture.status.short;
  const elapsed = fixture.fixture.status.elapsed;
  const status = mapApiFootballStatus(statusShort, elapsed);
  const kickoffTime = fixture.fixture.date;
  const kickoffDate = kickoffTime.slice(0, 10);
  const homeGoals = fixture.goals.home ?? 0;
  const awayGoals = fixture.goals.away ?? 0;

  let minute = null;
  if (status === 'En Vivo') {
    minute = elapsed != null ? `${elapsed}'` : statusShort;
  } else if (status === 'Finalizado') {
    minute = statusShort || 'FT';
  }

  return {
    id: String(fixture.fixture.id),
    teamA: {
      name: homeName,
      abbr: homeName.slice(0, 3).toUpperCase(),
      goals: homeGoals ?? 0,
      flag: fixture.teams.home.logo || getFlagUrl(homeName),
      badgeUrl: fixture.teams.home.logo || getFlagUrl(homeName),
    },
    teamB: {
      name: awayName,
      abbr: awayName.slice(0, 3).toUpperCase(),
      goals: awayGoals ?? 0,
      flag: fixture.teams.away.logo || getFlagUrl(awayName),
      badgeUrl: fixture.teams.away.logo || getFlagUrl(awayName),
    },
    minute,
    status,
    kickoffTime,
    kickoffDate,
    stage: fixture.league.round || fixture.league.name || 'Mundial 2026',
    venue: fixture.fixture.venue?.name || '',
    youtubeQuery: buildYoutubeQuery(homeName, awayName),
    livescoreUrl: `https://www.livescore.com/en/football/international/world-cup-2026/${slugifyTeam(homeName)}-vs-${slugifyTeam(awayName)}/${fixture.fixture.id}/`,
  };
}

export function mapSportsDbStatus(strStatus) {
  const value = (strStatus || '').toUpperCase();
  if (['1H', '2H', 'HT', 'ET', 'BT', 'LIVE', 'P', 'INT'].includes(value)) {
    return 'En Vivo';
  }
  if (['FT', 'AET', 'PEN'].includes(value)) return 'Finalizado';
  return 'Por empezar';
}

export function normalizeSportsDbEvent(event) {
  const kickoffTime = event.strTimestamp
    ? event.strTimestamp.endsWith('Z')
      ? event.strTimestamp
      : `${event.strTimestamp}Z`
    : `${event.dateEvent}T${event.strTime || '00:00:00'}Z`;
  const status = mapSportsDbStatus(event.strStatus);
  const homeGoals = event.intHomeScore == null ? 0 : Number(event.intHomeScore);
  const awayGoals = event.intAwayScore == null ? 0 : Number(event.intAwayScore);

  return {
    id: String(event.idEvent),
    theSportsDbId: String(event.idEvent),
    teamA: {
      name: event.strHomeTeam,
      abbr: event.strHomeTeam?.slice(0, 3).toUpperCase() || 'LOC',
      goals: Number.isNaN(homeGoals) ? 0 : homeGoals,
      flag: event.strHomeTeamBadge || getFlagUrl(event.strHomeTeam),
      badgeUrl: event.strHomeTeamBadge || getFlagUrl(event.strHomeTeam),
    },
    teamB: {
      name: event.strAwayTeam,
      abbr: event.strAwayTeam?.slice(0, 3).toUpperCase() || 'VIS',
      goals: Number.isNaN(awayGoals) ? 0 : awayGoals,
      flag: event.strAwayTeamBadge || getFlagUrl(event.strAwayTeam),
      badgeUrl: event.strAwayTeamBadge || getFlagUrl(event.strAwayTeam),
    },
    minute: status === 'En Vivo' ? event.strProgress || event.strStatus : status === 'Finalizado' ? 'FT' : null,
    status,
    kickoffTime,
    kickoffDate: event.dateEvent,
    stage: `Grupo / Jornada ${event.intRound || ''}`.trim(),
    venue: event.strVenue || '',
    youtubeQuery: buildYoutubeQuery(event.strHomeTeam, event.strAwayTeam),
    livescoreUrl: `https://www.livescore.com/en/football/international/world-cup-2026/${slugifyTeam(event.strHomeTeam)}-vs-${slugifyTeam(event.strAwayTeam)}/`,
  };
}

const TEAM_KEY_ALIASES = {
  'czech-republic': 'czechia',
  czechia: 'czechia',
  'bosnia-herzegovina': 'bosnia',
  'bosnia-and-herzegovina': 'bosnia',
  bosnia: 'bosnia',
  usa: 'united-states',
  'united-states': 'united-states',
  'ivory-coast': 'ivory-coast',
  'cote-divoire': 'ivory-coast',
  turkiye: 'turkey',
  turkey: 'turkey',
  'cape-verde': 'cape-verde',
  'cabo-verde': 'cape-verde',
  'dr-congo': 'dr-congo',
  'congo-dr': 'dr-congo',
  curacao: 'curacao',
  netherlands: 'netherlands',
  'south-korea': 'south-korea',
  'korea-republic': 'south-korea',
};

function normalizeTeamKey(name) {
  const slug = normalizeTeamForKey(name);
  return TEAM_KEY_ALIASES[slug] || slug;
}

export function fixtureKey(match) {
  const teams = [normalizeTeamKey(match.teamA.name), normalizeTeamKey(match.teamB.name)].sort();
  return `${teams[0]}|${teams[1]}|${match.kickoffDate}`;
}

export function teamPairKey(match) {
  const teams = [normalizeTeamKey(match.teamA?.name || ''), normalizeTeamKey(match.teamB?.name || '')].sort();
  return `${teams[0]}|${teams[1]}`;
}

export function mergeMatchesPreferPrimary(primary, secondary) {
  const map = new Map(primary.map((match) => [fixtureKey(match), match]));

  for (const match of secondary) {
    const key = fixtureKey(match);
    if (!map.has(key)) {
      map.set(key, match);
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );
}

export function mergeMatches(existing, incoming) {
  const map = new Map(existing.map((match) => [match.id, match]));

  for (const match of incoming) {
    const current = map.get(match.id);
    if (!current) {
      map.set(match.id, match);
      continue;
    }

    map.set(match.id, {
      ...current,
      ...match,
      teamA: { ...current.teamA, ...match.teamA },
      teamB: { ...current.teamB, ...match.teamB },
    });
  }

  return [...map.values()].sort(
    (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );
}
