import { useEffect, useRef, useState } from 'react';
import { fetchMatchDetail } from '../services/api.js';
import { enrichMatchFromDetail } from '../utils/matchEnrichment.js';

export function useDayMatchEnrichment(matches) {
  const [overrides, setOverrides] = useState(() => new Map());
  const runRef = useRef(0);

  useEffect(() => {
    if (!matches?.length) {
      setOverrides(new Map());
      return undefined;
    }

    const runId = ++runRef.current;
    let cancelled = false;

    async function enrichMatch(match) {
      try {
        const payload = await fetchMatchDetail(match.id, match.kickoffDate);
        if (cancelled || runId !== runRef.current) return null;

        const enriched = enrichMatchFromDetail(match, payload.detail, payload.match);
        if (!enriched) return null;

        return [String(match.id), enriched];
      } catch {
        return null;
      }
    }

    async function run() {
      const results = await Promise.all(matches.map((match) => enrichMatch(match)));
      if (cancelled || runId !== runRef.current) return;

      const next = new Map();
      for (const entry of results) {
        if (entry) next.set(entry[0], entry[1]);
      }
      setOverrides(next);
    }

    run();

    const timer = setInterval(run, 90000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [matches]);

  return overrides;
}
