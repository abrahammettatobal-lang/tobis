import { getMatchCalendarDate } from '../utils/matchCalendar.js';
import ScoreCard from './ScoreCard.jsx';

export default function ScheduleFullList({ scheduleDays, allMatches, selectedMatchId, onSelectMatch }) {
  if (!scheduleDays.length) return null;

  const matchesByDate = new Map();
  for (const match of allMatches) {
    const date = getMatchCalendarDate(match) || match.kickoffDate;
    if (!date) continue;
    if (!matchesByDate.has(date)) matchesByDate.set(date, []);
    matchesByDate.get(date).push(match);
  }

  return (
    <div className="space-y-6">
      {scheduleDays.map(({ date, count }) => {
        const dayMatches = matchesByDate.get(date) || [];
        if (!dayMatches.length) return null;

        return (
          <section key={date} aria-label={`Partidos ${date}`}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold capitalize text-white/90">
                {new Intl.DateTimeFormat('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  timeZone: 'America/Mexico_City',
                }).format(new Date(`${date}T12:00:00`))}
              </h3>
              <span className="text-xs text-white/45">{count} partidos</span>
            </div>
            <div className="grid gap-3 sm:gap-4">
              {dayMatches.map((match) => (
                <ScoreCard
                  key={match.id}
                  match={match}
                  highlighted={String(selectedMatchId) === String(match.id)}
                  onSelect={() => onSelectMatch(match.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
