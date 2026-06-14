import fs from 'fs/promises';
import path from 'path';
import { scrapeWorldCupMatches } from '../scraper.js';
import { enrichMatchMetadata } from '../utils/match.js';
import { matchIsOnDate } from '../utils/timezone.js';
import { BUNDLED_DATA_DIR, DATA_DIR } from './apiBudget.js';
import { mergeScheduleLayers } from './scheduleMerge.js';

const SCHEDULE_FILE = path.join(DATA_DIR, 'local-schedule.json');
const PDF_SCHEDULE_FILE = path.join(BUNDLED_DATA_DIR, 'worldcup-schedule.json');
const REFRESH_MS = 24 * 60 * 60 * 1000;

async function readScheduleFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { matches: [], updatedAt: null };
  }
}

async function writeScheduleFile(filePath, payload) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.warn('[local-schedule] No se pudo escribir:', error.message);
  }
}

export async function getPdfSchedule() {
  const current = await readScheduleFile(PDF_SCHEDULE_FILE);
  return (current.matches || []).map(enrichMatchMetadata);
}

export async function refreshLocalSchedule(locale = 'en') {
  const result = await scrapeWorldCupMatches(locale);
  const matches = result.matches.map(enrichMatchMetadata);

  const payload = {
    matches,
    updatedAt: new Date().toISOString(),
    source: result.source,
  };

  await writeScheduleFile(SCHEDULE_FILE, payload);
  return payload;
}

export async function ensureLocalScheduleFresh(locale = 'en') {
  const current = await readScheduleFile(SCHEDULE_FILE);
  const isStale =
    !current.updatedAt ||
    Date.now() - new Date(current.updatedAt).getTime() > REFRESH_MS;

  if (isStale) {
    try {
      return await refreshLocalSchedule(locale);
    } catch (error) {
      console.warn('[local-schedule] Scraper omitido:', error.message);
      if (current.matches?.length) return current;
      return { matches: await getPdfSchedule(), updatedAt: null, source: 'pdf' };
    }
  }

  return current;
}

export async function getScraperEnrichment() {
  const current = await readScheduleFile(SCHEDULE_FILE);
  return (current.matches || []).map(enrichMatchMetadata);
}

export async function getLocalSchedule() {
  const [pdfSchedule, enrichments] = await Promise.all([
    getPdfSchedule(),
    getScraperEnrichment(),
  ]);

  return mergeScheduleLayers(pdfSchedule, enrichments, []);
}

export async function getTodayMatchesLocal(date) {
  const schedule = await getLocalSchedule();
  return schedule.filter((match) => matchIsOnDate(match, date));
}

export async function getLocalMatchesForDate(date) {
  return getTodayMatchesLocal(date);
}

export async function resolveMatchFromSchedules(matchId) {
  const schedule = await getLocalSchedule();
  return schedule.find((match) => String(match.id) === String(matchId)) || null;
}
