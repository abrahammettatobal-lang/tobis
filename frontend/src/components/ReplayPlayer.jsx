import { useEffect, useState } from 'react';
import {
  buildReplayQuery,
  checkStreamerHealth,
  getReplayStatus,
  searchReplaySources,
  startReplayStream,
  stopReplayStream,
} from '../services/streamer.js';

export default function ReplayPlayer({ match }) {
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamUrl, setStreamUrl] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');

  useEffect(() => {
    setQuery(buildReplayQuery(match));
    setResults([]);
    setStreamUrl(null);
    setStatus(null);
    setError('');
  }, [match?.id]);

  useEffect(() => {
    checkStreamerHealth().then(setOnline);
  }, []);

  useEffect(() => {
    if (!streamUrl) return undefined;

    const timer = setInterval(async () => {
      try {
        const payload = await getReplayStatus();
        setStatus(payload);
        if (payload.status === 'error') {
          setError(payload.error || 'Error en el stream');
        }
      } catch {
        /* ignore polling errors */
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [streamUrl]);

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    setStreamUrl(null);

    try {
      const payload = await searchReplaySources(query);
      setResults(payload.results || []);
      if (!payload.results?.length) {
        setError('No hay fuentes P2P para esta busqueda. Prueba otro nombre o espera un poco.');
      }
    } catch {
      setError('No se pudo conectar al servicio de repeticion. Ejecuta streamer/setup.ps1');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlay(item) {
    setLoading(true);
    setError('');
    try {
      const payload = await startReplayStream(item.meta);
      setStreamUrl(payload.streamUrl);
      setSelectedTitle(payload.title || item.title);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la reproduccion');
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    try {
      await stopReplayStream();
    } catch {
      /* ignore */
    }
    setStreamUrl(null);
    setStatus(null);
    setSelectedTitle('');
  }

  if (!match) {
    return (
      <p className="text-sm text-white/50">
        Selecciona un partido para buscar repeticion P2P.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!online ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Servicio P2P offline. En PowerShell ejecuta:
          <code className="mt-1 block rounded bg-black/30 px-2 py-1 text-xs">
            cd streamer; .\setup.ps1; npm start
          </code>
        </div>
      ) : null}

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ej: Mexico South Africa"
          className="flex-1 rounded-xl border border-white/10 bg-carbon px-4 py-2 text-sm outline-none ring-accent focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Buscar repeticion'}
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {results.length > 0 && !streamUrl ? (
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {results.map((item) => (
            <li key={`${item.title}-${item.seeds}`}>
              <button
                type="button"
                onClick={() => handlePlay(item)}
                className="w-full rounded-xl border border-white/10 bg-carbon/60 px-3 py-2 text-left text-sm transition hover:border-accent/40 hover:bg-accent/5"
              >
                <span className="font-medium text-accent">S:{item.seeds}</span>
                <span className="mx-2 text-white/30">·</span>
                <span>{item.title}</span>
                <span className="mt-1 block text-xs text-white/45">{item.size}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {streamUrl ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white/70 truncate">{selectedTitle}</p>
            <button
              type="button"
              onClick={handleStop}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/30"
            >
              Detener
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-black aspect-video">
            <video
              key={streamUrl}
              src={streamUrl}
              controls
              autoPlay
              className="h-full w-full bg-black"
            >
              Tu navegador no soporta reproduccion de video.
            </video>
          </div>

          {status ? (
            <div className="rounded-xl border border-white/10 bg-carbon/50 px-3 py-2 text-xs text-white/60">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.round((status.progress || 0) * 100)}%` }}
                />
              </div>
              Buffer: {Math.round((status.progress || 0) * 100)}% · Peers:{' '}
              {status.numPeers || 0} ·{' '}
              {((status.downloadSpeed || 0) / 1048576).toFixed(2)} MB/s
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
