import { useCallback, useEffect, useState } from 'react';
import { fetchLiveStream } from '../services/api.js';
import { getMatchPlaybackMode } from '../utils/matchPlayback.js';

const POLL_MS = 5 * 60 * 1000;

export function useLiveStream(match) {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (!match?.id) {
        setStream(null);
        return;
      }

      const mode = getMatchPlaybackMode(match);
      if (mode !== 'live') {
        setStream(null);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const payload = await fetchLiveStream(match.id, {
          date: match.kickoffDate,
          refresh,
        });
        setStream(payload);
      } catch {
        setError('No se pudo conectar con la transmisión');
        setStream({
          status: 'searching',
          message: 'Sin señal disponible · reintentando',
        });
      } finally {
        setLoading(false);
      }
    },
    [match?.id, match?.kickoffDate, match?.status, match?.kickoffTime]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (!match?.id || getMatchPlaybackMode(match) !== 'live') return undefined;

    const timer = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(timer);
  }, [load, match?.id, match?.status, match?.kickoffTime]);

  return {
    stream,
    loading,
    error,
    refresh: () => load(true),
  };
}
