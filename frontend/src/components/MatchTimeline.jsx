function eventIcon(type) {
  if (type === 'FootballGoal' || type === 'FootballPenaltyGoal') return '⚽';
  if (type === 'FootballOwnGoal') return '⚽';
  if (type === 'FootballYellowCard') return '🟨';
  if (type === 'FootballRedCard') return '🟥';
  if (type === 'FootballSubstitution') return '🔄';
  return '•';
}

export default function MatchTimeline({ events = [], homeTeam, awayTeam }) {
  if (!events.length) {
    return (
      <p className="text-sm text-white/50">
        Aún no hay eventos registrados para este partido.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event, index) => {
        const isHome = event.teamSide === 'home';
        return (
          <li
            key={`${event.minute}-${event.player}-${index}`}
            className={`flex items-start gap-2 rounded-xl border border-white/10 bg-carbon/60 p-2.5 sm:gap-3 sm:p-3 ${
              isHome ? 'border-l-2 border-l-accent/40' : 'border-l-2 border-l-accentBlue/40'
            }`}
          >
            <span className="min-w-[2.5rem] text-xs font-semibold text-white/70 sm:min-w-[3rem] sm:text-sm">
              {event.minute}
            </span>
            <span className="text-base leading-none sm:text-lg">{eventIcon(event.type)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium sm:text-base">
                {event.label} · {event.player}
              </p>
              <p className="text-[11px] text-white/50 sm:text-xs">
                {isHome ? homeTeam : awayTeam}
                {event.assist ? ` · Asistencia: ${event.assist}` : ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
