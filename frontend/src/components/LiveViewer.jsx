import { useMemo } from 'react';
import MatchNotStarted from './MatchNotStarted.jsx';
import P2PPlayer from './P2PPlayer.jsx';
import YouTubeLivePlayer from './YouTubeLivePlayer.jsx';
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
          Toca cualquier partido de la lista. Tobis buscara transmision en vivo o repeticion segun
          el estado del encuentro.
        </p>
      </section>
    );
  }

  const statusBadge =
    playbackMode === 'live'
      ? 'border-accent/40 bg-accent/10 text-accent'
      : playbackMode === 'replay'
        ? 'border-accentBlue/40 bg-accentBlue/10 text-accentBlue'
        : 'border-white/15 bg-white/5 text-white/60';

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
          <p className="mt-0.5 text-xs text-white/50 sm:mt-1 sm:text-sm">
            {playbackMode === 'upcoming'
              ? 'Esperando el inicio del encuentro'
              : playbackMode === 'live'
                ? 'Buscando transmision en vivo...'
                : 'Buscando repeticion...'}
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge}`}
        >
          {getPlaybackLabel(playbackMode)}
        </span>
      </div>

      {playbackMode === 'upcoming' ? (
        <MatchNotStarted match={match} />
      ) : playbackMode === 'live' ? (
        <YouTubeLivePlayer match={match} />
      ) : (
        <P2PPlayer match={match} mode="replay" autoPlay />
      )}
    </section>
  );
}
