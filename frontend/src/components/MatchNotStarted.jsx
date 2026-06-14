import { formatDateLabel, formatKickoffTime } from '../services/api.js';

export default function MatchNotStarted({ match }) {
  const kickoffDate = match.kickoffTime?.slice(0, 10);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-carbon">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(0,230,118,0.18), transparent 45%), radial-gradient(circle at 80% 80%, rgba(0,176,255,0.12), transparent 40%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative flex min-h-[260px] flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[320px] sm:px-6 sm:py-12 md:min-h-[380px]">
        <div className="mb-6 flex items-center gap-4 sm:mb-8 sm:gap-10">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-accent/10 p-1 ring-2 ring-accent/30">
              <img
                src={match.teamA.flag}
                alt=""
                className="h-14 w-14 rounded-full border border-white/10 bg-white/5 object-cover sm:h-16 sm:w-16 md:h-20 md:w-20"
              />
            </div>
            <p className="max-w-[5rem] text-xs font-medium text-white/80 sm:max-w-[7rem] sm:text-sm">{match.teamA.name}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/35">
              VS
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-accent/50 to-transparent" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-accentBlue/10 p-1 ring-2 ring-accentBlue/30">
              <img
                src={match.teamB.flag}
                alt=""
                className="h-14 w-14 rounded-full border border-white/10 bg-white/5 object-cover sm:h-16 sm:w-16 md:h-20 md:w-20"
              />
            </div>
            <p className="max-w-[5rem] text-xs font-medium text-white/80 sm:max-w-[7rem] sm:text-sm">{match.teamB.name}</p>
          </div>
        </div>

        <div className="mb-5 space-y-2 sm:mb-6">
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-3xl">
            Este partido todavia no empieza
          </p>
          <p className="mx-auto max-w-sm text-xs text-white/50 sm:text-sm">
            Vuelve cuando empiece para ver la transmision en vivo automaticamente.
          </p>
        </div>

        <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-card/80 px-4 py-3 backdrop-blur-sm sm:max-w-none sm:px-5 sm:py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Inicio programado</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {kickoffDate ? formatDateLabel(kickoffDate) : 'Por confirmar'}
          </p>
          {match.kickoffTime ? (
            <p className="mt-1 text-sm text-white/55">
              {formatKickoffTime(match.kickoffTime)} · CDMX
            </p>
          ) : null}
          {match.venue ? (
            <p className="mt-2 text-xs text-white/40">{match.venue}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
