import { translateTeam } from './teams.js';

function buildYoutubeSearchUrl(query) {
  const params = new URLSearchParams({
    listType: 'search',
    list: query,
    autoplay: '1',
    modestbranding: '1',
    rel: '0',
  });
  return `https://www.youtube.com/embed?${params.toString()}`;
}

export function buildMatchChannels(match) {
  const home = match.teamA?.nameEn || match.teamA?.name || 'Local';
  const away = match.teamB?.nameEn || match.teamB?.name || 'Visitante';
  const homeEs = match.teamA?.name || translateTeam(home);
  const awayEs = match.teamB?.name || translateTeam(away);

  const templates = [
    {
      label: 'Canal 1',
      hd: false,
      query: `mundial 2026 ${homeEs} vs ${awayEs} en vivo`,
    },
    {
      label: 'Canal 2',
      hd: false,
      query: `world cup 2026 ${home} vs ${away} live stream`,
    },
    {
      label: 'Canal 3',
      hd: true,
      query: `mundial 2026 ${homeEs} ${awayEs} en vivo HD`,
    },
    {
      label: 'Canal 4',
      hd: true,
      query: `fifa world cup 2026 ${home} ${away} live`,
    },
    {
      label: 'Canal 5',
      hd: false,
      query: `relato en vivo ${homeEs} vs ${awayEs} mundial 2026`,
    },
    {
      label: 'Canal 6',
      hd: true,
      query: `azteca deportes mundial 2026 ${homeEs} ${awayEs}`,
    },
  ];

  return templates.map((channel, index) => ({
    id: `${match.id}-canal-${index + 1}`,
    label: channel.label,
    hd: channel.hd,
    type: 'youtube-search',
    embedUrl: buildYoutubeSearchUrl(channel.query),
    query: channel.query,
  }));
}

export function attachChannelsToMatches(matches) {
  return matches.map((match) => ({
    ...match,
    channels: match.channels?.length ? match.channels : buildMatchChannels(match),
  }));
}
