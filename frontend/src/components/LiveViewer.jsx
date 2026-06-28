import { useMemo } from 'react';
import MatchNotStarted from './MatchNotStarted.jsx';
import StreamFrame from './StreamFrame.jsx';
import { getMatchPlaybackMode, getPlaybackLabel } from '../utils/matchPlayback.js';

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
          Toca un partido en vivo o mira la señal DSports abajo.
        </p>
        <StreamFrame className="mx-auto mt-5 max-w-3xl text-left" />
      </section>
    );
  }

  const statusBadge =
    playbackMode === 'live'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : 'border-white/15 bg-white/5 text-white/60';

  const statusHint =
    playbackMode === 'upcoming'
      ? 'Esperando el inicio del encuentro'
      : playbackMode === 'live'
        ? 'Señal DSports con bloqueo de anuncios — cambia de señal si no ves este partido'
        : 'Partido finalizado · sin repetición, pero puedes ver la señal en vivo';

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

      {playbackMode === 'finished' ? (
        <div className="mb-3 flex items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2">
          <span className="text-2xl font-bold tabular-nums text-white">
            {match.teamA?.goals ?? '–'} – {match.teamB?.goals ?? '–'}
          </span>
          <span className="text-xs text-white/45">Marcador final</span>
        </div>
      ) : null}

      {playbackMode === 'upcoming' ? (
        <MatchNotStarted match={match} />
      ) : (
        <>
          {playbackMode === 'finished' ? (
            <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
              No hay repetición de este partido. La señal de abajo es transmisión en vivo de
              DSports — cambia de opción si ves otro encuentro.
            </p>
          ) : null}
          <StreamFrame />
        </>
      )}
    </section>
  );
}
