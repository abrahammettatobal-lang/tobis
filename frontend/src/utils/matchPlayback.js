/** Duración máxima estimada de un partido antes de considerarlo finalizado */
const MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000;

const FINISHED_MINUTE_MARKERS = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

function parseKickoffMs(match) {
  const kickoff = new Date(match?.kickoffTime).getTime();
  return Number.isNaN(kickoff) ? null : kickoff;
}

function minuteLooksFinished(minute) {
  if (!minute) return false;
  const value = String(minute).trim().toUpperCase();
  if (FINISHED_MINUTE_MARKERS.has(value)) return true;
  return value === 'FULL TIME' || value.includes('FINALIZ');
}

function displayLooksFinished(displayStatus) {
  if (!displayStatus) return false;
  const value = String(displayStatus).toLowerCase();
  return (
    value.includes('finaliz') ||
    value.includes('termin') ||
    value.includes('finished') ||
    value.includes('full time')
  );
}

/** Estado real del partido a partir de status, minuto y hora de inicio */
export function resolveMatchStatus(match) {
  if (!match) return null;

  const rawStatus = match.status?.trim() || '';

  if (rawStatus === 'Finalizado') return 'Finalizado';
  if (rawStatus === 'En Vivo') return 'En Vivo';

  if (minuteLooksFinished(match.minute) || displayLooksFinished(match.displayStatus)) {
    return 'Finalizado';
  }

  const kickoffMs = parseKickoffMs(match);
  const now = Date.now();

  if (kickoffMs != null && kickoffMs > now) {
    return 'Por empezar';
  }

  if (kickoffMs != null && now - kickoffMs > MATCH_DURATION_MS) {
    return 'Finalizado';
  }

  if (kickoffMs != null && kickoffMs <= now) {
    return 'En Vivo';
  }

  return rawStatus || 'Por empezar';
}

export function getMatchPlaybackMode(match) {
  if (!match) return null;

  const status = resolveMatchStatus(match);

  if (status === 'Finalizado') return 'replay';
  if (status === 'En Vivo') return 'live';
  if (status === 'Por empezar') return 'upcoming';

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
  if (getMatchPlaybackMode(match) !== 'replay') return false;

  const kickoffMs = parseKickoffMs(match);
  if (kickoffMs == null) return true;

  const hoursSinceKickoff = (Date.now() - kickoffMs) / (1000 * 60 * 60);
  return hoursSinceKickoff < 48;
}
