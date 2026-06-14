export default function MatchChannels({ match, activeChannelId, onSelectChannel }) {
  if (!match?.channels?.length) return null;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/45 sm:text-xs">
        Canales en vivo
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible">
        {match.channels.map((channel) => {
          const isActive = activeChannelId === channel.id;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectChannel(match.id, channel.id);
              }}
              className={`touch-target shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition active:scale-[0.98] sm:px-3 sm:py-1.5 ${
                isActive
                  ? 'bg-accent text-black'
                  : 'bg-white/10 text-white/75 hover:bg-white/15 hover:text-white'
              }`}
            >
              {channel.label}
              {channel.hd ? ' HD' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
