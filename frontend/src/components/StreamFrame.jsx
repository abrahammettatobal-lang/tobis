import { useEffect, useId, useRef, useState } from 'react';
import {
  GAD_DEFAULT_STREAM,
  GAD_STREAM_OPTIONS,
  STREAM_IFRAME_ALLOW,
} from '../data/gadStreams.js';

function getStreamGuard() {
  return typeof window !== 'undefined' ? window.TobisStreamGuard : null;
}

export default function StreamFrame({ className = '' }) {
  const iframeRef = useRef(null);
  const cageRef = useRef(null);
  const [activeUrl, setActiveUrl] = useState(GAD_DEFAULT_STREAM);
  const hintId = useId();

  useEffect(() => {
    getStreamGuard()?.installPageGuard?.();
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    const guard = getStreamGuard();
    if (!iframe || !guard) return;

    guard.installStreamFrame(iframe);
    guard.setStreamSrc(iframe, activeUrl);
  }, [activeUrl]);

  function switchSignal(url) {
    setActiveUrl(url);
  }

  return (
    <div className={className}>
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <div ref={cageRef} className="stream-cage stream-cage--crop-ads absolute inset-0">
          <iframe
            ref={iframeRef}
            id="tobis-live-player"
            title="Transmisión DSports"
            className="stream-cage__iframe"
            allow={STREAM_IFRAME_ALLOW}
            allowFullScreen
          />
        </div>
      </div>

      <p id={hintId} className="mt-2 text-center text-xs text-white/50">
        Toca el reproductor para iniciar · se bloquea solo tras unos segundos para evitar anuncios
      </p>

      <div
        className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="listbox"
        aria-label="Opciones de señal"
      >
        {GAD_STREAM_OPTIONS.map((option) => {
          const active = option.url === activeUrl;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => switchSignal(option.url)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition touch-target tap-highlight-none ${
                active
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <a
        href="./en-vivo.html"
        className="mt-3 block text-center text-xs font-medium text-accent/90 hover:text-accent"
      >
        Abrir reproductor completo →
      </a>
    </div>
  );
}
