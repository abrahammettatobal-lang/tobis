import { fetchJson } from '../utils/http.js';
import { teamNameToEnglish } from '../utils/teamNamesEs.js';

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

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

function positionCategory(strPosition = '') {
  const value = strPosition.toLowerCase();
  if (value.includes('goalkeeper') || value.includes('keeper')) return 'gk';
  if (
    value.includes('back') ||
    value.includes('defen') ||
    value.includes('sweeper')
  ) {
    return 'def';
  }
  if (value.includes('mid')) return 'mid';
  if (
    value.includes('wing') ||
    value.includes('forward') ||
    value.includes('striker') ||
    value.includes('attacker')
  ) {
    return 'fwd';
  }
  return 'mid';
}

function inferFormation(starters) {
  const counts = { def: 0, mid: 0, fwd: 0 };
  for (const player of starters) {
    if (player.rowCategory in counts) counts[player.rowCategory] += 1;
  }
  if (!counts.def && !counts.mid && !counts.fwd) return null;
  return `${counts.def}-${counts.mid}-${counts.fwd}`;
}

function mapPlayer(row) {
  return {
    id: row.idPlayer,
    name: row.strPlayer,
    number: row.intSquadNumber,
    position: row.strPosition,
    isSubstitute: row.strSubstitute === 'Yes',
    rowCategory: positionCategory(row.strPosition),
    photo: row.strCutout || row.strThumb || null,
  };
}

export async function fetchTheSportsDbLineup(eventId) {
  if (!eventId) return null;

  try {
    const payload = await fetchJson(`${BASE}/lookuplineup.php?id=${eventId}`);
    const lineup = payload.lineup || [];
    if (!lineup.length) return null;

    const home = [];
    const away = [];

    for (const row of lineup) {
      const player = mapPlayer(row);
      if (row.strHome === 'Yes') home.push(player);
      else away.push(player);
    }

    const homeStarters = home.filter((p) => !p.isSubstitute);
    const awayStarters = away.filter((p) => !p.isSubstitute);

    return {
      home: {
        starters: layoutTeamHalf(homeStarters, 'home'),
        substitutes: home.filter((p) => p.isSubstitute),
        all: home,
        formation: inferFormation(homeStarters),
      },
      away: {
        starters: layoutTeamHalf(awayStarters, 'away'),
        substitutes: away.filter((p) => p.isSubstitute),
        all: away,
        formation: inferFormation(awayStarters),
      },
    };
  } catch {
    return null;
  }
}

export async function findTheSportsDbEventId(match) {
  if (match.theSportsDbId) return String(match.theSportsDbId);

  const directId = match.id ? String(match.id) : '';
  if (/^\d{6,8}$/.test(directId)) {
    return directId;
  }

  const homeEn = match.teamA?.nameEn || teamNameToEnglish(match.teamA?.name || '');
  const awayEn = match.teamB?.nameEn || teamNameToEnglish(match.teamB?.name || '');

  try {
    const day = match.kickoffDate;
    const payload = await fetchJson(
      `${BASE}/eventsday.php?d=${day}&s=Soccer`
    );
    const events = payload.events || [];
    const found = events.find((event) => {
      const homeMatch =
        event.strHomeTeam === homeEn ||
        event.strHomeTeam === match.teamA?.name ||
        event.strHomeTeam === match.teamA?.nameEn;
      const awayMatch =
        event.strAwayTeam === awayEn ||
        event.strAwayTeam === match.teamB?.name ||
        event.strAwayTeam === match.teamB?.nameEn;
      return homeMatch && awayMatch;
    });
    return found?.idEvent || null;
  } catch {
    return null;
  }
}
