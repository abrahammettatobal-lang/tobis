import { SPORTS_CHANNELS } from '../data/sportsStreams.js';

function teamHaystack(match) {
  if (!match) return '';
  return [
    match.teamA?.name,
    match.teamB?.name,
    match.teamA?.abbr,
    match.teamB?.abbr,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function involvesMexico(match) {
  const hay = teamHaystack(match);
  return hay.includes('mex') || hay.includes('mexico');
}

function involvesUsa(match) {
  const hay = teamHaystack(match);
  return (
    hay.includes('usa') ||
    hay.includes('estados unidos') ||
    hay.includes('united states')
  );
}

/**
 * Canales que normalmente transmiten el Mundial 2026 (derechos oficiales).
 * Orden = prueba primero el que más encaja con el partido.
 */
export function getChannelRecommendations(match) {
  if (involvesMexico(match)) {
    return {
      primaryId: 'azteca-intl',
      channelIds: ['azteca-intl', 'tudn', 'fox-deportes', 'telemundo', 'fs1', 'univision'],
      headline: 'Sí — este partido suele ir en Azteca 7/Uno o TUDN (México)',
      detail:
        'TV Azteca y Televisa pasan los partidos de México y muchos más en abierto. ' +
        'En USA también en Telemundo, Fox Deportes o FS1.',
    };
  }

  if (involvesUsa(match)) {
    return {
      primaryId: 'fox-deportes',
      channelIds: ['fox-deportes', 'telemundo', 'fs1', 'univision', 'fs2'],
      headline: 'Sí — en USA: Telemundo (español) o Fox/FS1 (inglés) pasan el Mundial',
      detail:
        'Telemundo lleva los 104 partidos en español; Fox Sports los 104 en inglés. ' +
        'Prueba Fox Deportes o FS1 si Telemundo no muestra el partido ahora.',
    };
  }

  return {
    primaryId: 'fox-deportes',
    channelIds: ['fox-deportes', 'telemundo', 'fs1', 'univision', 'azteca-intl', 'universo'],
    headline: 'Sí — el Mundial va en Telemundo, Fox Deportes y FS1 (USA)',
    detail:
      'No hay un solo canal 24/7 solo de tu partido: cada encuentro se asigna a un canal. ' +
      'Prueba Fox Deportes, Telemundo o FS1 según horario. México: TUDN/Azteca.',
  };
}

export function getChannelById(id) {
  return SPORTS_CHANNELS.find((ch) => ch.id === id) ?? null;
}

export function sortChannelsForMatch(channels, match) {
  const { channelIds } = getChannelRecommendations(match);
  const rank = new Map(channelIds.map((id, index) => [id, index]));

  return [...channels].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : 999;
    const bRank = rank.has(b.id) ? rank.get(b.id) : 999;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name, 'es');
  });
}
