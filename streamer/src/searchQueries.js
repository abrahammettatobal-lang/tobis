const TEAM_ALIASES = {
  'south korea': ['korea', 'korea republic'],
  'czech republic': ['czechia', 'czech'],
  'united states': ['usa', 'us'],
  'bosnia and herzegovina': ['bosnia'],
};

function aliasForms(name = '') {
  const base = String(name).trim();
  if (!base) return [];
  const key = base.toLowerCase();
  const aliases = TEAM_ALIASES[key] || [];
  return [base, ...aliases];
}

function pairQueries(home, away) {
  const homes = aliasForms(home);
  const aways = aliasForms(away);
  const set = new Set();

  for (const h of homes) {
    for (const a of aways) {
      set.add(`${h} ${a}`);
      set.add(`${h} vs ${a}`);
    }
  }

  return [...set];
}

export function buildTorrentSearchVariants({
  query = '',
  home = '',
  away = '',
  abbrHome = '',
  abbrAway = '',
  group = '',
  mode = 'replay',
} = {}) {
  const pairs = new Set();

  if (query.trim()) pairs.add(query.trim());

  for (const pair of pairQueries(home, away)) {
    pairs.add(pair);
  }

  if (abbrHome && abbrAway) {
    pairs.add(`${abbrHome} ${abbrAway}`);
    pairs.add(`${abbrHome} vs ${abbrAway}`);
  }

  const basePairs = [...pairs];
  const variants = new Set();

  for (const pair of basePairs) {
    if (mode === 'live') {
      // En vivo: primero HDTV (lo mas comun en trackers durante el partido)
      variants.add(`FIFA World Cup 2026 Group ${group} ${pair} HDTV`.trim());
      variants.add(`${pair} HDTV 2026 World Cup`);
      variants.add(`FIFA World Cup 2026 ${pair}`);
      variants.add(`${pair} 720p HDTV 2026`);
      variants.add(`${pair} live HDTV 2026`);
      variants.add(`FIFA World Cup 2026 ${pair} live`);
      variants.add(`${pair} World Cup live 2026`);
      variants.add(`${pair} en vivo mundial 2026`);
    } else {
      variants.add(`FIFA World Cup 2026 Group ${group} ${pair}`.trim());
      variants.add(`${pair} full match mp4 2026`);
      variants.add(`${pair} HDTV 2026`);
      variants.add(`${pair} mp4 2026`);
      variants.add(`${pair} World Cup 2026`);
      variants.add(pair);
    }
  }

  return [...variants].filter(Boolean);
}

export function scoreTorrentForMode(title, mode = 'replay') {
  const name = String(title || '').toLowerCase();
  let score = 0;

  if (/\bmp4\b/.test(name)) score += 40;
  if (/\baac\b/.test(name)) score += 20;
  if (/\b(h264|x264|avc)\b/.test(name)) score += 10;
  if (/\b(hdtv|ts|m2ts)\b/.test(name)) score += mode === 'live' ? 25 : 10;
  if (/\b2026\b/.test(name)) score += 15;
  if (/\b(fifa|world cup)\b/.test(name)) score += 20;
  if (mode === 'live' && /\b(live|en vivo|stream)\b/.test(name)) score += 30;

  if (/\b(highlights?|resumen|condensed|short)\b/.test(name)) score -= 40;
  if (/\bmkv\b/.test(name)) score -= 15;
  if (/\b(ac3|dts|eac3|truehd)\b/.test(name)) score -= 25;

  return score;
}
