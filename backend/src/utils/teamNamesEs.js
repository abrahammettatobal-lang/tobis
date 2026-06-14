const ES_TO_EN = {
  MÉXICO: 'Mexico',
  MEXICO: 'Mexico',
  SUDÁFRICA: 'South Africa',
  'COREA DEL SUR': 'South Korea',
  'REP. CHECA': 'Czech Republic',
  CANADÁ: 'Canada',
  BOSNIA: 'Bosnia and Herzegovina',
  'ESTADOS UNIDOS': 'United States',
  PARAGUAY: 'Paraguay',
  QATAR: 'Qatar',
  SUIZA: 'Switzerland',
  BRASIL: 'Brazil',
  MARRUECOS: 'Morocco',
  HAITÍ: 'Haiti',
  ESCOCIA: 'Scotland',
  AUSTRALIA: 'Australia',
  TURQUIA: 'Turkey',
  TURQUÍA: 'Turkey',
  ALEMANIA: 'Germany',
  CURAZAO: 'Curacao',
  CURAÇAO: 'Curacao',
  'PAÍSES BAJOS': 'Netherlands',
  JAPÓN: 'Japan',
  'COSTA DE MARFIL': 'Ivory Coast',
  ECUADOR: 'Ecuador',
  SUECIA: 'Sweden',
  TÚNEZ: 'Tunisia',
  ESPAÑA: 'Spain',
  'CABO VERDE': 'Cape Verde',
  BÉLGICA: 'Belgium',
  EGIPTO: 'Egypt',
  'ARABIA SAUDITA': 'Saudi Arabia',
  URUGUAY: 'Uruguay',
  IRÁN: 'Iran',
  'NUEVA ZELANDA': 'New Zealand',
  FRANCIA: 'France',
  SENEGAL: 'Senegal',
  IRAK: 'Iraq',
  NORUEGA: 'Norway',
  ARGENTINA: 'Argentina',
  ARGELIA: 'Algeria',
  AUSTRIA: 'Austria',
  JORDANIA: 'Jordan',
  PORTUGAL: 'Portugal',
  'RD CONGO': 'DR Congo',
  INGLATERRA: 'England',
  CROACIA: 'Croatia',
  GHANA: 'Ghana',
  PANAMÁ: 'Panama',
  UZBEKISTÁN: 'Uzbekistan',
  COLOMBIA: 'Colombia',
};

const EN_TO_ES = Object.fromEntries(
  Object.entries(ES_TO_EN).map(([es, en]) => [en.toLowerCase(), formatSpanishDisplay(es)])
);

const EN_ALIASES = {
  czechia: 'Czech Republic',
  'czech republic': 'Czech Republic',
  usa: 'United States',
  'united states': 'United States',
  'bosnia and herzegovina': 'Bosnia and Herzegovina',
  'bosnia-herzegovina': 'Bosnia and Herzegovina',
  'ivory coast': 'Ivory Coast',
  "cote d'ivoire": 'Ivory Coast',
  'cape verde': 'Cape Verde',
  'cape verde islands': 'Cape Verde',
  'saudi arabia': 'Saudi Arabia',
  'south korea': 'South Korea',
  'korea republic': 'South Korea',
  'south africa': 'South Africa',
  'new zealand': 'New Zealand',
  'dr congo': 'DR Congo',
  'congo dr': 'DR Congo',
  'democratic republic of the congo': 'DR Congo',
  curacao: 'Curacao',
  netherlands: 'Netherlands',
  turkiye: 'Turkey',
  turkey: 'Turkey',
};

function formatSpanishDisplay(esName) {
  const lowerWords = new Set(['de', 'del', 'y', 'la', 'los', 'las']);

  return esName
    .split(' ')
    .map((word, index) => {
      if (word.length <= 3 && word.includes('.')) return word.toUpperCase();
      if (index > 0 && lowerWords.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/^Rd congo$/i, 'RD Congo')
    .replace(/^Rep\. checa$/i, 'Rep. Checa');
}

export function teamNameToEnglish(name = '') {
  const trimmed = name.trim();
  const upper = trimmed.toUpperCase();
  if (ES_TO_EN[upper]) return ES_TO_EN[upper];

  const alias = EN_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  return trimmed;
}

export function teamNameToSpanish(name = '') {
  const english = teamNameToEnglish(name);
  const fromMap = EN_TO_ES[english.toLowerCase()];
  if (fromMap) return fromMap;
  return name;
}

export function normalizeTeamForKey(name = '') {
  return teamNameToEnglish(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function spanishAbbr(esName = '') {
  const map = {
    MÉXICO: 'MEX',
    SUDÁFRICA: 'RSA',
    'COREA DEL SUR': 'KOR',
    'REP. CHECA': 'CZE',
    CANADÁ: 'CAN',
    BOSNIA: 'BIH',
    'ESTADOS UNIDOS': 'USA',
    PARAGUAY: 'PAR',
    QATAR: 'QAT',
    SUIZA: 'SUI',
    BRASIL: 'BRA',
    MARRUECOS: 'MAR',
    HAITÍ: 'HAI',
    ESCOCIA: 'SCO',
    AUSTRALIA: 'AUS',
    TURQUIA: 'TUR',
    ALEMANIA: 'GER',
    CURAZAO: 'CUW',
    'PAÍSES BAJOS': 'NED',
    JAPÓN: 'JPN',
    'COSTA DE MARFIL': 'CIV',
    ECUADOR: 'ECU',
    SUECIA: 'SWE',
    TÚNEZ: 'TUN',
    ESPAÑA: 'ESP',
    'CABO VERDE': 'CPV',
    BÉLGICA: 'BEL',
    EGIPTO: 'EGY',
    'ARABIA SAUDITA': 'KSA',
    URUGUAY: 'URU',
    IRÁN: 'IRN',
    'NUEVA ZELANDA': 'NZL',
    FRANCIA: 'FRA',
    SENEGAL: 'SEN',
    IRAK: 'IRQ',
    NORUEGA: 'NOR',
    ARGENTINA: 'ARG',
    ARGELIA: 'ALG',
    AUSTRIA: 'AUT',
    JORDANIA: 'JOR',
    PORTUGAL: 'POR',
    'RD CONGO': 'COD',
    INGLATERRA: 'ENG',
    CROACIA: 'CRO',
    GHANA: 'GHA',
    PANAMÁ: 'PAN',
    UZBEKISTÁN: 'UZB',
    COLOMBIA: 'COL',
  };
  return map[esName.toUpperCase()] || esName.slice(0, 3).toUpperCase();
}

export { ES_TO_EN };
