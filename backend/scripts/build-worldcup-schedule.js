import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildYoutubeQuery, getFlagUrl, slugifyTeam } from '../src/utils/teams.js';
import { spanishAbbr, teamNameToEnglish } from '../src/utils/teamNamesEs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '../data/worldcup-schedule.json');
const TZ = '-06:00';

const RAW = [
  ['2026-06-11', '14:00', 1, 'A', 'MÉXICO', 'SUDÁFRICA'],
  ['2026-06-11', '21:00', 1, 'A', 'COREA DEL SUR', 'REP. CHECA'],
  ['2026-06-12', '14:00', 1, 'B', 'CANADÁ', 'BOSNIA'],
  ['2026-06-12', '20:00', 1, 'D', 'ESTADOS UNIDOS', 'PARAGUAY'],
  ['2026-06-13', '14:00', 1, 'B', 'QATAR', 'SUIZA'],
  ['2026-06-13', '17:00', 1, 'C', 'BRASIL', 'MARRUECOS'],
  ['2026-06-13', '20:00', 1, 'C', 'HAITÍ', 'ESCOCIA'],
  ['2026-06-13', '23:00', 1, 'D', 'AUSTRALIA', 'TURQUIA'],
  ['2026-06-14', '12:00', 1, 'E', 'ALEMANIA', 'CURAZAO'],
  ['2026-06-14', '15:00', 1, 'F', 'PAÍSES BAJOS', 'JAPÓN'],
  ['2026-06-14', '18:00', 1, 'E', 'COSTA DE MARFIL', 'ECUADOR'],
  ['2026-06-14', '21:00', 1, 'F', 'SUECIA', 'TÚNEZ'],
  ['2026-06-15', '11:00', 1, 'H', 'ESPAÑA', 'CABO VERDE'],
  ['2026-06-15', '14:00', 1, 'G', 'BÉLGICA', 'EGIPTO'],
  ['2026-06-15', '17:00', 1, 'H', 'ARABIA SAUDITA', 'URUGUAY'],
  ['2026-06-15', '20:00', 1, 'G', 'IRÁN', 'NUEVA ZELANDA'],
  ['2026-06-16', '14:00', 1, 'I', 'FRANCIA', 'SENEGAL'],
  ['2026-06-16', '17:00', 1, 'I', 'IRAK', 'NORUEGA'],
  ['2026-06-16', '20:00', 1, 'J', 'ARGENTINA', 'ARGELIA'],
  ['2026-06-16', '23:00', 1, 'J', 'AUSTRIA', 'JORDANIA'],
  ['2026-06-17', '12:00', 1, 'K', 'PORTUGAL', 'RD CONGO'],
  ['2026-06-17', '15:00', 1, 'L', 'INGLATERRA', 'CROACIA'],
  ['2026-06-17', '18:00', 1, 'L', 'GHANA', 'PANAMÁ'],
  ['2026-06-17', '21:00', 1, 'K', 'UZBEKISTÁN', 'COLOMBIA'],
  ['2026-06-18', '11:00', 2, 'A', 'SUDÁFRICA', 'REP. CHECA'],
  ['2026-06-18', '14:00', 2, 'B', 'BOSNIA', 'SUIZA'],
  ['2026-06-18', '17:00', 2, 'B', 'CANADÁ', 'QATAR'],
  ['2026-06-18', '20:00', 2, 'A', 'MÉXICO', 'COREA DEL SUR'],
  ['2026-06-19', '14:00', 2, 'D', 'ESTADOS UNIDOS', 'AUSTRALIA'],
  ['2026-06-19', '17:00', 2, 'C', 'ESCOCIA', 'MARRUECOS'],
  ['2026-06-19', '19:30', 2, 'C', 'BRASIL', 'HAITÍ'],
  ['2026-06-19', '22:00', 2, 'D', 'TURQUIA', 'PARAGUAY'],
  ['2026-06-20', '12:00', 2, 'F', 'PAÍSES BAJOS', 'SUECIA'],
  ['2026-06-20', '15:00', 2, 'E', 'ALEMANIA', 'COSTA DE MARFIL'],
  ['2026-06-20', '19:00', 2, 'E', 'ECUADOR', 'CURAZAO'],
  ['2026-06-20', '23:00', 2, 'F', 'TÚNEZ', 'JAPÓN'],
  ['2026-06-21', '11:00', 2, 'H', 'ESPAÑA', 'ARABIA SAUDITA'],
  ['2026-06-21', '14:00', 2, 'G', 'BÉLGICA', 'IRÁN'],
  ['2026-06-21', '17:00', 2, 'H', 'URUGUAY', 'CABO VERDE'],
  ['2026-06-21', '20:00', 2, 'G', 'NUEVA ZELANDA', 'EGIPTO'],
  ['2026-06-22', '12:00', 2, 'J', 'ARGENTINA', 'AUSTRIA'],
  ['2026-06-22', '16:00', 2, 'I', 'FRANCIA', 'IRAK'],
  ['2026-06-22', '19:00', 2, 'I', 'NORUEGA', 'SENEGAL'],
  ['2026-06-22', '22:00', 2, 'J', 'JORDANIA', 'ARGELIA'],
  ['2026-06-23', '12:00', 2, 'K', 'PORTUGAL', 'UZBEKISTÁN'],
  ['2026-06-23', '15:00', 2, 'L', 'INGLATERRA', 'GHANA'],
  ['2026-06-23', '18:00', 2, 'K', 'PANAMÁ', 'CROACIA'],
  ['2026-06-23', '21:00', 2, 'K', 'COLOMBIA', 'RD CONGO'],
  ['2026-06-24', '14:00', 3, 'B', 'SUIZA', 'CANADÁ'],
  ['2026-06-24', '14:00', 3, 'B', 'BOSNIA', 'QATAR'],
  ['2026-06-24', '17:00', 3, 'C', 'ESCOCIA', 'BRASIL'],
  ['2026-06-24', '17:00', 3, 'C', 'MARRUECOS', 'HAITÍ'],
  ['2026-06-24', '20:00', 3, 'A', 'REP. CHECA', 'MÉXICO'],
  ['2026-06-24', '20:00', 3, 'A', 'SUDÁFRICA', 'COREA DEL SUR'],
  ['2026-06-25', '15:00', 3, 'E', 'ECUADOR', 'ALEMANIA'],
  ['2026-06-25', '15:00', 3, 'E', 'CURAZAO', 'COSTA DE MARFIL'],
  ['2026-06-25', '18:00', 3, 'F', 'TÚNEZ', 'PAÍSES BAJOS'],
  ['2026-06-25', '18:00', 3, 'F', 'JAPÓN', 'SUECIA'],
  ['2026-06-25', '21:00', 3, 'D', 'TURQUIA', 'ESTADOS UNIDOS'],
  ['2026-06-25', '21:00', 3, 'D', 'PARAGUAY', 'AUSTRALIA'],
  ['2026-06-26', '14:00', 3, 'I', 'NORUEGA', 'FRANCIA'],
  ['2026-06-26', '14:00', 3, 'I', 'SENEGAL', 'IRAK'],
  ['2026-06-26', '19:00', 3, 'H', 'URUGUAY', 'ESPAÑA'],
  ['2026-06-26', '19:00', 3, 'H', 'CABO VERDE', 'ARABIA SAUDITA'],
  ['2026-06-26', '22:00', 3, 'G', 'NUEVA ZELANDA', 'BÉLGICA'],
  ['2026-06-26', '22:00', 3, 'G', 'EGIPTO', 'IRÁN'],
  ['2026-06-27', '16:00', 3, 'L', 'PANAMÁ', 'INGLATERRA'],
  ['2026-06-27', '16:00', 3, 'L', 'CROACIA', 'GHANA'],
  ['2026-06-27', '18:30', 3, 'K', 'COLOMBIA', 'PORTUGAL'],
  ['2026-06-27', '18:30', 3, 'K', 'RD CONGO', 'UZBEKISTÁN'],
  ['2026-06-27', '21:00', 3, 'J', 'JORDANIA', 'ARGENTINA'],
  ['2026-06-27', '21:00', 3, 'J', 'ARGELIA', 'AUSTRIA'],
];

