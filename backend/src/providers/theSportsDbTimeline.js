import { fetchJson } from '../utils/http.js';

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

const TIMELINE_LABELS = {
  Goal: 'Gol',
  Card: 'Tarjeta',
};

const CARD_DETAILS = {
  'Yellow Card': 'Tarjeta amarilla',
  'Red Card': 'Tarjeta roja',
  'Second Yellow': 'Tarjeta roja',
};

function mapTimelineType(entry) {
  if (entry.strTimeline === 'Goal') {
    if (entry.strTimelineDetail?.includes('Own')) return 'FootballOwnGoal';
    if (entry.strTimelineDetail?.includes('Penalty')) return 'FootballPenaltyGoal';
    return 'FootballGoal';
  }

  if (entry.strTimeline === 'Card') {
    const detail = entry.strTimelineDetail || '';
    if (detail.includes('Red')) return 'FootballRedCard';
    if (detail.includes('Yellow')) return 'FootballYellowCard';
  }

  if (entry.strTimeline === 'subst') return 'FootballSubstitution';
  return entry.strTimeline || 'Event';
}

function mapTimelineLabel(entry) {
  if (entry.strTimeline === 'Goal') {
    if (entry.strTimelineDetail?.includes('Own')) return 'Autogol';
    if (entry.strTimelineDetail?.includes('Penalty')) return 'Penalti';
    return 'Gol';
  }

  if (entry.strTimeline === 'Card') {
    return CARD_DETAILS[entry.strTimelineDetail] || 'Tarjeta';
  }

  if (entry.strTimeline === 'subst') return 'Cambio';
  return TIMELINE_LABELS[entry.strTimeline] || entry.strTimeline || 'Evento';
}

export async function fetchTheSportsDbTimeline(eventId) {
  if (!eventId) return [];

  try {
    const payload = await fetchJson(`${BASE}/lookuptimeline.php?id=${eventId}`);
    const timeline = payload.timeline || [];
    if (!timeline.length) return [];

    return timeline
      .map((entry) => ({
        minute: entry.intTime ? `${entry.intTime}'` : "0'",
        type: mapTimelineType(entry),
        label: mapTimelineLabel(entry),
        player: entry.strPlayer || 'Jugador',
        teamSide: entry.strHome === 'Yes' ? 'home' : 'away',
        assist: entry.strAssist && entry.strAssist !== '0' ? entry.strAssist : null,
        score: null,
      }))
      .sort((a, b) => parseInt(a.minute, 10) - parseInt(b.minute, 10));
  } catch {
    return [];
  }
}
