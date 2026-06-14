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

function buildYoutubeVideoUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export { buildYoutubeVideoUrl, buildYoutubeSearchUrl };

/**
 * Canales embebibles legales (YouTube / señales públicas).
 * Replica la UX de selector múltiple sin agregar streams pirata.
 */
export function buildMatchChannels(match) {
  const home = match.teamA.name;
  const away = match.teamB.name;
  const homeEs = translateTeam(home);
  const awayEs = translateTeam(away);

  const templates = [
    {
      label: 'Canal 1',
      hd: false,
      type: 'youtube-search',
      description: 'Relato en español',
      query: `mundial 2026 ${homeEs} vs ${awayEs} en vivo`,
    },
    {
      label: 'Canal 2',
      hd: false,
      type: 'youtube-search',
      description: 'Relato alternativo',
      query: `world cup 2026 ${home} vs ${away} live stream`,
    },
    {
      label: 'Canal 3',
      hd: true,
      type: 'youtube-search',
      description: 'Señal HD · búsqueda en vivo',
      query: `mundial 2026 ${homeEs} ${awayEs} en vivo HD`,
    },
    {
      label: 'Canal 4',
      hd: true,
      type: 'youtube-search',
      description: 'Cobertura internacional',
      query: `fifa world cup 2026 ${home} ${away} live`,
    },
    {
      label: 'Canal 5',
      hd: false,
      type: 'youtube-search',
      description: 'Radio / relato México',
      query: `relato en vivo ${homeEs} vs ${awayEs} mundial 2026`,
    },
    {
      label: 'Canal 6',
      hd: true,
      type: 'youtube-search',
      description: 'TV deportiva en YouTube',
      query: `azteca deportes mundial 2026 ${homeEs} ${awayEs}`,
    },
    {
      label: 'Canal 7',
      hd: true,
      type: 'youtube-search',
      description: 'Telemundo / USA',
      query: `telemundo world cup 2026 ${home} vs ${away} live`,
    },
    {
      label: 'Canal 8',
      hd: true,
      type: 'youtube-search',
      description: 'Highlights en directo',
      query: `mundial 2026 ${homeEs} vs ${awayEs} minuto a minuto`,
    },
    {
      label: 'Canal 9',
      hd: false,
      type: 'youtube-search',
      description: 'FIFA / resumen oficial',
      query: `fifa plus world cup 2026 ${home} ${away}`,
    },
  ];

  return templates.map((channel, index) => ({
    id: `${match.id}-canal-${index + 1}`,
    label: channel.label,
    hd: channel.hd,
    type: channel.type,
    description: channel.description,
    embedUrl: buildYoutubeSearchUrl(channel.query),
    query: channel.query,
  }));
}

const TEAM_ES = {
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'República Checa',
  Czechia: 'Chequia',
  'South Africa': 'Sudáfrica',
  'United States': 'Estados Unidos',
  USA: 'Estados Unidos',
  'Bosnia and Herzegovina': 'Bosnia',
  'Bosnia-Herzegovina': 'Bosnia',
  England: 'Inglaterra',
  Germany: 'Alemania',
  Spain: 'España',
  France: 'Francia',
  Brazil: 'Brasil',
  Argentina: 'Argentina',
  Mexico: 'México',
  Japan: 'Japón',
  Netherlands: 'Países Bajos',
  Portugal: 'Portugal',
  Croatia: 'Croacia',
  Switzerland: 'Suiza',
  Canada: 'Canadá',
};

function translateTeam(name) {
  return TEAM_ES[name] || name;
}

export function attachChannelsToMatches(matches) {
  return matches.map((match) => ({
    ...match,
    channels: buildMatchChannels(match),
  }));
}
