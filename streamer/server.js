import cors from 'cors';
import express from 'express';
import { buildCorsOptions } from './src/utils/corsOptions.js';
import {
  buildTorrentSearchVariants,
  scoreTorrentForMode,
} from './src/searchQueries.js';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import rangeParser from 'range-parser';
import TorrentSearchApi from 'torrent-search-api';
import WebTorrent from 'webtorrent';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_CLOUD = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
    process.env.FLY_APP_NAME ||
    process.env.RENDER ||
    process.env.VERCEL
);
const IS_VERCEL = Boolean(process.env.VERCEL);
const DOWNLOADS = IS_CLOUD
  ? path.join('/tmp', 'tobis-descargas')
  : path.join(__dirname, 'descargas');
const API_PORT = Number(process.env.PORT || process.env.STREAMER_PORT || 8091);
const PLAY_TIMEOUT_MS = 90000;

process.on('uncaughtException', (err) => {
  if (!err.message.includes('reserve')) console.error(err);
});

TorrentSearchApi.enablePublicProviders();

const app = express();
app.use(cors(buildCorsOptions()));
app.use(express.json());

const torrentCache = new Map();
let cacheCounter = 0;

let client = null;
let activeTorrent = null;
let activeVideoFile = null;
let activeTranscodeProcess = null;
let streamState = {
  status: 'idle',
  title: null,
  progress: 0,
  downloadSpeed: 0,
  numPeers: 0,
  streamUrl: null,
  audioMode: null,
  error: null,
};

function scoreTorrentTitle(title, mode = 'replay') {
  return scoreTorrentForMode(title, mode);
}

function scoreVideoFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.mp4')) return 100;
  if (name.endsWith('.m4v')) return 90;
  if (name.endsWith('.webm')) return 80;
  if (name.endsWith('.ts')) return 60;
  if (name.endsWith('.avi')) return 40;
  if (name.endsWith('.mkv')) return 30;
  return 10;
}

function findVideoFile(torrent) {
  const videoFiles = torrent.files.filter((f) => /\.(mp4|mkv|avi|webm|ts|m4v)$/i.test(f.name));
  if (!videoFiles.length) return null;
  return videoFiles.sort((a, b) => scoreVideoFile(b) - scoreVideoFile(a))[0];
}

function needsTranscode(file) {
  const name = file.name.toLowerCase();
  if (/\.(mkv|avi|ts|wmv|flv)$/.test(name)) return true;
  if (/\.(mp4|m4v|webm)$/.test(name) && /\b(ac3|dts|eac3|truehd|dtshd)\b/.test(name)) {
    return true;
  }
  return false;
}

function killTranscode() {
  if (!activeTranscodeProcess) return;
  try {
    activeTranscodeProcess.kill('SIGKILL');
  } catch {
    /* ignore */
  }
  activeTranscodeProcess = null;
}

function resetStream() {
  killTranscode();
  activeVideoFile = null;
  activeTorrent = null;
  if (client) {
    try {
      client.destroy();
    } catch {
      /* ignore */
    }
    client = null;
  }
}

function cacheTorrent(torrent) {
  const id = String(++cacheCounter);
  torrentCache.set(id, torrent);
  if (torrentCache.size > 30) {
    const first = torrentCache.keys().next().value;
    torrentCache.delete(first);
  }
  return id;
}

function isUsableTorrent(torrent) {
  const title = String(torrent?.title || '').trim();
  if (!title || /no results returned/i.test(title)) return false;
  const seeds = Number.parseInt(torrent.seeds, 10);
  return Number.isFinite(seeds) && seeds > 0;
}

const SEARCH_VARIANT_LIMIT = 5;
const SEARCH_VARIANT_TIMEOUT_MS = 28_000;
const SEARCH_BATCH_SIZE = 2;

function searchWithTimeout(variant, timeoutMs = SEARCH_VARIANT_TIMEOUT_MS) {
  return Promise.race([
    TorrentSearchApi.search(variant, 'All', 20),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('search_timeout')), timeoutMs);
    }),
  ]);
}

function collectTorrents(merged, results = []) {
  for (const torrent of results.filter(isUsableTorrent)) {
    const key = String(torrent.title || '').toLowerCase();
    if (!key || merged.has(key)) continue;
    merged.set(key, torrent);
  }
}

