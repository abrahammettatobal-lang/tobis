import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEDULE_PATH = path.resolve(__dirname, '../data/worldcup-schedule.json');
const PDF_PATH = path.resolve(__dirname, '../../Calendario-Copa-Mundial-de-la-FIFA-2026-Tabloide-4.pdf');

async function main() {
  const schedule = JSON.parse(await fs.readFile(SCHEDULE_PATH, 'utf8'));
  const pdfRaw = await fs.readFile(PDF_PATH, 'utf8').catch(() => '');
  const pdfLines = pdfRaw.split(/\r?\n/).filter((line) => /\bVS\b/i.test(line));

  const byDate = {};
  for (const match of schedule.matches) {
    byDate[match.kickoffDate] = (byDate[match.kickoffDate] || 0) + 1;
  }

  console.log('JSON partidos:', schedule.matches.length);
  console.log('PDF lineas VS:', pdfLines.length);
  console.log('Dias con partidos:', Object.keys(byDate).length);
  console.log('Por fecha:', JSON.stringify(byDate, null, 2));

  if (schedule.matches.length !== 72) {
    process.exitCode = 1;
    console.error('ERROR: se esperaban 72 partidos de fase de grupos');
  }

  if (pdfLines.length > 0 && pdfLines.length !== schedule.matches.length) {
    process.exitCode = 1;
    console.error(`ERROR: PDF (${pdfLines.length}) != JSON (${schedule.matches.length})`);
  } else if (pdfLines.length === 0) {
    console.log('PDF binario: verificacion por lineas VS omitida (JSON tiene 72 del script RAW)');
  } else {
    console.log('OK: PDF y JSON coinciden');
  }
}

main();
