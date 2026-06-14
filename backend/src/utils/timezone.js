export const TIMEZONE = 'America/Mexico_City';

export function getTodayInTimezone(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(date);
}

/** Fecha de calendario (CDMX) para filtrar partidos por día. */
export function getMatchCalendarDate(match) {
  if (!match?.kickoffTime) return match?.kickoffDate || null;

  const parsed = new Date(match.kickoffTime);
  if (Number.isNaN(parsed.getTime())) return match.kickoffDate || null;

  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(parsed);
}

export function matchIsOnDate(match, date) {
  if (!date) return true;
  const calendarDate = getMatchCalendarDate(match);
  return calendarDate === date || match.kickoffDate === date;
}

export function getMinutesAgo(isoString) {
  if (!isoString) return null;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export function formatUpdatedMessage(lastUpdatedAt) {
  const minutes = getMinutesAgo(lastUpdatedAt);
  if (minutes == null) return 'Esperando primera actualización';
  if (minutes === 0) return 'Datos actualizados hace un momento';
  if (minutes === 1) return 'Datos actualizados hace 1 minuto';
  return `Datos actualizados hace ${minutes} minutos`;
}

export function getCacheAgeMs(lastUpdatedAt) {
  if (!lastUpdatedAt) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(lastUpdatedAt).getTime();
}
