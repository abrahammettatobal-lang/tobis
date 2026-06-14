import { useMemo, useState } from 'react';

export default function VideoSection({ match }) {
  const [loaded, setLoaded] = useState(false);
  const query = match?.youtubeQuery || 'relato en vivo mundial 2026';
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: '0',
      modestbranding: '1',
      rel: '0',
    });
    return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&${params.toString()}`;
  }, [query]);

  if (!match) {
    return (
      <section className="rounded-2xl border border-white/10 bg-card p-6">
        <h2 className="text-lg font-semibold">Relato en vivo</h2>
        <p className="mt-2 text-sm text-white/60">
          Selecciona un partido para cargar transmisiones de audio/relato desde YouTube.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-card p-6">
      <div className="mb-4 flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-accentBlue">Relato en vivo</p>
        <h2 className="text-lg font-semibold">
          {match.teamA.name} vs {match.teamB.name}
        </h2>
        <p className="text-sm text-white/60">
          Búsqueda automática de relatos oficiales en YouTube (canales deportivos y radios).
        </p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black aspect-video">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
            Cargando reproductor...
          </div>
        )}
        <iframe
          title={`Relato ${match.teamA.name} vs ${match.teamB.name}`}
          src={embedUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </section>
  );
}
