import { resolveMatchScores } from './goalsFromEvents.js';

export function enrichMatchFromDetail(baseMatch, detail, apiMatch) {
  if (!baseMatch) return null;

  let enriched = baseMatch;

  if (apiMatch?.scoreSource === 'api' || apiMatch?.externalApiId) {
    enriched = {
      ...baseMatch,
      ...apiMatch,
      teamA: { ...baseMatch.teamA, ...apiMatch.teamA },
      teamB: { ...baseMatch.teamB, ...apiMatch.teamB },
    };
  }

  const { home: homeScore, away: awayScore } = resolveMatchScores(enriched, detail);

  if (
    homeScore !== enriched.teamA?.goals ||
    awayScore !== enriched.teamB?.goals ||
    detail?.stats?.homeScore != null
  ) {
    return {
      ...enriched,
      teamA: { ...enriched.teamA, goals: homeScore },
      teamB: { ...enriched.teamB, goals: awayScore },
      scoreSource: 'api',
      status: detail?.stats?.matchStatus || enriched.status,
      minute: detail?.stats?.currentMinute || enriched.minute,
      displayStatus: detail?.stats?.displayStatus || enriched.displayStatus,
    };
  }

  return enriched;
}

export function applyMatchOverrides(matches, overrides) {
  if (!overrides?.size) return matches;

  return matches.map((match) => {
    const patch = overrides.get(String(match.id));
    return patch ? { ...match, ...patch } : match;
  });
}
