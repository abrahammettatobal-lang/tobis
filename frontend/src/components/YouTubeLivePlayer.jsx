import { useState } from 'react';
import { useLiveStream } from '../hooks/useLiveStream.js';

export default function YouTubeLivePlayer({ match }) {
  const { stream, loading, error, refresh } = useLiveStream(match);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const isReady = stream?.status === 'ready' && stream?.embedUrl;
  const isSearching = loading || stream?.status === 'searching' || !isReady;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black aspect-video">
        {isSearching && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 px-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm text-white/70">
              {loading
                ? 'Buscando transmisión en vivo...'
                : stream?.message || 'Sin señal disponible · reintentando'}
            </p>
            {error ? <p className="text-xs text-red-300/80">{error}</p> : null}
          </div>
        )}

        {stream?.status === 'unavailable' && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm text-white/60">
              {stream?.message || 'Transmisión en vivo no disponible'}
            </p>
          </div>
        )}

        {isReady ? (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                Conectando señal...
              </div>
            )}
            <iframe
              title={`Transmisión ${match.teamA.name} vs ${match.teamB.name}`}
              src={stream.embedUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/45">
          {isReady
            ? stream.title || 'Transmisión en vivo conectada'
            : 'La señal se actualiza automáticamente cada pocos minutos'}
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="touch-target rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          Actualizar señal
        </button>
      </div>
    </div>
  );
}
