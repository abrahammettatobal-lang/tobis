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
  if (mode === 'replay') return 'Repetición';
  if (mode === 'upcoming') return 'Programado';
  return '';
}

/** Partido finalizado hace poco — la repetición puede no estar disponible aún */
export function isRecentFinishedMatch(match) {
  if (!match || match.status !== 'Finalizado') return false;

  const kickoff = new Date(match.kickoffTime).getTime();
  if (Number.isNaN(kickoff)) return true;

  const hoursSinceKickoff = (Date.now() - kickoff) / (1000 * 60 * 60);
  return hoursSinceKickoff < 48;
}
