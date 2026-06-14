const GOAL_TYPES = new Set(['FootballGoal', 'FootballPenaltyGoal']);
const OWN_GOAL_TYPE = 'FootballOwnGoal';

export function countGoalsFromEvents(events = []) {
  let home = 0;
  let away = 0;

  for (const event of events) {
    if (GOAL_TYPES.has(event.type)) {
      if (event.teamSide === 'home') home += 1;
      else if (event.teamSide === 'away') away += 1;
      continue;
    }

    if (event.type === OWN_GOAL_TYPE) {
      if (event.teamSide === 'home') away += 1;
      else if (event.teamSide === 'away') home += 1;
    }
  }

  return { home, away };
}

export function resolveMatchScores(match, detail) {
  const fromMatch = {
    home: match?.teamA?.goals ?? 0,
    away: match?.teamB?.goals ?? 0,
  };
  const fromStats = {
    home: detail?.stats?.homeScore,
    away: detail?.stats?.awayScore,
  };
  const fromEvents = countGoalsFromEvents(detail?.events || []);

  return {
    home: Math.max(fromMatch.home, fromStats.home ?? 0, fromEvents.home),
    away: Math.max(fromMatch.away, fromStats.away ?? 0, fromEvents.away),
  };
}
