import { getCacheAgeMs } from '../utils/timezone.js';

const MS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
};

const IMPORTANT_STAGE = /final|semi|semifinal|tercer|third|3rd|cuartos|quarter|knockout/i;

export function isImportantMatch(match) {
  if (match.isImportant) return true;
  return IMPORTANT_STAGE.test(match.stage || '');
}

export function isMatchProbablyLive(match, now = new Date()) {
  if (match.status === 'En Vivo') return true;
  if (match.status === 'Finalizado') return false;
  if (match.inplay) return true;

  const kickoff = new Date(match.kickoffTime).getTime();
  if (Number.isNaN(kickoff)) return false;

  const start = kickoff - 15 * MS.MINUTE;
  const end = kickoff + 165 * MS.MINUTE;
  const nowTs = now.getTime();

  return nowTs >= start && nowTs <= end;
}

export function getMinutesUntilKickoff(match, now = new Date()) {
  const kickoff = new Date(match.kickoffTime).getTime();
  return Math.floor((kickoff - now.getTime()) / MS.MINUTE);
}

export function countLiveMatches(matches) {
  return matches.filter((match) => isMatchProbablyLive(match) || match.status === 'En Vivo').length;
}

export function allMatchesFinished(matches) {
  if (!matches.length) return false;
  return matches.every((match) => match.status === 'Finalizado');
}

export function hasMatchesToday(matches) {
  return matches.length > 0;
}

export function getRecommendedRefreshInterval({
  matches = [],
  lastUpdatedAt = null,
  date,
  budgetExhausted = false,
} = {}) {
  if (budgetExhausted) {
    return 3600;
  }

  if (!hasMatchesToday(matches)) {
    return 24 * 3600;
  }

  const liveCount = countLiveMatches(matches);
  const importantLive = matches.some(
    (match) => (isMatchProbablyLive(match) || match.status === 'En Vivo') && isImportantMatch(match)
  );
  const startingSoon = matches.some((match) => {
    if (match.status === 'Finalizado') return false;
    const mins = getMinutesUntilKickoff(match);
    return mins >= 0 && mins <= 30;
  });

  if (allMatchesFinished(matches)) {
    return 6 * 3600;
  }

  if (importantLive) {
    return 120;
  }

  if (liveCount > 0) {
    return 240;
  }

  if (startingSoon) {
    return 720;
  }

  const cacheAge = getCacheAgeMs(lastUpdatedAt);
  if (cacheAge < 2 * MS.HOUR) {
    return 3 * 3600;
  }

  return 3 * 3600;
}

export function shouldCallApi({
  matches = [],
  lastUpdatedAt = null,
  budget = {},
  date,
} = {}) {
  const remaining = budget.remainingToday ?? 0;
  const used = budget.usedToday ?? 0;
  const limit = budget.limit ?? 100;

  if (used >= limit || remaining <= 0) {
    return { call: false, reason: 'budget_exhausted' };
  }

  if (!hasMatchesToday(matches)) {
    if (!budget.dailyVerificationDone) {
      return { call: true, reason: 'daily_verification' };
    }
    return { call: false, reason: 'no_matches_today' };
  }

  const cacheAge = getCacheAgeMs(lastUpdatedAt);
  const intervalMs = getRecommendedRefreshInterval({
    matches,
    lastUpdatedAt,
    date,
    budgetExhausted: false,
  }) * 1000;

  if (!lastUpdatedAt) {
    return { call: true, reason: 'missing_cache' };
  }

  if (allMatchesFinished(matches)) {
    if (budget.allFinishedConfirmed) {
      return { call: false, reason: 'all_finished_confirmed' };
    }
    if ((budget.finalConfirmationCalls || 0) < 2 && cacheAge >= 10 * MS.MINUTE) {
      return { call: true, reason: 'final_confirmation' };
    }
    return { call: false, reason: 'all_finished_waiting' };
  }

  const usesFlashscore = Boolean(
    process.env.RAPIDAPI_KEY || process.env.FLASHSCORE_RAPIDAPI_KEY
  );
  const liveCount = countLiveMatches(matches);
  const startingSoon = matches.some((match) => {
    if (match.status === 'Finalizado') return false;
    const mins = getMinutesUntilKickoff(match);
    return mins >= 0 && mins <= 30;
  });

  if (usesFlashscore && liveCount > 0 && cacheAge >= MS.MINUTE) {
    return { call: true, reason: 'flashscore_live' };
  }

  if (liveCount > 0 && cacheAge >= intervalMs) {
    return { call: true, reason: 'live_refresh' };
  }

  if (startingSoon && cacheAge >= intervalMs) {
    return { call: true, reason: 'kickoff_soon' };
  }

  if (cacheAge >= intervalMs) {
    return { call: true, reason: 'scheduled_refresh' };
  }

  return { call: false, reason: 'cache_fresh' };
}
