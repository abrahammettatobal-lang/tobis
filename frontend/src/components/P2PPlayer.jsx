import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildReplayQuery,
  checkStreamerHealth,
  getReplayStatus,
  getStreamerBaseUrl,
  isLocalStreamerUrl,
  getVideoStreamUrl,
  searchReplaySources,
  startReplayStream,
  stopReplayStream,
} from '../services/streamer.js';

export default function P2PPlayer({ match, mode = 'replay', autoPlay = false }) {
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [error, setError] = useState('');
  const [streamUrl, setStreamUrl] = useState(null);
  const [status, setStatus] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [manualMode, setManualMode] = useState(!autoPlay);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioHint, setAudioHint] = useState('');
  const videoRef = useRef(null);
  const autoRunRef = useRef(0);

  const isLive = mode === 'live';
  const searchLabel = isLive ? 'Buscar en vivo P2P' : 'Buscar repeticion';
  const autoSearchLabel = isLive
    ? 'Buscando señal en vivo (P2P / HDTV)...'
    : 'Buscando repeticion del partido...';

  useEffect(() => {
    setQuery(buildReplayQuery(match));
    setResults([]);
    setStreamUrl(null);
    setStatus(null);
    setError('');
    setPlayingId(null);
    setConnecting(false);
    setManualMode(!autoPlay);
    setAudioBlocked(false);
    setAudioHint('');
    autoRunRef.current += 1;
  }, [match?.id, mode, autoPlay]);

  const enableAudio = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      setAudioBlocked(false);
      setAudioHint('');
    } catch {
      setAudioBlocked(true);
      setAudioHint('Tu navegador bloqueo el audio. Toca Activar audio.');
    }
  }, []);

  useEffect(() => {
    if (!streamUrl) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    function handleLoadedMetadata() {
      if (video.muted || video.volume === 0) {
        setAudioBlocked(true);
      }
    }

    function handleVolumeChange() {
      if (!video.muted && video.volume > 0) {
        setAudioBlocked(false);
        setAudioHint('');
      }
    }

    function handlePlay() {
      if (video.muted) {
        setAudioBlocked(true);
        setAudioHint('El video inicio en silencio por autoplay. Activa el audio.');
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('play', handlePlay);
    };
  }, [streamUrl]);

  useEffect(() => {
    checkStreamerHealth().then(setOnline);
    const timer = setInterval(() => checkStreamerHealth().then(setOnline), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!streamUrl) return undefined;

    const timer = setInterval(async () => {
      try {
        const payload = await getReplayStatus();
        setStatus(payload);
        if (payload.status === 'error') {
          setError(payload.error || 'Error en el stream');
          setConnecting(false);
          setManualMode(true);
        }
        if (payload.status === 'streaming') {
          setConnecting(false);
        }
      } catch {
        /* ignore */
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [streamUrl]);

  const getTorrentRef = useCallback((item) => {
    if (item?.id != null && item.id !== '') return item.id;
    if (item?.meta) return item.meta;
    return null;
  }, []);

  const handlePlay = useCallback(
    async (item) => {
      if (connecting) return;

      const torrentRef = getTorrentRef(item);
      if (!torrentRef) {
        setError('Fuente invalida. Busca de nuevo.');
        setManualMode(true);
        return;
      }

      const resultKey = String(item.id ?? item.title ?? '');

      setConnecting(true);
      setPlayingId(resultKey);
      setError('');
      setStreamUrl(null);

      try {
        await stopReplayStream().catch(() => {});
        const payload = await startReplayStream(torrentRef);
        const videoUrl = getVideoStreamUrl(payload.streamUrl);
        setStreamUrl(videoUrl);
        setSelectedTitle(payload.title || item.title);
      } catch (err) {
        setError(err.message || 'No se pudo iniciar la reproduccion');
        setConnecting(false);
        setPlayingId(null);
        setManualMode(true);
      }
    },
    [connecting, getTorrentRef]
  );

  const performSearch = useCallback(async () => {
    setSearching(true);
    setError('');
    setResults([]);
    setStreamUrl(null);
    setConnecting(false);

    try {
      const payload = await searchReplaySources(query, mode, match);
      const items = payload.results || [];
      setResults(items);
      if (!items.length) {
        setError(
          isLive
            ? 'Sin torrent P2P en vivo. Prueba otra busqueda o usa los canales de YouTube debajo.'
            : 'No hay repeticion P2P todavia. Prueba mas tarde.'
        );
        setManualMode(true);
      }
      return items;
    } catch (err) {
      setError(
        online
          ? err.message || 'No se pudo buscar fuentes P2P. Intenta de nuevo.'
          : 'Servicio P2P offline. Ejecuta: cd streamer && npm start'
      );
      setManualMode(true);
      return [];
    } finally {
      setSearching(false);
    }
  }, [query, mode, isLive, online, match]);

  useEffect(() => {
    if (!autoPlay || !match || !online || manualMode) return undefined;

    const runId = autoRunRef.current;
    let cancelled = false;

    async function playItem(item) {
      const torrentRef = getTorrentRef(item);
      if (!torrentRef) {
        setError('Fuente invalida. Busca de nuevo.');
        setManualMode(true);
        return;
      }

      const resultKey = String(item.id ?? item.title ?? '');
      setConnecting(true);
      setPlayingId(resultKey);
      setError('');
      setStreamUrl(null);

      try {
        await stopReplayStream().catch(() => {});
        const payload = await startReplayStream(torrentRef);
        if (cancelled || runId !== autoRunRef.current) return;
        const videoUrl = getVideoStreamUrl(payload.streamUrl);
        setStreamUrl(videoUrl);
        setSelectedTitle(payload.title || item.title);
      } catch (err) {
        if (cancelled || runId !== autoRunRef.current) return;
        setError(err.message || 'No se pudo iniciar la reproduccion');
        setConnecting(false);
        setPlayingId(null);
        setManualMode(true);
      }
    }

    async function runAutoPlayback() {
      setSearching(true);
      setError('');

      try {
        const payload = await searchReplaySources(buildReplayQuery(match), mode, match);
        if (cancelled || runId !== autoRunRef.current) return;

        const items = payload.results || [];
        setResults(items);

        if (!items.length) {
          setError(
            isLive
              ? 'Sin torrent P2P para este partido en vivo todavia. Reintentando cada 20 s. Usa los canales de YouTube mas abajo mientras tanto.'
              : 'No hay repeticion P2P todavia. Prueba buscar manualmente o usa los canales de abajo.'
          );
          setManualMode(true);
          return;
        }

        await playItem(items[0]);
      } catch (err) {
        if (cancelled || runId !== autoRunRef.current) return;
        setError(
          online
            ? err.message || 'No se pudo conectar a la fuente P2P.'
            : 'Servicio P2P offline. Ejecuta: cd streamer && npm start'
        );
        setManualMode(true);
      } finally {
        if (!cancelled && runId === autoRunRef.current) {
          setSearching(false);
        }
      }
    }

    runAutoPlayback();

    return () => {
      cancelled = true;
    };
  }, [autoPlay, match?.id, mode, online, manualMode, isLive, getTorrentRef]);

  useEffect(() => {
    if (!isLive || !autoPlay || !online || streamUrl || connecting || searching) {
      return undefined;
    }

    const timer = setInterval(() => {
      if (manualMode) return;
      performSearch().then((items) => {
        if (items.length > 0 && !streamUrl && !connecting) {
          handlePlay(items[0]);
        }
      });
    }, 20000);

    return () => clearInterval(timer);
  }, [isLive, autoPlay, online, streamUrl, connecting, searching, performSearch, handlePlay]);

  async function handleSearch(event) {
    event.preventDefault();
    const items = await performSearch();
    if (autoPlay && items.length > 0) {
      await handlePlay(items[0]);
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
    setConnecting(false);
    setPlayingId(null);
    setAudioBlocked(false);
    setAudioHint('');
  }

  if (!match) {
    return (
      <p className="text-sm text-white/50">Selecciona un partido para buscar fuentes P2P.</p>
    );
  }

  const showSearchForm = manualMode || Boolean(error);
  const showAutoLoading = autoPlay && !manualMode && (searching || connecting) && !streamUrl;

  return (
    <div className="space-y-4">
      {!online ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          {isLocalStreamerUrl(getStreamerBaseUrl()) ? (
            <>
              Servicio P2P offline. En PowerShell:
              <code className="mt-1 block rounded bg-black/30 px-2 py-1 text-xs">
                cd streamer; npm start
              </code>
            </>
          ) : (
            <>
              Repeticiones P2P no disponibles en este momento.
              <span className="mt-1 block text-xs text-amber-100/70">
                Los partidos en vivo usan transmision automatica. Para repeticiones, el streamer debe
                estar desplegado (Render/Fly).
              </span>
            </>
          )}
        </div>
      ) : null}

      {showAutoLoading ? (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-8 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          <p className="text-sm font-medium text-white">
            {connecting ? 'Conectando a peers P2P...' : autoSearchLabel}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {connecting ? 'Puede tardar 10-30 segundos' : 'Elegimos la mejor fuente automaticamente'}
          </p>
        </div>
      ) : null}

      {showSearchForm ? (
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Mexico South Africa"
            className="min-h-11 flex-1 rounded-xl border border-white/10 bg-carbon px-4 py-2.5 text-base outline-none ring-accent focus:ring-2 sm:py-2 sm:text-sm"
          />
          <button
            type="submit"
            disabled={searching || connecting || !query.trim()}
            className="touch-target rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent/90 active:scale-[0.98] disabled:opacity-50 sm:py-2"
          >
            {searching ? 'Buscando...' : searchLabel}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {results.length > 0 && !streamUrl && manualMode ? (
        <ul className="max-h-52 space-y-2 overflow-y-auto">
          {results.map((item, index) => {
            const resultKey = String(item.id ?? `${item.title}-${index}`);
            const isActive = playingId === resultKey && connecting;
            return (
              <li key={resultKey}>
                <button
                  type="button"
                  disabled={connecting}
                  onClick={() => handlePlay(item)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition active:scale-[0.99] disabled:opacity-60 sm:py-2 ${
                    isActive
                      ? 'border-accentBlue bg-accentBlue/10'
                      : 'border-white/10 bg-carbon/60 hover:border-accent/40 hover:bg-accent/5'
                  }`}
                >
                  <span className="font-medium text-accent">S:{item.seeds}</span>
                  <span className="mx-2 text-white/30">·</span>
                  <span>{item.title}</span>
                  <span className="mt-1 block text-xs text-white/45">
                    {item.size}
                    {isActive ? ' · Conectando...' : ' · Clic para reproducir'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {streamUrl ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="line-clamp-2 text-sm text-white/70 sm:truncate">{selectedTitle}</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="touch-target rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 active:scale-[0.98] sm:py-1"
              >
                Cambiar fuente
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="touch-target rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 active:scale-[0.98] sm:py-1"
              >
                Detener
              </button>
            </div>
          </div>

          <div className="relative -mx-0.5 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black sm:mx-0">
            <video
              ref={videoRef}
              key={streamUrl}
              src={streamUrl}
              controls
              autoPlay
              muted
              playsInline
              controlsList="nodownload"
              className="h-full w-full bg-black object-contain"
            >
              Tu navegador no soporta reproduccion de video.
            </video>

            {audioBlocked ? (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-4 pt-10">
                <button
                  type="button"
                  onClick={enableAudio}
                  className="touch-target rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black shadow-lg active:scale-[0.98]"
                >
                  Activar audio
                </button>
                {audioHint ? (
                  <p className="text-center text-[11px] text-white/70 sm:text-xs">{audioHint}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {status?.audioMode === 'transcoded' ? (
            <p className="text-[11px] text-white/45 sm:text-xs">
              Audio convertido a AAC para compatibilidad con el navegador.
            </p>
          ) : null}

          {status ? (
            <div className="rounded-xl border border-white/10 bg-carbon/50 px-3 py-2 text-[11px] text-white/60 sm:text-xs">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.round((status.progress || 0) * 100)}%` }}
                />
              </div>
              <p className="leading-relaxed">
                Buffer {Math.round((status.progress || 0) * 100)}% · Peers{' '}
                {status.numPeers || 0} · {((status.downloadSpeed || 0) / 1048576).toFixed(2)} MB/s
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
