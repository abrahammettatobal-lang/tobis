import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWorldCupToday } from '../services/api.js';
import { filterMatchesByCalendarDate, groupMatchesByDate } from '../utils/matchCalendar.js';

const DEFAULT_POLL_MS = 60000;
const MIN_POLL_MS = 30000;

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
      const payload = await fetchWorldCupToday(date);
      const schedule = payload.allMatches?.length
        ? payload.allMatches
        : payload.matches || [];

      setAllMatches(schedule);
      setMeta({
        lastUpdated: payload.lastUpdatedAt,
        source: payload.source,
        usingFallback: Boolean(payload.usingFallback),
        apiBudget: payload.apiBudget,
        recommendedRefreshSeconds: payload.recommendedRefreshSeconds,
        message: payload.message,
        budgetExhausted: payload.budgetExhausted,
        totalInSchedule: payload.totalInSchedule || schedule.length,
      });

      const nextPoll = Math.max(
        MIN_POLL_MS,
        (payload.recommendedRefreshSeconds || 60) * 1000
      );
      pollMsRef.current = nextPoll;
    } catch {
      /* fetchWorldCupToday already falls back to static schedule */
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
