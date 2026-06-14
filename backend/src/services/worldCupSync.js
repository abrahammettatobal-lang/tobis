import { fetchWorldCupFlashscoreMatches } from '../providers/flashscoreRapidApi.js';
import { fetchWorldCupMatches } from '../providers/sportsApiPro.js';
import {
  computeFlashscoreDayOffset,
  normalizeFlashscoreMatch,
} from '../utils/flashscore.js';
import {
  getDailyApiBudget,
  incrementDailyApiUsage,
  incrementFinalConfirmation,
  markDailyVerificationDone,
  markSuccessfulApiUpdate,
  resetDailyApiBudgetIfNeeded,
  resetFinishedConfirmation,
} from './apiBudget.js';
import { ensureLocalScheduleFresh, getTodayMatchesLocal, getLocalSchedule, getPdfSchedule, getScraperEnrichment } from './localSchedule.js';
import { getCachedMatches, saveCachedMatches, getAllCachedMatches } from './matchCache.js';
import { mergeScheduleLayers, mergeTodaySchedule } from './scheduleMerge.js';
import {
  getRecommendedRefreshInterval,
  shouldCallApi,
} from './refreshPolicy.js';
import {
  enrichMatchMetadata,
  normalizeSportsApiProMatch,
} from '../utils/match.js';
import { formatUpdatedMessage, getTodayInTimezone } from '../utils/timezone.js';

let updateLock = false;
let lastInternalError = null;

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY || process.env.FLASHSCORE_RAPIDAPI_KEY;
}

function getApiKey() {
  return (
    getRapidApiKey() ||
    process.env.SPORTSAPI_KEY ||
    process.env.SPORTSAPIPRO_KEY ||
    process.env.APISPORTS_KEY
  );
}

function buildApiBudgetResponse(budget) {
  return {
    limit: budget.limit,
    usedToday: budget.usedToday,
    remainingToday: budget.remainingToday,
  };
}

function buildResponse({
  matches,
  allMatches,
  source,
  budget,
  lastUpdatedAt,
  recommendedRefreshSeconds,
  message,
  budgetExhausted = false,
}) {
  return {
    matches,
    allMatches: allMatches || matches,
    lastUpdatedAt,
    source,
    apiBudget: buildApiBudgetResponse(budget),
    recommendedRefreshSeconds,
    message,
    budgetExhausted,
    internalError: lastInternalError,
  };
}

async function getMergedAllMatches() {
  const [pdfSchedule, enrichments, diskSnapshot] = await Promise.all([
    getPdfSchedule(),
    getScraperEnrichment(),
    getAllCachedMatches(),
  ]);
  return mergeScheduleLayers(pdfSchedule, enrichments, diskSnapshot.matches).map(
    enrichMatchMetadata
  );
}

async function buildAllMatches(date, workingSet) {
  const merged = await getMergedAllMatches();
  const combined = mergeScheduleLayers(merged, [], workingSet);
  const unique = combined.filter(
    (match, index, list) => list.findIndex((item) => item.id === match.id) === index
  );

  if (unique.length >= 72) return unique;

  const pdfSchedule = await getPdfSchedule();
  const pdfMerged = mergeScheduleLayers(pdfSchedule, await getScraperEnrichment(), workingSet);
  return pdfMerged.filter(
    (match, index, list) => list.findIndex((item) => item.id === match.id) === index
  );
}
async function callFlashscoreApi(date, apiKey, includeFullList = false) {
  const today = getTodayInTimezone();
  const offsets = new Set([computeFlashscoreDayOffset(date, today)]);

  if (includeFullList) {
    for (let offset = -1; offset <= 1; offset += 1) {
      offsets.add(offset);
    }
  }

  const batches = await Promise.all(
    [...offsets].map((offset) =>
      fetchWorldCupFlashscoreMatches(apiKey, offset).catch(() => [])
    )
  );

  const unique = new Map();

  for (const entry of batches.flat()) {
    const normalized = normalizeFlashscoreMatch(entry.match, entry.tournament);
    unique.set(normalized.flashscoreId, normalized);
  }

  return [...unique.values()].map(enrichMatchMetadata);
}

async function callExternalApi(date, apiKey, includeFullList = false) {
  if (getRapidApiKey()) {
    return callFlashscoreApi(date, apiKey, includeFullList);
  }

  const requests = [fetchWorldCupMatches(apiKey, date)];
  if (includeFullList) {
    requests.push(fetchWorldCupMatches(apiKey).catch(() => ({ matches: [] })));
  }

  const responses = await Promise.all(requests);
  const combined = responses.flatMap((payload) => payload.matches || []);
  const unique = new Map();

  for (const match of combined) {
    unique.set(String(match.id || match.matchId), match);
  }

  return [...unique.values()].map(normalizeSportsApiProMatch).map(enrichMatchMetadata);
}

