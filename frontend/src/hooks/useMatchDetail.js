import { useEffect, useState } from 'react';
import { fetchMatchDetail } from '../services/api.js';
import { enrichMatchFromDetail } from '../utils/matchEnrichment.js';

export function useMatchDetail(match) {
  const [detail, setDetail] = useState(null);
  const [enrichedMatch, setEnrichedMatch] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match?.id) {
      setDetail(null);
      setEnrichedMatch(null);
      return undefined;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setDetail(null);
      setMessage('');

      try {
        const payload = await fetchMatchDetail(match.id, match.kickoffDate);
        if (!active) return;

        setDetail(payload.detail || null);
        setMessage(
          payload.message ||
            (payload.detail?.events?.length
              ? 'Seguimiento del partido disponible'
              : 'Datos del partido en preparación')
        );
        const merged = enrichMatchFromDetail(match, payload.detail, payload.match);
        setEnrichedMatch(merged || match);
      } catch {
        if (!active) return;
        setDetail(null);
        setMessage('No se pudo cargar la cronología. Revisa que el backend esté activo.');
        setEnrichedMatch(match);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    const shouldPoll =
      match.status === 'En Vivo' ||
      (match.status === 'Por empezar' &&
        !Number.isNaN(new Date(match.kickoffTime).getTime()) &&
        new Date(match.kickoffTime).getTime() <= Date.now());

    const timer = shouldPoll
      ? setInterval(load, 60000)
      : null;

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [match?.id, match?.status, match?.kickoffDate, match?.kickoffTime]);

  return { detail, enrichedMatch, message, loading };
}