function titleCaseTeam(name) {
  const lowerWords = new Set(['de', 'del', 'y', 'la', 'los', 'las']);

  return name
    .split(' ')
    .map((part, index) => {
      if (part.length <= 3 && part.includes('.')) return part.toUpperCase();
      if (index > 0 && lowerWords.has(part.toLowerCase())) return part.toLowerCase();
      return part.charAt(0) + part.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/^Rd congo$/i, 'RD Congo')
    .replace(/^Rep\. checa$/i, 'Rep. Checa')
    .replace(/^México$/i, 'México')
    .replace(/^Sudáfrica$/i, 'Sudáfrica')
    .replace(/^Canadá$/i, 'Canadá')
    .replace(/^Haití$/i, 'Haití')
    .replace(/^Turquia$/i, 'Turquia')
    .replace(/^Túnez$/i, 'Túnez')
    .replace(/^España$/i, 'España')
    .replace(/^Bélgica$/i, 'Bélgica')
    .replace(/^Irán$/i, 'Irán')
    .replace(/^Panamá$/i, 'Panamá')
    .replace(/^Uzbequistán$/i, 'Uzbekistán');
}

function buildMatch(id, kickoffDate, clock, matchday, group, homeRaw, awayRaw) {
  const homeEs = titleCaseTeam(homeRaw);
  const awayEs = titleCaseTeam(awayRaw);
  const homeEn = teamNameToEnglish(homeEs);
  const awayEn = teamNameToEnglish(awayEs);
  const kickoffTime = `${kickoffDate}T${clock}:00${TZ}`;

  return {
    id: String(id),
    teamA: {
      name: homeEs,
      nameEn: homeEn,
      abbr: spanishAbbr(homeEs),
      goals: 0,
      flag: getFlagUrl(homeEn),
      badgeUrl: getFlagUrl(homeEn),
    },
    teamB: {
      name: awayEs,
      nameEn: awayEn,
      abbr: spanishAbbr(awayEs),
      goals: 0,
      flag: getFlagUrl(awayEn),
      badgeUrl: getFlagUrl(awayEn),
    },
    minute: null,
    status: 'Por empezar',
    kickoffTime,
    kickoffDate,
    group,
    matchday: Number(matchday),
    stage: `Grupo ${group} · Jornada ${matchday}`,
    venue: '',
    youtubeQuery: buildYoutubeQuery(homeEs, awayEs),
    livescoreUrl: `https://www.livescore.com/en/football/international/world-cup-2026/${slugifyTeam(homeEn)}-vs-${slugifyTeam(awayEn)}/`,
    scheduleSource: 'pdf',
  };
}

async function main() {
  const matches = RAW.map((row, index) =>
    buildMatch(index + 1, row[0], row[1], row[2], row[3], row[4], row[5])
  );

  const payload = {
    matches,
    updatedAt: new Date().toISOString(),
    source: 'pdf-calendario-fifa-2026',
    timezone: 'America/Mexico_City',
    referenceFile: 'Calendario-Copa-Mundial-de-la-FIFA-2026-Tabloide-4.pdf',
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`Generados ${matches.length} partidos -> ${OUT_PATH}`);
}

main();
