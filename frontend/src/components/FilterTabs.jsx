const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'En Vivo', label: 'En Vivo' },
  { id: 'Finalizado', label: 'Finalizados' },
];

export default function FilterTabs({ activeFilter, onChange, counts }) {
  return (
    <div
      className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-none snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="tablist"
      aria-label="Filtrar partidos"
    >
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = counts[filter.id] ?? 0;

        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.id)}
            className={`touch-target shrink-0 snap-start rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] sm:py-2 ${
              isActive
                ? 'bg-accent text-black'
                : 'bg-card text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {filter.label}
            <span className="ml-1.5 text-xs opacity-70 sm:ml-2">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
