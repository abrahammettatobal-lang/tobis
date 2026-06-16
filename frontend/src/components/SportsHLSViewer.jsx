import { useEffect, useMemo, useState } from 'react';
import {
  getMundialChannels,
  getOtherSportsChannels,
  MUNDIAL_BROADCAST_HINT,
} from '../data/sportsStreams.js';
import {
  getChannelById,
  getChannelRecommendations,
  sortChannelsForMatch,
} from '../utils/matchChannelGuide.js';
import HLSPlayer from './HLSPlayer.jsx';

function ChannelButton({ channel, isActive, isRecommended, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(channel.id)}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
        isActive
          ? 'border-accent/50 bg-accent/10'
          : isRecommended
            ? 'border-accent/25 bg-accent/5 hover:border-accent/40'
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{channel.name}</p>
        {isRecommended ? (
          <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">
            Recomendado
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11px] text-white/45">
        {channel.region} · {channel.lang}
      </p>
      {channel.mundialNote ? (
        <p className="mt-1 text-[10px] leading-snug text-accent/80">{channel.mundialNote}</p>
      ) : null}
    </button>
  );
}

export default function SportsHLSViewer({ match }) {
  const guide = useMemo(() => getChannelRecommendations(match), [match]);
  const [activeChannelId, setActiveChannelId] = useState(guide.primaryId);
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    setActiveChannelId(guide.primaryId);
    setCustomUrl('');
  }, [match?.id, guide.primaryId]);

  const mundialChannels = useMemo(
    () => sortChannelsForMatch(getMundialChannels(), match),
    [match]
  );
  const otherChannels = getOtherSportsChannels();
  const recommendedIds = new Set(guide.channelIds.slice(0, 4));

  const activeChannel =
    getChannelById(activeChannelId) ??
    mundialChannels[0] ??
    null;
  const streamUrl = customUrl.trim() || activeChannel?.url || '';
  const title = customUrl.trim()
    ? 'Transmisión personalizada'
    : activeChannel?.name ?? 'TV deportiva';
  const subtitle = match
    ? `${match.teamA?.name} vs ${match.teamB?.name}`
    : activeChannel
      ? `${activeChannel.region} · ${activeChannel.network}`
      : customUrl;

  const primaryChannel = getChannelById(guide.primaryId);

  function selectChannel(channelId) {
    setCustomUrl('');
    setActiveChannelId(channelId);
  }

  function loadCustom() {
    const url = customUrl.trim();
    if (!url) return;
    setActiveChannelId(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs leading-relaxed text-emerald-50 sm:px-4">
          <p className="font-semibold text-emerald-100">{guide.headline}</p>
          <p className="mt-1">{guide.detail}</p>
          {primaryChannel ? (
            <p className="mt-2 text-emerald-200/90">
              Para este partido, empieza por{' '}
              <strong>{primaryChannel.name}</strong>. Si no está en pantalla, prueba Fox
              Deportes, Telemundo o FS1.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100 sm:px-4">
          <p className="font-semibold text-amber-50">¿No ves el partido?</p>
          <p className="mt-1">
            Cada canal emite su programación en directo. El mismo partido puede estar en otro
            canal según el horario — <strong>cambia en la lista de la derecha</strong>.
          </p>
        </div>

        <HLSPlayer
          key={streamUrl}
          url={streamUrl}
          title={title}
          subtitle={subtitle}
          showLiveBadge
          liveOnly
        />
      </div>

      <aside className="flex flex-col gap-3">
        <div className="rounded-xl border border-white/10 bg-card p-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-accent">
            Canales del Mundial 2026
          </p>
          <p className="mb-2 text-[10px] leading-relaxed text-white/40">
            {MUNDIAL_BROADCAST_HINT}
          </p>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1 scrollbar-none">
            {mundialChannels.map((channel) => (
              <ChannelButton
                key={channel.id}
                channel={channel}
                isActive={!customUrl && activeChannelId === channel.id}
                isRecommended={recommendedIds.has(channel.id)}
                onSelect={selectChannel}
              />
            ))}
          </div>
        </div>

        {otherChannels.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-card p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/45">
              Otros deportivos
            </p>
            <div className="flex max-h-36 flex-col gap-2 overflow-y-auto pr-1 scrollbar-none">
              {otherChannels.map((channel) => (
                <ChannelButton
                  key={channel.id}
                  channel={channel}
                  isActive={!customUrl && activeChannelId === channel.id}
                  isRecommended={false}
                  onSelect={selectChannel}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-card p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/45">
            URL HLS personalizada
          </p>
          <input
            type="url"
            value={customUrl}
            onChange={(event) => setCustomUrl(event.target.value)}
            placeholder="https://ejemplo.com/stream.m3u8"
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none ring-accent focus:ring-2"
          />
          <button
            type="button"
            onClick={loadCustom}
            className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Cargar transmisión
          </button>
        </div>
      </aside>
    </div>
  );
}
