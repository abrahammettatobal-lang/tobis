import MatchTimeline from './MatchTimeline.jsx';
import PitchLineup from './PitchLineup.jsx';

export default function MatchDetailPanel({ match, detail, loading, message }) {
  if (!match) {
    return (
      <section className="rounded-2xl border border-white/10 bg-card p-6">
        <h2 className="text-lg font-semibold">Seguimiento del partido</h2>
        <p className="mt-2 text-sm text-white/60">
          Selecciona un partido para ver cronología, tarjetas y alineación.
        </p>
      </section>
    );
  }

  const stats = detail?.stats;

  return (
    <section className="rounded-2xl border border-white/10 bg-card p-3 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-accentBlue sm:text-xs sm:tracking-[0.2em]">
            Seguimiento en vivo
          </p>
          <h2 className="truncate text-base font-semibold sm:text-lg">
            {match.teamA.name} vs {match.teamB.name}
          </h2>
          <p className="text-xs text-white/60 sm:text-sm">{message}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">
              {match.teamA.abbr} {match.teamA.goals}
              <span className="mx-2 text-white/30">-</span>
              {match.teamB.goals} {match.teamB.abbr}
            </p>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/70">
              {match.displayStatus || match.status}
            </span>
          </div>

          {stats ? (
            <div className="flex flex-wrap gap-2 text-[11px] text-white/60 sm:justify-end sm:gap-3 sm:text-xs">
            {stats.currentMinute ? (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent sm:px-3">
                {stats.currentMinute}
              </span>
            ) : null}
            {stats.referee ? (
              <span className="max-w-full truncate">Arbitro: {stats.referee}</span>
            ) : null}
            <span>
              {match.teamA.abbr} {stats.homeRedCards}
            </span>
            <span>
              {match.teamB.abbr} {stats.awayRedCards}
            </span>
            </div>
          ) : null}
        </div>
      </div>

      {loading && !detail ? (
        <p className="mb-4 text-sm text-white/50">Cargando detalle del partido...</p>
      ) : null}

      <div className="mb-8">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
          Cronología
        </h3>
        <MatchTimeline
          events={detail?.events || []}
          homeTeam={match.teamA.name}
          awayTeam={match.teamB.name}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
          Alineación en cancha
        </h3>
        <PitchLineup
          lineup={detail?.lineup}
          homeTeam={match.teamA.name}
          awayTeam={match.teamB.name}
        />
      </div>
    </section>
  );
}
