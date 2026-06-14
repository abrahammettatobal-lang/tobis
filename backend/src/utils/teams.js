const TEAM_ISO = {
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Belgium: 'be',
  Brazil: 'br',
  Canada: 'ca',
  Chile: 'cl',
  China: 'cn',
  Colombia: 'co',
  Croatia: 'hr',
  'Czech Republic': 'cz',
  Czechia: 'cz',
  Denmark: 'dk',
  Ecuador: 'ec',
  Egypt: 'eg',
  England: 'gb-eng',
  France: 'fr',
  Germany: 'de',
  Ghana: 'gh',
  Greece: 'gr',
  Iran: 'ir',
  Italy: 'it',
  Japan: 'jp',
  Mexico: 'mx',
  Morocco: 'ma',
  Netherlands: 'nl',
  Nigeria: 'ng',
  Norway: 'no',
  Poland: 'pl',
  Portugal: 'pt',
  Qatar: 'qa',
  'Saudi Arabia': 'sa',
  Scotland: 'gb-sct',
  Senegal: 'sn',
  Serbia: 'rs',
  'South Africa': 'za',
  'South Korea': 'kr',
  Spain: 'es',
  Sweden: 'se',
  Switzerland: 'ch',
  Tunisia: 'tn',
  Turkey: 'tr',
  Uruguay: 'uy',
  USA: 'us',
  'United States': 'us',
  Wales: 'gb-wls',
  'Bosnia and Herzegovina': 'ba',
  'Bosnia-Herzegovina': 'ba',
  Cameroon: 'cm',
  'Costa Rica': 'cr',
  'Ivory Coast': 'ci',
  Jamaica: 'jm',
  Panama: 'pa',
  Paraguay: 'py',
  Peru: 'pe',
  'New Zealand': 'nz',
  Ukraine: 'ua',
  Hungary: 'hu',
  Romania: 'ro',
  Algeria: 'dz',
  Bolivia: 'bo',
  Venezuela: 've',
  Haiti: 'ht',
  Iraq: 'iq',
  Jordan: 'jo',
  Uzbekistan: 'uz',
  'DR Congo': 'cd',
  Curacao: 'cw',
  'Cape Verde': 'cv',
};

export function getFlagUrl(teamName, badgeUrl = '') {
  if (badgeUrl?.startsWith('http')) return badgeUrl;
  if (badgeUrl) {
    return `https://storage.livescore.com/images/team/high/${badgeUrl}`;
  }

  const iso = TEAM_ISO[teamName];
  if (iso) return `https://flagcdn.com/w80/${iso}.png`;
  return 'https://flagcdn.com/w80/un.png';
}

export function slugifyTeam(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildYoutubeQuery(teamA, teamB) {
  return `relato en vivo mundial 2026 ${teamA} vs ${teamB}`;
}
