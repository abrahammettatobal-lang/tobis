import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { safePlay, teardownHls } from '../utils/hlsLifecycle.js';

export default function HLSPlayer({
  url,
  title = 'Stream',
  subtitle = '',
  showLiveBadge = true,
  liveOnly = false,
  className = '',
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const statsTimerRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const liveLockCleanupRef = useRef(null);

  const [error, setError] = useState('');
  const [qualities, setQualities] = useState([]);
  const [qualityIndex, setQualityIndex] = useState(-1);
  const [stats, setStats] = useState({
    bitrate: '—',
    buffer: '—',
    dropped: '0',
    latency: '—',
  });
  const [muted, setMuted] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

  const clearStatsTimer = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
  }, []);

  const destroyPlayer = useCallback(async () => {
    clearStatsTimer();
    liveLockCleanupRef.current?.();
    liveLockCleanupRef.current = null;
    const hls = hlsRef.current;
    hlsRef.current = null;
    await teardownHls(hls, videoRef.current);
  }, [clearStatsTimer]);

  const bindLiveEdgeLock = useCallback((video, hls) => {
    const clamp = () => {
      if (!liveOnly) return;
      const edge = hls.liveSyncPosition;
      if (typeof edge !== 'number' || !Number.isFinite(edge)) return;
      const maxTime = Math.max(0, edge - 2);
      if (video.currentTime > maxTime) {
        video.currentTime = maxTime;
      }
    };

    const onSeeking = () => clamp();
    const onTimeUpdate = () => clamp();

    video.addEventListener('seeking', onSeeking);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [liveOnly]);

  const jumpToLive = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video || !hls) return;
    const edge = hls.liveSyncPosition;
    if (typeof edge === 'number' && Number.isFinite(edge)) {
      video.currentTime = Math.max(0, edge - 2);
      safePlay(video);
    }
  }, []);

  const updateStats = useCallback(() => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video) return;

    const level = hls.levels?.[hls.currentLevel];
    const bitrate = level?.bitrate ? Math.round(level.bitrate / 1000) : '—';
    const buffer = video.buffered.length
      ? (video.buffered.end(video.buffered.length - 1) - video.currentTime).toFixed(1)
      : '—';
    const dropped = video.getVideoPlaybackQuality?.()?.droppedVideoFrames ?? '—';
    const latency = hls.latency ? hls.latency.toFixed(2) : '—';

    setStats({ bitrate, buffer, dropped, latency });
  }, []);

  useEffect(() => {
    if (!url) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    const generation = ++loadGenerationRef.current;
    let cancelled = false;

    async function boot() {
      setError('');
      await destroyPlayer();
      if (cancelled || generation !== loadGenerationRef.current) return;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 10000,
          fragLoadingTimeOut: 20000,
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (generation !== loadGenerationRef.current) return;
          const levels = data.levels.map((lvl, index) => ({
            index,
            label: lvl.height ? `${lvl.height}p` : `Nivel ${index}`,
            bitrate: lvl.bitrate ? Math.round(lvl.bitrate / 1000) : null,
          }));
          setQualities(levels);
          setQualityIndex(-1);
          video.muted = true;
          setMuted(true);
          liveLockCleanupRef.current?.();
          liveLockCleanupRef.current = bindLiveEdgeLock(video, hls);
          if (liveOnly && typeof hls.liveSyncPosition === 'number') {
            video.currentTime = Math.max(0, hls.liveSyncPosition - 2);
          }
          safePlay(video);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (generation !== loadGenerationRef.current || !data.fatal) return;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError(`Error de red: ${data.details} — reintentando...`);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError(`Error de medios: ${data.details} — recuperando...`);
              hls.recoverMediaError();
              break;
            default:
              setError(`Error fatal: ${data.details}`);
              destroyPlayer();
          }
        });

        statsTimerRef.current = setInterval(updateStats, 1000);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        const onMeta = () => {
          video.muted = true;
          setMuted(true);
          safePlay(video);
        };
        video.addEventListener('loadedmetadata', onMeta, { once: true });
        video.src = url;
      } else {
        setError('HLS no es compatible con este navegador.');
      }
    }

    boot();

    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [url, reloadNonce, liveOnly, destroyPlayer, updateStats, bindLiveEdgeLock]);

  function switchQuality(value) {
    const hls = hlsRef.current;
    if (!hls) return;
    const index = parseInt(value, 10);
    hls.currentLevel = index;
    setQualityIndex(index);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function togglePiP() {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  }

  function toggleFullscreen() {
    const wrap = videoRef.current?.parentElement;
    if (!wrap) return;
    if (!document.fullscreenElement) {
      wrap.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function reload() {
    setReloadNonce((n) => n + 1);
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-black ${className}`}>
      <div className="relative bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full bg-black"
          controls
          autoPlay
          muted
          playsInline
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-card px-3 py-2 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {subtitle ? (
            <p className="truncate text-xs text-white/50">{subtitle}</p>
          ) : null}
        </div>
        {showLiveBadge ? (
          <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            En vivo
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/10 bg-card px-3 py-2 sm:px-4">
        {liveOnly ? (
          <button
            type="button"
            onClick={jumpToLive}
            className="rounded-md border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/25"
          >
            Ir al vivo
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleMute}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          {muted ? 'Activar audio' : 'Silenciar'}
        </button>
        <button
          type="button"
          onClick={togglePiP}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          PiP
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          Pantalla completa
        </button>
        {qualities.length > 0 ? (
          <select
            value={qualityIndex}
            onChange={(event) => switchQuality(event.target.value)}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white"
          >
            <option value={-1}>Automático</option>
            {qualities.map((q) => (
              <option key={q.index} value={q.index}>
                {q.label}
                {q.bitrate ? ` (${q.bitrate}kbps)` : ''}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          onClick={reload}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
        >
          Recargar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-card px-3 py-2 text-center sm:grid-cols-4 sm:px-4">
        {[
          ['Velocidad', `${stats.bitrate} kbps`],
          ['Búfer', `${stats.buffer} s`],
          ['Perdidos', stats.dropped],
          ['Latencia', `${stats.latency} s`],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-sm font-semibold text-accent">{value}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="border-t border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300 sm:px-4">
          {error}
        </div>
      ) : null}
    </div>
  );
}
