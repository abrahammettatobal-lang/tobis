import { formatDateLabel } from '../services/api.js';

export default function Navbar({ selectedDate, onDateChange }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-carbon/95 backdrop-blur supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/tobis-color.svg"
            alt="Tobis"
            className="h-10 w-auto shrink-0 sm:h-12"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent sm:text-xs sm:tracking-[0.2em]">
              Mundial 2026
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-2xl">Tobis</h1>
            <p className="hidden text-sm text-white/60 sm:block">
              Marcadores en vivo · alineaciones
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/wc-stream.html"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 sm:inline"
          >
            Reproductor en vivo
          </a>
        <label className="flex flex-col items-end gap-0.5 text-xs text-white/70 sm:gap-1 sm:text-sm">
          <span className="sr-only sm:not-sr-only sm:inline">Fecha</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            className="touch-target max-w-[9.5rem] rounded-xl border border-white/10 bg-card px-3 py-2 text-base text-white outline-none ring-accent focus:ring-2 sm:max-w-none sm:px-4 sm:text-sm"
          />
          <span className="hidden max-w-[9.5rem] truncate capitalize text-white/45 sm:block sm:max-w-[12rem] sm:text-xs">
            {formatDateLabel(selectedDate)}
          </span>
        </label>
        </div>
      </div>
    </header>
  );
}
