import * as cheerio from 'cheerio';
import { fetchJson, fetchText } from './utils/http.js';
import {
  mergeMatches,
  normalizeLiveScoreEvent,
  normalizeSportsDbEvent,
} from './utils/match.js';
import { slugifyTeam } from './utils/teams.js';

const LIVESCORE_PAGES = (locale) => [
  `https://www.livescore.com/${locale}/football/international/world-cup-2026/`,
  `https://www.livescore.com/${locale}/football/international/world-cup-2026/fixtures/`,
];

const SPORTSDB_SEASON_URL =
  'https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4429&s=2026';

function extractNextData(html) {
  const $ = cheerio.load(html);
  const raw = $('#__NEXT_DATA__').html();
  if (!raw) return null;
  return JSON.parse(raw);
}

function extractEventsFromPageProps(pageProps) {
  const sectionEvents = (pageProps?.initialData?.sections || []).flatMap(
    (section) => section.events || []
  );

  if (sectionEvents.length) return sectionEvents;

  if (pageProps?.initialEventData?.event) {
    return [pageProps.initialEventData.event];
  }

  return [];
}

async function scrapeLiveScorePage(url, locale) {
  const html = await fetchText(url);
  const nextData = extractNextData(html);
  if (!nextData?.props?.pageProps) return [];

  return extractEventsFromPageProps(nextData.props.pageProps).map((event) =>
    normalizeLiveScoreEvent(event, locale)
  );
}

async function scrapeLiveScoreMatch(match, locale) {
  const slug = `${slugifyTeam(match.teamA.name)}-vs-${slugifyTeam(match.teamB.name)}`;
  const url = `https://www.livescore.com/${locale}/football/international/world-cup-2026/${slug}/${match.id}/`;

  try {
    const html = await fetchText(url);
    const nextData = extractNextData(html);
    const events = extractEventsFromPageProps(nextData?.props?.pageProps || {});
    if (!events.length) return match;
    return normalizeLiveScoreEvent(events[0], locale);
  } catch {
    return match;
  }
}

async function scrapeLiveScore(locale) {
  const batches = await Promise.allSettled(
    LIVESCORE_PAGES(locale).map((url) => scrapeLiveScorePage(url, locale))
  );

  let matches = [];
  for (const batch of batches) {
    if (batch.status === 'fulfilled') {
      matches = mergeMatches(matches, batch.value);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const refreshTargets = matches.filter(
    (match) =>
      match.kickoffDate === today ||
      match.status === 'En Vivo' ||
      (match.status === 'Finalizado' && match.kickoffDate === today)
  );

  const refreshed = await Promise.all(
    refreshTargets.slice(0, 12).map((match) => scrapeLiveScoreMatch(match, locale))
  );

  return mergeMatches(matches, refreshed);
}

async function scrapeSportsDbFallback() {
  const payload = await fetchJson(SPORTSDB_SEASON_URL);
  return (payload.events || [])
    .filter((event) => event.idLeague === '4429' || event.strLeague === 'FIFA World Cup')
    .map(normalizeSportsDbEvent);
}

export async function scrapeWorldCupMatches(locale = 'en') {
  try {
    const scraped = await scrapeLiveScore(locale);
    if (scraped.length >= 3) {
      return { matches: scraped, source: 'livescore-scraper' };
    }

    const fallback = await scrapeSportsDbFallback();
    return {
      matches: mergeMatches(scraped, fallback),
      source: scraped.length ? 'livescore+sportsdb' : 'sportsdb-fallback',
    };
  } catch (error) {
    const fallback = await scrapeSportsDbFallback();
    return {
      matches: fallback,
      source: 'sportsdb-fallback',
      error: error.message,
    };
  }
}
