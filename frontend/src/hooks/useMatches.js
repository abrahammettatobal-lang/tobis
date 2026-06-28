import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchOpenfootballSchedule } from '../services/openfootball.js';
import { fetchWorldCupToday } from '../services/api.js';
import { filterMatchesByCalendarDate, groupMatchesByDate } from '../utils/matchCalendar.js';
import { resolveMatchStatus } from '../utils/matchPlayback.js';

const DEFAULT_POLL_MS = 180_000;
const MIN_POLL_MS = 60_000;

export function useMatches({ date }) {
  const [allMatches, setAllMatches] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const pollMsRef = useRef(DEFAULT_POLL_MS);

  const matches = useMemo(
    () => filterMatchesByCalendarDate(allMatches, date),
    [allMatches, date]
  );

  const scheduleDays = useMemo(() => groupMatchesByDate(allMatches), [allMatches]);

  const load = useCallback(async () => {
    try {
      await fetchOpenfootballSchedule();
      const payload = await fetchWorldCupToday(date);
      const schedule = payload.allMatches?.length
        ? payload.allMatches
        : payload.matches || [];

      setAllMatches(schedule);
      setMeta({
        lastUpdated: payload.lastUpdatedAt,
        source: payload.source,
        recommendedRefreshSeconds: payload.recommendedRefreshSeconds,
        message: payload.message,
        totalInSchedule: payload.totalInSchedule || schedule.length,
      });

      pollMsRef.current = Math.max(
        MIN_POLL_MS,
        (payload.recommendedRefreshSeconds || 180) * 1000
      );
    } catch {
      /* fetchWorldCupToday falls back to static schedule */
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await load();
        schedule();
      }, pollMsRef.current);
    };

    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  return { matches, allMatches, scheduleDays, meta, loading, error: null, reload: load };
}

export function matchCounts(dayMatches) {
  return {
    all: dayMatches.length,
    'En Vivo': dayMatches.filter((match) => resolveMatchStatus(match) === 'En Vivo').length,
    Finalizado: dayMatches.filter((match) => resolveMatchStatus(match) === 'Finalizado').length,
  };
}
