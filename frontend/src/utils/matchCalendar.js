const TIMEZONE = 'America/Mexico_City';

export function getMatchCalendarDate(match) {
  if (!match?.kickoffTime) return match?.kickoffDate || null;

  const parsed = new Date(match.kickoffTime);
  if (Number.isNaN(parsed.getTime())) return match.kickoffDate || null;

  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(parsed);
}

export function filterMatchesByCalendarDate(matches, date) {
  if (!date) return matches;
  return matches.filter((match) => {
    const calendarDate = getMatchCalendarDate(match);
    return calendarDate === date || match.kickoffDate === date;
  });
}

export function groupMatchesByDate(matches) {
  const map = new Map();

  for (const match of matches) {
    const date = getMatchCalendarDate(match) || match.kickoffDate;
    if (!date) continue;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(match);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayMatches]) => ({ date, count: dayMatches.length }));
}
