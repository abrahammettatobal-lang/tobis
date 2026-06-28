import { useId } from 'react';

export default function StreamFrame({ className = '' }) {
  const hintId = useId();

  return (
    <div className={className}>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black"
        style={{ paddingTop: '56.25%' }}
      >
        <iframe
          id="tobis-live-player-shell"
          title="Transmisión DSports Tobis"
          className="absolute inset-0 h-full w-full border-0"
          src="./en-vivo.html?embedded=1"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>

      <p id={hintId} className="mt-2 text-center text-xs text-white/50">
        El reproductor usa la misma página en vivo con bloqueos y selector de señales.
      </p>

      <a
        href="./en-vivo.html"
        className="mt-3 block text-center text-xs font-medium text-accent/90 hover:text-accent"
      >
        Abrir reproductor completo →
      </a>
    </div>
  );
}