async function runVariantSearch(context, mode) {
  const variants = buildTorrentSearchVariants({ ...context, mode }).slice(0, SEARCH_VARIANT_LIMIT);
  const merged = new Map();
  const home = context.home || '';
  const away = context.away || '';
  const group = context.group || '';

  if (home && away) {
    try {
      const broad = await searchWithTimeout(
        `FIFA World Cup 2026 Group ${group} ${home} ${away}`.trim()
      );
      collectTorrents(merged, broad);
    } catch {
      /* siguiente intento */
    }
  }

  if (merged.size >= 4) return merged;

  for (let index = 0; index < variants.length; index += SEARCH_BATCH_SIZE) {
    const batch = variants.slice(index, index + SEARCH_BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map((variant) => searchWithTimeout(variant)));

    for (const outcome of settled) {
      if (outcome.status !== 'fulfilled') continue;
      collectTorrents(merged, outcome.value);
    }

    if (merged.size >= 4) break;
  }

  return merged;
}

async function searchTorrents(context = {}) {
  const mode = context.mode === 'live' ? 'live' : 'replay';
  let merged = await runVariantSearch(context, mode);

  if (!merged.size && mode === 'live') {
    merged = await runVariantSearch(context, 'replay');
  }

  return [...merged.values()]
    .sort((a, b) => {
      const scoreDiff = scoreTorrentTitle(b.title, mode) - scoreTorrentTitle(a.title, mode);
      if (scoreDiff !== 0) return scoreDiff;
      return parseInt(b.seeds, 10) - parseInt(a.seeds, 10);
    })
    .slice(0, 12)
    .map((t) => ({
      id: cacheTorrent(t),
      title: t.title,
      size: t.size,
      seeds: t.seeds,
      provider: t.provider,
    }));
}

function pipeDirectVideo(req, res, file) {
  const fileSize = file.length;
  const contentType = file.type || 'application/octet-stream';
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const ranges = rangeParser(fileSize, rangeHeader);
    if (ranges === -1) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      return;
    }
    if (ranges === -2 || !Array.isArray(ranges) || !ranges.length) {
      res.status(400).end();
      return;
    }

    const { start, end } = ranges[0];
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    });
    file.createReadStream({ start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  });
  file.createReadStream().pipe(res);
}

function pipeTranscodedVideo(req, res, file) {
  if (!ffmpegPath) {
    res.status(503).json({
      message: 'Transcodificacion de audio no disponible. Prueba una fuente MP4.',
    });
    return;
  }

  killTranscode();

  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Transfer-Encoding': 'chunked',
  });

  const ff = spawn(ffmpegPath, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    'pipe:0',
    '-map',
    '0:v:0?',
    '-map',
    '0:a:0?',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ac',
    '2',
    '-movflags',
    'frag_keyframe+empty_moov+default_base_moof',
    '-f',
    'mp4',
    'pipe:1',
  ]);

  activeTranscodeProcess = ff;

  ff.stderr.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (line) console.error('[ffmpeg]', line);
  });

  ff.on('close', () => {
    if (activeTranscodeProcess === ff) activeTranscodeProcess = null;
  });

  req.on('close', () => {
    if (activeTranscodeProcess === ff) killTranscode();
  });

  file.createReadStream().pipe(ff.stdin);
  ff.stdout.pipe(res);

  ff.on('error', (err) => {
    console.error('[ffmpeg] error', err.message);
    if (!res.headersSent) {
      res.status(502).json({ message: 'Error al convertir audio' });
    } else {
      res.end();
    }
  });

  ff.stdin.on('error', () => {
    /* stream closed */
  });
}