export async function updateWorldCupData(date = getTodayInTimezone(), locale = 'en') {
  await resetDailyApiBudgetIfNeeded();
  await ensureLocalScheduleFresh(locale);

  const budget = await getDailyApiBudget();
  const pdfToday = await getTodayMatchesLocal(date);
  const cached = await getCachedMatches(date);

  let workingSet = mergeTodaySchedule(
    await getPdfSchedule(),
    await getScraperEnrichment(),
    cached.matches,
    date
  ).map(enrichMatchMetadata);

  if (workingSet.some((match) => match.status !== 'Finalizado')) {
    await resetFinishedConfirmation();
  }

  const budgetExhausted = budget.remainingToday <= 0;
  const recommendedRefreshSeconds = getRecommendedRefreshInterval({
    matches: workingSet,
    lastUpdatedAt: cached.lastUpdatedAt,
    date,
    budgetExhausted,
  });

  const decision = shouldCallApi({
    matches: workingSet,
    lastUpdatedAt: cached.lastUpdatedAt,
    budget,
    date,
  });

  const baseMessage = formatUpdatedMessage(cached.lastUpdatedAt);

  if (!decision.call) {
    const allMatches = await buildAllMatches(date, workingSet);

    if (budgetExhausted && cached.lastUpdatedAt) {
      return buildResponse({
        matches: workingSet,
        allMatches,
        source: 'cache',
        budget,
        lastUpdatedAt: cached.lastUpdatedAt,
        recommendedRefreshSeconds,
        message: 'Mostrando la última actualización disponible',
        budgetExhausted: true,
      });
    }

    return buildResponse({
      matches: workingSet,
      allMatches,
      source: cached.lastUpdatedAt ? 'cache' : 'local',
      budget,
      lastUpdatedAt: cached.lastUpdatedAt,
      recommendedRefreshSeconds,
      message: baseMessage,
      budgetExhausted,
    });
  }

  if (updateLock) {
    const allMatches = await buildAllMatches(date, workingSet);
    return buildResponse({
      matches: workingSet,
      allMatches,
      source: cached.lastUpdatedAt ? 'cache' : 'local',
      budget,
      lastUpdatedAt: cached.lastUpdatedAt,
      recommendedRefreshSeconds,
      message: baseMessage,
      budgetExhausted,
    });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const allMatches = await buildAllMatches(date, workingSet);
    return buildResponse({
      matches: workingSet,
      allMatches,
      source: 'local',
      budget,
      lastUpdatedAt: cached.lastUpdatedAt,
      recommendedRefreshSeconds,
      message: baseMessage,
    });
  }

  updateLock = true;
  lastInternalError = null;
  const includeFullList = decision.reason === 'daily_verification';

  try {
    if (includeFullList) {
      await incrementDailyApiUsage();
    }
    await incrementDailyApiUsage();
    const apiMatches = await callExternalApi(date, apiKey, includeFullList);
    workingSet = mergeTodaySchedule(
      await getPdfSchedule(),
      await getScraperEnrichment(),
      apiMatches,
      date
    ).map(enrichMatchMetadata);

    const stamp = new Date().toISOString();
    await saveCachedMatches(date, {
      matches: workingSet,
      source: 'api',
      lastUpdatedAt: stamp,
    });
    await markSuccessfulApiUpdate();

    if (decision.reason === 'daily_verification') {
      await markDailyVerificationDone();
    }

    if (decision.reason === 'final_confirmation') {
      await incrementFinalConfirmation();
    }

    const freshBudget = await getDailyApiBudget();
    const allMatches = await buildAllMatches(date, apiMatches);

    return buildResponse({
      matches: workingSet,
      allMatches,
      source: 'api',
      budget: freshBudget,
      lastUpdatedAt: stamp,
      recommendedRefreshSeconds: getRecommendedRefreshInterval({
        matches: workingSet,
        lastUpdatedAt: stamp,
        date,
        budgetExhausted: freshBudget.remainingToday <= 0,
      }),
      message: formatUpdatedMessage(stamp),
      budgetExhausted: freshBudget.remainingToday <= 0,
    });
  } catch (error) {
    lastInternalError = error.message;
    console.warn(`[world-cup-sync] ${error.message}`);

    const allMatches = await buildAllMatches(date, workingSet);
    return buildResponse({
      matches: workingSet,
      allMatches,
      source: cached.lastUpdatedAt ? 'cache' : 'local',
      budget: await getDailyApiBudget(),
      lastUpdatedAt: cached.lastUpdatedAt,
      recommendedRefreshSeconds,
      message: cached.lastUpdatedAt
        ? 'Mostrando la última actualización disponible'
        : baseMessage,
      budgetExhausted,
    });
  } finally {
    updateLock = false;
  }
}

export async function syncInMemoryCache(refreshFn) {
  return refreshFn();
}
