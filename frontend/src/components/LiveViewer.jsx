import { useMemo } from 'react';
import MatchNotStarted from './MatchNotStarted.jsx';
import P2PPlayer from './P2PPlayer.jsx';
import { getMatchPlaybackMode, getPlaybackLabel, isRecentFinishedMatch } from '../utils/matchPlayback.js';

export default function LiveViewer({ match }) {
  const playbackMode = useMemo(
    () => (match ? getMatchPlaybackMode(match) : null),
    [match]
  );

  if (!match) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-card/50 p-6 text-center sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Reproductor</p>
        <h2 className="mt-2 text-lg font-semibold text-white/80">Elige un partido</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
          Toca un partido finalizado para buscar la repetición, o abre el reproductor en vivo.
        </p>
        <a
          href="./en-vivo.html"
          className="touch-target mt-4 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
        >
          Abrir reproductor en vivo
        </a>
      </section>
    );
  }

  const statusBadge =
    playbackMode === 'live'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : playbackMode === 'replay'
        ? 'border-accentBlue/40 bg-accentBlue/10 text-accentBlue'
        : 'border-white/15 bg-white/5 text-white/60';

  const isRecentReplay =
    playbackMode === 'replay' && isRecentFinishedMatch(match);

  const statusHint =
    playbackMode === 'upcoming'
      ? 'Esperando el inicio del encuentro'
      : playbackMode === 'live'
        ? 'Transmisión en el reproductor Tobis — DSports y señales alternativas'
        : 'Buscando repetición del partido...';

  return (
    <section
      id="match-viewer"
      className="rounded-2xl border border-accent/20 bg-card p-3 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-accent sm:text-xs sm:tracking-[0.2em]">
            Ver partido
          </p>
          <h2 className="truncate text-base font-semibold sm:text-lg md:text-xl">
            {match.teamA.name} vs {match.teamB.name}
          </h2>
          <p className="mt-0.5 text-xs text-white/50 sm:mt-1 sm:text-sm">{statusHint}</p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge}`}
        >
          {getPlaybackLabel(playbackMode)}
        </span>
      </div>

      {playbackMode === 'replay' && isRecentReplay ? (
        <div className="mb-4 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-xs leading-relaxed text-sky-100 sm:px-4">
          <p className="font-semibold text-sky-50">Repetición puede no estar disponible aún</p>
          <p className="mt-1">
            Si el partido terminó hace poco, es normal que no aparezca en la búsqueda. Las
            repeticiones suelen tardar horas en publicarse.
          </p>
        </div>
      ) : null}

      {playbackMode === 'upcoming' ? (
        <MatchNotStarted match={match} />
      ) : playbackMode === 'live' ? (
        <div className="rounded-xl border border-accent/25 bg-accent/5 p-5 text-center sm:p-8">
          <p className="text-3xl" aria-hidden="true">
            📡
          </p>
          <h3 className="mt-3 text-lg font-semibold">Partido en vivo</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
            Abre el reproductor Tobis con calendario, tabla, goleadores y 10 señales DSports.
            Cambia de señal si no ves este partido.
          </p>
          <a
            href="./en-vivo.html"
            className="touch-target mt-5 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            Ver transmisión en vivo
          </a>
        </div>
      ) : (
        <P2PPlayer match={match} mode="replay" autoPlay />
      )}
    </section>
  );
}
