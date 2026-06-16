/**
 * Canales con señal HLS pública (iptv-org). TV lineal — no garantiza el partido
 * en ese momento. Derechos WC 2026: Telemundo/Universo (USA ES), Fox/FS1 (USA EN),
 * TUDN/Televisa/Azteca (México), DSports/ESPN (LatAm).
 * @see https://github.com/iptv-org/iptv
 */
export const HLS_TEST_STREAM =
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

/** Canal por defecto — Fox Deportes (Mundial en español, USA) */
export const DEFAULT_SPORTS_CHANNEL_ID = 'fox-deportes';

export const MUNDIAL_BROADCAST_HINT =
  'Sí hay canales del Mundial: Telemundo/Universo y Fox/FS1 (USA), TUDN/Azteca (México). ' +
  'Cada partido se asigna a un canal según horario — si no lo ves, cambia en la lista.';

export const SPORTS_CHANNELS = [
  {
    id: 'fox-deportes',
    name: 'Fox Deportes',
    region: 'Estados Unidos',
    lang: 'ES',
    network: 'Fox Sports',
    mundial2026: true,
    mundialNote: 'Mundial 2026 en español (USA) · Fox Sports',
    url: 'https://cors-proxy.cooks.fyi/http://23.237.104.106:8080/USA_FOX_DEPORTES/index.m3u8',
    priority: 1,
  },
  {
    id: 'fs1',
    name: 'Fox Sports 1',
    region: 'Estados Unidos',
    lang: 'EN',
    network: 'Fox Sports',
    mundial2026: true,
    mundialNote: 'Los 104 partidos en inglés (USA)',
    url: 'https://cors-proxy.cooks.fyi/http://190.11.225.124:5000/live/fs1_hd/playlist.m3u8',
    priority: 2,
  },
  {
    id: 'telemundo',
    name: 'Telemundo',
    region: 'Estados Unidos',
    lang: 'ES',
    network: 'NBCUniversal',
    mundial2026: true,
    mundialNote: '92 partidos en abierto + 12 en Universo (USA)',
    url: 'https://d1rqgw5gocwo9i.cloudfront.net/manifest/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod_default_xumo-nbcu-stitched/10a44c37-f976-4d2b-ab23-8637a7a094ca/3.m3u8',
    verified: true,
    priority: 3,
  },
  {
    id: 'univision',
    name: 'Univision (KMEX)',
    region: 'Estados Unidos',
    lang: 'ES',
    network: 'TelevisaUnivision',
    mundial2026: true,
    mundialNote: 'TelevisaUnivision · partidos seleccionados',
    url: 'https://streaming-live-fcdn.api.prd.univisionnow.com/kmex/kmex.isml/hls/kmex.m3u8',
    priority: 4,
  },
  {
    id: 'universo',
    name: 'Universo',
    region: 'Estados Unidos',
    lang: 'ES',
    network: 'NBCUniversal',
    mundial2026: true,
    mundialNote: '12 partidos del Mundial cuando Telemundo tiene conflicto',
    url: 'http://190.11.225.124:5000/live/universo_hd/playlist.m3u8',
    priority: 5,
  },
  {
    id: 'tudn',
    name: 'TUDN',
    region: 'México / USA',
    lang: 'ES',
    network: 'TelevisaUnivision',
    mundial2026: true,
    mundialNote: 'Mundial en México · muchos partidos en cable',
    url: 'https://streaming-live-fcdn.api.prd.univisionnow.com/tudn/tudn.isml/hls/tudn.m3u8',
    priority: 6,
  },
  {
    id: 'azteca-intl',
    name: 'Azteca Internacional',
    region: 'México',
    lang: 'ES',
    network: 'TV Azteca',
    mundial2026: true,
    mundialNote: 'Azteca 7 / Azteca Uno · 32 partidos en abierto (MX)',
    url: 'https://azt-mun.otteravision.com/azt/mun/mun.m3u8',
    verified: true,
    priority: 7,
  },
  {
    id: 'fs2',
    name: 'Fox Sports 2',
    region: 'Estados Unidos',
    lang: 'EN',
    network: 'Fox Sports',
    mundial2026: true,
    mundialNote: 'Partidos adicionales del Mundial (USA)',
    url: 'https://tvsen7.aynaott.com/foxsports2/index.m3u8',
    priority: 8,
  },
  {
    id: 'espn-deportes',
    name: 'ESPN Deportes',
    region: 'Estados Unidos',
    lang: 'ES',
    network: 'ESPN',
    mundial2026: true,
    mundialNote: 'Cobertura LatAm seleccionada',
    url: 'http://origin.thetvapp.to/hls/espn-deportes/mono.m3u8',
    priority: 9,
  },
  {
    id: 'itv-deportes',
    name: 'ITV Deportes',
    region: 'México',
    lang: 'ES',
    network: 'ITV',
    mundial2026: false,
    mundialNote: 'Deportes general · México',
    url: 'https://thm-it-roku.otteravision.com/thm/it/it.m3u8',
    verified: true,
  },
  {
    id: 'bein-xtra',
    name: 'beIN SPORTS XTRA',
    region: 'Estados Unidos',
    lang: 'EN/AR',
    network: 'beIN',
    mundial2026: false,
    mundialNote: 'Fútbol internacional · no es señal del Mundial',
    url: 'https://bein-xtra-bein.amagi.tv/playlist.m3u8',
    verified: true,
  },
  {
    id: 'nbc-sports',
    name: 'NBC Sports NOW',
    region: 'Estados Unidos',
    lang: 'EN',
    network: 'NBC',
    mundial2026: false,
    mundialNote: 'Deportes general · NBC',
    url: 'https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008',
    verified: true,
  },
  {
    id: 'ftf-sports',
    name: 'FTF Sports',
    region: 'Estados Unidos',
    lang: 'EN',
    network: 'FTF',
    mundial2026: false,
    mundialNote: 'Deportes general',
    url: 'https://1657061170.rsc.cdn77.org/HLS/FTF-LINEAR.m3u8',
    verified: true,
  },
];

export function getMundialChannels() {
  return SPORTS_CHANNELS.filter((ch) => ch.mundial2026);
}

export function getOtherSportsChannels() {
  return SPORTS_CHANNELS.filter((ch) => !ch.mundial2026);
}
