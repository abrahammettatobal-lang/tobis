import * as cheerio from 'cheerio';
import { fetchText } from '../utils/http.js';

const EVENT_LABELS = {
  FootballGoal: 'Gol',
  FootballOwnGoal: 'Autogol',
  FootballYellowCard: 'Tarjeta amarilla',
  FootballRedCard: 'Tarjeta roja',
  FootballSubstitution: 'Cambio',
  FootballPenaltyGoal: 'Penalti',
};

function parseIncidentsTree(incidents) {
  if (!incidents?.incs) return [];

  const events = [];

  for (const period of Object.values(incidents.incs)) {
    for (const minuteBlock of Object.values(period)) {
      for (const sideBlock of minuteBlock) {
        for (const side of ['HOME', 'AWAY']) {
          for (const item of sideBlock[side] || []) {
            events.push({
              minute: item.time || '',
              type: item.type || 'Event',
              label: EVENT_LABELS[item.type] || item.type,
              player: item.name || item.shortName || 'Jugador',
              teamSide: side === 'HOME' ? 'home' : 'away',
              assist: item.assist?.[0]?.name || null,
              score: item.score || null,
            });
          }
        }
      }
    }
  }

  return events.sort((a, b) => parseMinute(a.minute) - parseMinute(b.minute));
}

function parseMinute(value) {
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export async function fetchLiveScoreIncidents(livescoreUrl) {
  if (!livescoreUrl) return [];

  const summaryUrl = livescoreUrl.replace(/\/$/, '/');
  const html = await fetchText(summaryUrl);
  const $ = cheerio.load(html);
  const raw = $('#__NEXT_DATA__').html();
  if (!raw) return [];

  const data = JSON.parse(raw);
  const incidents = data?.props?.pageProps?.initialEventData?.event?.incidents;
  return parseIncidentsTree(incidents);
}
