import { formatDateLabel } from '../services/api.js';

export default function ScheduleDays({ days, selectedDate, onSelectDate }) {
  if (!days.length) return null;

  return (
    <div className="mb-4 sm:mb-6">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/45 sm:text-xs">
        Días del mundial ({days.reduce((sum, day) => sum + day.count, 0)} partidos)
      </p>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-none snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {days.map(({ date, count }) => {
          const isActive = date === selectedDate;
          const label = formatDateLabel(date).split(',')[0];

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`touch-target shrink-0 snap-start rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] sm:min-w-0 ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-white/10 bg-card text-white/70 hover:border-white/20'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wide opacity-70">
                {date.slice(8, 10)}/{date.slice(5, 7)}
              </span>
              <span className="block text-xs font-semibold capitalize sm:text-sm">{label}</span>
              <span className="block text-[10px] opacity-60">{count} partidos</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
