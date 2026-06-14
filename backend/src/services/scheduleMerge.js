import { enrichMatchMetadata, fixtureKey, teamPairKey } from '../utils/match.js';
import { teamNameToSpanish, teamNameToEnglish } from '../utils/teamNamesEs.js';
import { matchIsOnDate } from '../utils/timezone.js';

function extractUrlEventId(url = '') {
  const match = String(url).match(/\/(\d+)\/?$/);
  return match ? match[1] : null;
}

function pickBestLiveScoreUrl(base, enrichment) {
  const sportsDbId = String(enrichment.theSportsDbId || enrichment.id || '');
  const candidates = [
    enrichment.livescoreUrl,
    enrichment.liveScoreUrl,
    base.livescoreUrl,
  ].filter(Boolean);

  for (const url of candidates) {
    const urlId = extractUrlEventId(url);
    if (urlId && urlId !== sportsDbId) return url;
  }

  return candidates[0] || base.livescoreUrl;
}

function pickLiveFields(source) {
  const sourceId = source.id ? String(source.id) : '';
  const looksLikeSportsDb = /^\d{6,8}$/.test(sourceId);

  return {
    minute: source.minute,
    status: source.status,
    teamA: {
      goals: source.teamA?.goals ?? 0,
      flag: source.teamA?.flag,
      badgeUrl: source.teamA?.badgeUrl,
    },
    teamB: {
      goals: source.teamB?.goals ?? 0,
      flag: source.teamB?.flag,
      badgeUrl: source.teamB?.badgeUrl,
    },
    venue: source.venue || undefined,
    livescoreUrl: source.livescoreUrl || undefined,
    externalApiId: source.externalApiId || undefined,
    flashscoreId: source.flashscoreId || source.externalApiId || undefined,
    theSportsDbId: source.theSportsDbId || (looksLikeSportsDb ? sourceId : undefined),
    displayStatus: source.displayStatus,
  };
}

function mergeEnrichment(base, enrichment) {
  const merged = {
    ...base,
    livescoreUrl: pickBestLiveScoreUrl(base, enrichment),
    theSportsDbId: enrichment.theSportsDbId || enrichment.id || base.theSportsDbId,
    venue: enrichment.venue || base.venue,
    teamA: {
      ...base.teamA,
      flag: enrichment.teamA?.badgeUrl || enrichment.teamA?.flag || base.teamA.flag,
      badgeUrl: enrichment.teamA?.badgeUrl || enrichment.teamA?.flag || base.teamA.badgeUrl,
    },
    teamB: {
      ...base.teamB,
      flag: enrichment.teamB?.badgeUrl || enrichment.teamB?.flag || base.teamB.flag,
      badgeUrl: enrichment.teamB?.badgeUrl || enrichment.teamB?.flag || base.teamB.badgeUrl,
    },
  };

  const enrichmentHasScore =
    enrichment.status !== 'Por empezar' ||
    (enrichment.teamA?.goals ?? 0) > 0 ||
    (enrichment.teamB?.goals ?? 0) > 0;

  if (enrichmentHasScore) {
    return overlayLiveData(merged, enrichment);
  }

  return enrichMatchMetadata(merged);
}

function overlayLiveData(base, live) {
  const liveFields = pickLiveFields(live);
  const hasLiveScore =
    live.status !== 'Por empezar' ||
    (live.teamA?.goals ?? 0) > 0 ||
    (live.teamB?.goals ?? 0) > 0;

  return enrichMatchMetadata({
    ...base,
    ...liveFields,
    id: base.id,
    livescoreUrl: pickBestLiveScoreUrl(base, live),
    teamA: {
      ...base.teamA,
      goals: hasLiveScore ? liveFields.teamA.goals : base.teamA.goals,
      flag: liveFields.teamA.flag || base.teamA.flag,
      badgeUrl: liveFields.teamA.badgeUrl || base.teamA.badgeUrl,
    },
    teamB: {
      ...base.teamB,
      goals: hasLiveScore ? liveFields.teamB.goals : base.teamB.goals,
      flag: liveFields.teamB.flag || base.teamB.flag,
      badgeUrl: liveFields.teamB.badgeUrl || base.teamB.badgeUrl,
    },
    stage: base.stage || live.stage,
    externalApiId: liveFields.externalApiId || base.externalApiId,
    flashscoreId: liveFields.flashscoreId || base.flashscoreId,
    theSportsDbId: liveFields.theSportsDbId || base.theSportsDbId,
  });
}

function localizeApiMatch(match) {
  return enrichMatchMetadata({
    ...match,
    teamA: {
      ...match.teamA,
      name: teamNameToSpanish(match.teamA.name),
      nameEn: match.teamA.nameEn || teamNameToEnglish(match.teamA.name),
    },
    teamB: {
      ...match.teamB,
      name: teamNameToSpanish(match.teamB.name),
      nameEn: match.teamB.nameEn || teamNameToEnglish(match.teamB.name),
    },
  });
}

function findPdfMatchByTeams(map, match) {
  const pair = teamPairKey(match);
  for (const pdfMatch of map.values()) {
    if (teamPairKey(pdfMatch) === pair) return pdfMatch;
  }
  return null;
}

function appendOrphanSources(map, sources = []) {
  for (const source of sources) {
    const localized = localizeApiMatch(source);
    if (findPdfMatchByTeams(map, localized)) continue;

    const dateKey = fixtureKey(localized);
    if (!map.has(dateKey)) {
      map.set(dateKey, localized);
    }
  }
}

function applyToPdfMatch(map, match, mergeFn) {
  const dateKey = fixtureKey(match);
  if (map.has(dateKey)) {
    map.set(dateKey, mergeFn(map.get(dateKey), match));
    return;
  }

  const byTeams = findPdfMatchByTeams(map, match);
  if (byTeams) {
    map.set(fixtureKey(byTeams), mergeFn(byTeams, match));
  }
}

export function mergeScheduleLayers(pdfBase = [], enrichments = [], liveData = []) {
  const map = new Map(pdfBase.map((match) => [fixtureKey(match), { ...match }]));

  for (const enrichment of enrichments) {
    applyToPdfMatch(map, localizeApiMatch(enrichment), mergeEnrichment);
  }

  for (const live of liveData) {
    const localized = localizeApiMatch(live);
    const dateKey = fixtureKey(localized);

    if (map.has(dateKey)) {
      map.set(dateKey, overlayLiveData(map.get(dateKey), localized));
      continue;
    }

    const byTeams = findPdfMatchByTeams(map, localized);
    if (byTeams) {
      if (byTeams.kickoffDate === localized.kickoffDate) {
        map.set(fixtureKey(byTeams), overlayLiveData(byTeams, localized));
      }
      continue;
    }

    map.set(dateKey, localized);
  }

  appendOrphanSources(map, enrichments);

  return [...map.values()].sort(
    (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
  );
}

export function mergeTodaySchedule(pdfAll, enrichments, liveData, date) {
  const merged = mergeScheduleLayers(pdfAll, enrichments, liveData);
  return merged.filter((match) => matchIsOnDate(match, date));
}
