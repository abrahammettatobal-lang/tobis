import { formatKickoffTime } from '../services/api.js';
import { resolveMatchStatus } from '../utils/matchPlayback.js';

function TeamBadge({ team }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center sm:gap-2">
      <img
        src={team.flag}
        alt={`Escudo ${team.name}`}
        className="h-10 w-10 rounded-full border border-white/10 bg-white/5 object-cover sm:h-12 sm:w-12"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = 'https://flagcdn.com/w80/un.png';
        }}
      />
      <p className="max-w-[5.5rem] truncate text-xs font-medium sm:max-w-[8rem] sm:text-sm">
        {team.name}
      </p>
      <p className="hidden text-xs uppercase tracking-wide text-white/40 sm:block">{team.abbr}</p>
    </div>
  );
}

export default function ScoreCard({
  match,
  highlighted = false,
  onSelect,
  children,
}) {
  const resolvedStatus = resolveMatchStatus(match);
  const isLive = resolvedStatus === 'En Vivo';
  const isFinished = resolvedStatus === 'Finalizado';
  const statusLabel = match.displayStatus || resolvedStatus || match.status;

  return (
    <article
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={`tap-highlight-none rounded-2xl border bg-card p-4 transition active:scale-[0.99] sm:p-5 ${
        onSelect ? 'cursor-pointer hover:border-white/20' : ''
      } ${
        isLive
          ? 'border-accent/60 shadow-[0_0_24px_rgba(0,230,118,0.12)]'
          : 'border-white/10'
      } ${highlighted ? 'ring-2 ring-accent/40 animate-goalFlash' : ''}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-white/50 sm:mb-4 sm:gap-3 sm:text-xs">
        <span className="min-w-0 truncate pr-2">{match.stage}</span>
        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-accent sm:gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="hidden sm:inline">{statusLabel.toUpperCase()}</span>
            <span className="sm:hidden">VIVO</span>
          </span>
        ) : (
          <span className="shrink-0">{statusLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <TeamBadge team={match.teamA} />

        <div className="min-w-[4.5rem] text-center">
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {match.teamA.goals}
            <span className="mx-1 text-white/30 sm:mx-2">-</span>
            {match.teamB.goals}
          </p>
          {isLive && (
            <p className="live-minute mt-1 text-xs font-semibold text-accent sm:mt-2 sm:text-sm">
              {match.minute || 'En curso'}
            </p>
          )}
          {!isLive && isFinished && (
            <p className="mt-1 text-xs text-white/50 sm:mt-2 sm:text-sm">{match.minute || 'FT'}</p>
          )}
          {!isLive && !isFinished && (
            <p className="mt-1 text-xs text-white/50 sm:mt-2 sm:text-sm">
              {formatKickoffTime(match.kickoffTime)}
            </p>
          )}
        </div>

        <TeamBadge team={match.teamB} />
      </div>

      {match.venue ? (
        <p className="mt-3 truncate text-center text-[11px] text-white/40 sm:mt-4 sm:text-xs">
          {match.venue}
        </p>
      ) : null}

      {children}
    </article>
  );
}
