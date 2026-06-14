export function getMatchPlaybackMode(match) {
  if (!match) return null;

  if (match.status === 'Finalizado') return 'replay';
  if (match.status === 'En Vivo') return 'live';

  if (match.status === 'Por empezar') {
    const kickoff = new Date(match.kickoffTime).getTime();
    if (!Number.isNaN(kickoff) && kickoff <= Date.now()) {
      return 'live';
    }
    return 'upcoming';
  }

  return 'replay';
}

export function getPlaybackLabel(mode) {
  if (mode === 'live') return 'En vivo';
  if (mode === 'replay') return 'Repeticion';
  if (mode === 'upcoming') return 'Programado';
  return '';
}
