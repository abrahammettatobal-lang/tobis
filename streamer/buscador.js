import TorrentSearchApi from 'torrent-search-api';
import WebTorrent from 'webtorrent';
import inquirer from 'inquirer';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOWNLOADS = path.join(__dirname, 'descargas');

process.on('uncaughtException', (err) => {
  if (!err.message.includes('reserve')) console.error(err);
});

TorrentSearchApi.enablePublicProviders();

async function searchTorrents(query) {
  const variantes = [`${query} 2026`, `${query} World Cup`, query];
  let results = [];

  for (const variant of variantes) {
    process.stdout.write(`   Buscando "${variant}"... `);
    const temp = await TorrentSearchApi.search(variant, 'All', 20);
    if (temp.length > 0) {
      results = temp;
      console.log('OK');
      break;
    }
    console.log('sin resultados');
  }

  return results
    .filter((t) => t.seeds !== undefined)
    .sort((a, b) => parseInt(b.seeds, 10) - parseInt(a.seeds, 10))
    .slice(0, 10);
}

async function startStream(torrentMeta) {
  await fs.promises.mkdir(DOWNLOADS, { recursive: true });

  console.log('\nConectando a la red P2P...');
  const magnet = await TorrentSearchApi.getMagnet(torrentMeta);
  const client = new WebTorrent();

  client.add(magnet, { path: DOWNLOADS }, (torrent) => {
    const file = torrent.files.find((f) => f.name.match(/\.(mp4|mkv|avi|webm)$/i));
    if (!file) {
      console.log('No se encontro archivo de video en el torrent.');
      client.destroy();
      return;
    }

    const server = torrent.createServer();
    server.listen(8080, () => {
      console.log('\nSTREAMING INICIADO');
      console.log('URL: http://localhost:8080/0');
      open('http://localhost:8080/0');
    });

    setInterval(() => {
      const percent = (torrent.progress * 100).toFixed(1);
      const speed = (torrent.downloadSpeed / 1048576).toFixed(2);
      process.stdout.write(
        `\rDescargando: ${percent}% | ${speed} MB/s | Peers: ${torrent.numPeers}   `
      );
    }, 1000);
  });
}

async function menu() {
  console.clear();
  console.log('==============================================');
  console.log('   MUNDIAL 2026 - STREAMER PRO (TOBIS)       ');
  console.log('==============================================\n');

  const { modo } = await inquirer.prompt([
    {
      type: 'select',
      name: 'modo',
      message: 'Que buscas?',
      choices: [
        { name: 'VER EN VIVO (Abrir senales)', value: 'LIVE' },
        { name: 'REPETICION (Stream P2P)', value: 'REPLAY' },
        { name: 'Salir', value: 'EXIT' },
      ],
    },
  ]);

  if (modo === 'EXIT') process.exit(0);

  if (modo === 'LIVE') {
    const { p } = await inquirer.prompt([
      { type: 'input', name: 'p', message: 'Nombre del partido:' },
    ]);
    await open(
      `https://www.google.com/search?q=${encodeURIComponent(`${p} en vivo gratis online`)}`
    );
    process.exit(0);
  }

  const { q } = await inquirer.prompt([
    { type: 'input', name: 'q', message: 'Equipos (ej: Mexico Sudafrica):' },
  ]);

  console.log('\nBuscando en trackers...');
  const filtrados = await searchTorrents(q);

  if (filtrados.length === 0) {
    console.log('\nNo hay fuentes para este partido aun.');
    console.log('Tip: prueba nombres cortos o espera si el partido acaba de terminar.');
    process.exit(0);
  }

  const { sel } = await inquirer.prompt([
    {
      type: 'select',
      name: 'sel',
      message: 'Elige una fuente (S = Semillas):',
      choices: filtrados.map((t) => ({
        name: `[S:${t.seeds}] ${t.title.substring(0, 60)} (${t.size})`,
        value: t,
      })),
    },
  ]);

  await startStream(sel);
}

menu();