async function startPlayback(torrentId) {
  const torrentMeta = torrentCache.get(String(torrentId));
  if (!torrentMeta) {
    throw new Error('Fuente expirada. Busca de nuevo.');
  }

  resetStream();
  await fs.promises.mkdir(DOWNLOADS, { recursive: true });

  streamState = {
    status: 'connecting',
    title: torrentMeta.title,
    progress: 0,
    downloadSpeed: 0,
    numPeers: 0,
    streamUrl: null,
    audioMode: null,
    error: null,
  };

  const magnet = await TorrentSearchApi.getMagnet(torrentMeta);
  client = new WebTorrent();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      streamState.status = 'error';
      streamState.error = 'Tiempo de espera agotado al conectar peers';
      resetStream();
      reject(new Error(streamState.error));
    }, PLAY_TIMEOUT_MS);

    client.add(magnet, { path: DOWNLOADS }, (torrent) => {
      activeTorrent = torrent;
      const file = findVideoFile(torrent);

      if (!file) {
        clearTimeout(timeout);
        streamState.status = 'error';
        streamState.error = 'No hay archivo de video en este torrent';
        resetStream();
        reject(new Error(streamState.error));
        return;
      }

      activeVideoFile = file;
      const transcode = needsTranscode(file);
      const streamUrl = transcode ? '/api/video?transcode=1' : '/api/video';
      const audioMode = transcode ? 'transcoded' : 'direct';

      const onReady = () => {
        clearTimeout(timeout);
        streamState = {
          status: 'streaming',
          title: torrentMeta.title,
          progress: torrent.progress,
          downloadSpeed: torrent.downloadSpeed,
          numPeers: torrent.numPeers,
          streamUrl,
          audioMode,
          error: null,
        };
        resolve({ streamUrl, title: torrentMeta.title, audioMode });
      };

      if (torrent.progress > 0 || torrent.numPeers > 0) {
        onReady();
      } else {
        torrent.on('download', () => {
          if (streamState.status === 'connecting') onReady();
        });
        torrent.on('wire', () => {
          if (streamState.status === 'connecting') onReady();
        });
        setTimeout(onReady, 3000);
      }

      torrent.on('error', (err) => {
        streamState.status = 'error';
        streamState.error = err.message;
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      streamState.status = 'error';
      streamState.error = err.message;
      reject(err);
    });
  });
}

setInterval(() => {
  if (!activeTorrent) return;
  streamState.progress = activeTorrent.progress;
  streamState.downloadSpeed = activeTorrent.downloadSpeed;
  streamState.numPeers = activeTorrent.numPeers;
}, 1000);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tobis-streamer', ffmpeg: Boolean(ffmpegPath) });
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const mode = String(req.query.mode || 'replay');
  const home = String(req.query.home || '').trim();
  const away = String(req.query.away || '').trim();

  if (!query && !(home && away)) {
    res.status(400).json({ message: 'Falta parametro q o home/away' });
    return;
  }

  try {
    const results = await searchTorrents({
      query,
      mode,
      home,
      away,
      abbrHome: String(req.query.abbrHome || '').trim(),
      abbrAway: String(req.query.abbrAway || '').trim(),
      group: String(req.query.group || '').trim(),
    });
    res.json({ results, mode, strategy: mode === 'live' ? 'live+hdtv' : 'replay' });
  } catch (error) {
    res.status(502).json({ message: 'Error al buscar', error: error.message });
  }
});

app.post('/api/play', async (req, res) => {
  let torrentId = req.body?.id ? String(req.body.id) : null;

  if (!torrentId && req.body?.meta) {
    torrentId = cacheTorrent(req.body.meta);
  }

  if (!torrentId) {
    res.status(400).json({ message: 'Falta id de la fuente. Busca de nuevo.' });
    return;
  }

  try {
    const payload = await startPlayback(torrentId);
    res.json(payload);
  } catch (error) {
    res.status(502).json({ message: error.message || 'No se pudo iniciar' });
  }
});

app.get('/api/status', (_req, res) => {
  res.json(streamState);
});

app.get('/api/video', (req, res) => {
  if (!activeVideoFile) {
    res.status(404).json({ message: 'No hay stream activo' });
    return;
  }

  const forceTranscode =
    req.query.transcode === '1' || needsTranscode(activeVideoFile);

  if (forceTranscode) {
    pipeTranscodedVideo(req, res, activeVideoFile);
    return;
  }

  pipeDirectVideo(req, res, activeVideoFile);
});

app.post('/api/stop', (_req, res) => {
  resetStream();
  streamState = {
    status: 'idle',
    title: null,
    progress: 0,
    downloadSpeed: 0,
    numPeers: 0,
    streamUrl: null,
    audioMode: null,
    error: null,
  };
  res.json({ ok: true });
});

if (!IS_VERCEL) {
  app.listen(API_PORT, '0.0.0.0', () => {
    const host = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.RENDER_EXTERNAL_URL
        ? process.env.RENDER_EXTERNAL_URL
        : process.env.FLY_APP_NAME
          ? `https://${process.env.FLY_APP_NAME}.fly.dev`
          : `http://localhost:${API_PORT}`;
    console.log(`Tobis streamer API en ${host}`);
    console.log(`FFmpeg: ${ffmpegPath ? 'disponible (audio MKV/AC3)' : 'no instalado'}`);
    console.log(`Descargas: ${DOWNLOADS}`);
  });

  process.on('SIGTERM', () => {
    resetStream();
    process.exit(0);
  });
}

export default app;
