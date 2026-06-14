function PlayerOnPitch({ player, color }) {
  const lastName = player.name?.split(' ').pop() || player.name;

  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      title={`${player.number ? `${player.number}. ` : ''}${player.name} (${player.position || 'Jugador'})`}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg ring-2 ring-black/20 sm:h-10 sm:w-10 sm:text-xs"
        style={{ borderColor: color, backgroundColor: '#1E1E1E' }}
      >
        {player.number || '·'}
      </div>
      <span className="mt-0.5 max-w-[3.5rem] truncate rounded bg-black/50 px-1 text-[9px] font-medium text-white sm:mt-1 sm:max-w-[5rem] sm:px-1.5 sm:text-[10px]">
        {lastName}
      </span>
    </div>
  );
}

function PlayerList({ title, players = [], accent }) {
  if (!players.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-carbon/50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          {title}
        </p>
        <p className="text-sm text-white/40">Sin datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-carbon/50 p-4">
      <p
        className="mb-3 text-xs font-semibold uppercase tracking-wide"
        style={{ color: accent }}
      >
        {title} ({players.length})
      </p>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.id || `${player.number}-${player.name}`}
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: `${accent}22`, color: accent }}
            >
              {player.number || '–'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{player.name}</p>
              <p className="truncate text-xs text-white/45">
                {player.position || 'Sin posición'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PitchLineup({ lineup, homeTeam, awayTeam }) {
  const homeStarters = lineup?.home?.starters || [];
  const awayStarters = lineup?.away?.starters || [];
  const homeTitulares = lineup?.home?.all?.filter((p) => !p.isSubstitute) || homeStarters;
  const awayTitulares = lineup?.away?.all?.filter((p) => !p.isSubstitute) || awayStarters;
  const homeSuplentes = lineup?.home?.substitutes || [];
  const awaySuplentes = lineup?.away?.substitutes || [];

  if (!homeTitulares.length && !awayTitulares.length) {
    return (
      <p className="text-sm text-white/50">
        La alineación confirmada aparecerá cerca del inicio del partido.
      </p>
    );
  }

  const pitchPlayers = [...homeStarters, ...awayStarters];

  return (
    <div className="space-y-5">
      <div className="relative aspect-[3/4] max-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#1b5e20_0%,#2e7d32_50%,#1b5e20_100%)] sm:max-h-[520px] sm:aspect-[4/5]">
        <div className="absolute inset-3 rounded-xl border-2 border-white/25" />
        <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/25" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
        <div className="absolute left-1/2 top-3 h-16 w-32 -translate-x-1/2 rounded-b-lg border border-t-0 border-white/20" />
        <div className="absolute bottom-3 left-1/2 h-16 w-32 -translate-x-1/2 rounded-t-lg border border-b-0 border-white/20" />

        <p className="absolute left-3 top-3 z-10 max-w-[45%] text-[10px] font-semibold uppercase tracking-wide text-white/70">
          {awayTeam}
          {lineup?.away?.formation ? ` · ${lineup.away.formation}` : ''}
        </p>
        <p className="absolute bottom-3 left-3 z-10 max-w-[45%] text-[10px] font-semibold uppercase tracking-wide text-white/70">
          {homeTeam}
          {lineup?.home?.formation ? ` · ${lineup.home.formation}` : ''}
        </p>

        {pitchPlayers.map((player) => (
          <PlayerOnPitch
            key={`${player.side}-${player.id || player.name}`}
            player={player}
            color={player.side === 'home' ? '#00E676' : '#00B0FF'}
          />
        ))}
      </div>

      {(homeTitulares.length < 11 || awayTitulares.length < 11) && (
        <p className="text-xs text-white/45">
          Alineación parcial en fuente de datos ({homeTitulares.length + awayTitulares.length}{' '}
          jugadores confirmados).
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PlayerList
            title={`Titulares · ${homeTeam}`}
            players={homeTitulares}
            accent="#00E676"
          />
          <PlayerList
            title={`Suplentes · ${homeTeam}`}
            players={homeSuplentes}
            accent="#00E676"
          />
        </div>
        <div className="space-y-4">
          <PlayerList
            title={`Titulares · ${awayTeam}`}
            players={awayTitulares}
            accent="#00B0FF"
          />
          <PlayerList
            title={`Suplentes · ${awayTeam}`}
            players={awaySuplentes}
            accent="#00B0FF"
          />
        </div>
      </div>
    </div>
  );
}
