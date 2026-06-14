import { resolveMatchScores } from './goalsFromEvents.js';
import { enrichMatchMetadata, normalizeSportsApiProMatch } from './match.js';

function extractApiRaw(apiDetail) {
  if (!apiDetail) return null;
  return apiDetail.raw || apiDetail;
}

export function enrichMatchFromDetail(baseMatch, detail) {
  if (!baseMatch || !detail) return baseMatch;

  let enriched = baseMatch;

  const raw = detail.apiRaw;
  if (raw && detail.source === 'api') {
    const normalized = enrichMatchMetadata(normalizeSportsApiProMatch(raw));
    enriched = {
      ...baseMatch,
      ...normalized,
      scoreSource: 'api',
      teamA: { ...baseMatch.teamA, ...normalized.teamA },
      teamB: { ...baseMatch.teamB, ...normalized.teamB },
    };
  }

  const { home: homeScore, away: awayScore } = resolveMatchScores(enriched, detail);

  if (
    homeScore !== enriched.teamA?.goals ||
    awayScore !== enriched.teamB?.goals ||
    detail.stats?.homeScore != null
  ) {
    return enrichMatchMetadata({
      ...enriched,
      teamA: { ...enriched.teamA, goals: homeScore },
      teamB: { ...enriched.teamB, goals: awayScore },
      scoreSource: 'api',
    });
  }

  return enriched;
}

export { extractApiRaw };
