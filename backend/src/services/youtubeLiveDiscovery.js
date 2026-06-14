import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildMatchChannels, buildYoutubeVideoUrl } from '../utils/channels.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const OEMBED_TIMEOUT_MS = 6_000;
const GEMINI_TIMEOUT_MS = 25_000;
const YOUTUBE_API_TIMEOUT_MS = 8_000;

const discoveryCache = new Map();
const inFlight = new Map();

const VIDEO_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/gi;

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function getYoutubeApiKey() {
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

export function isMatchLiveForStream(match) {
  if (!match) return false;
  if (match.status === 'En Vivo') return true;
  if (match.status === 'Por empezar') {
    const kickoff = new Date(match.kickoffTime || 0).getTime();
    return !Number.isNaN(kickoff) && kickoff <= Date.now();
  }
  return false;
}

function extractVideoIds(text = '') {
  const ids = new Set();
  for (const match of String(text).matchAll(VIDEO_ID_PATTERN)) {
    if (match[1]) ids.add(match[1]);
  }
  return [...ids];
}

function parseJsonFromText(text = '') {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function withTimeout(promise, ms, fallback) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function verifyOEmbed(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const response = await withTimeout(
      fetch(oembedUrl, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) }),
      OEMBED_TIMEOUT_MS,
      null
    );
    if (!response?.ok) return null;
    const data = await response.json();
    return {
      videoId,
      title: data.title || 'Transmisión en vivo',
      embedUrl: buildYoutubeVideoUrl(videoId),
    };
  } catch {
    return null;
  }
}

async function verifyYoutubeLive(videoId) {
  const apiKey = getYoutubeApiKey();
  if (!apiKey) return true;

  const params = new URLSearchParams({
    part: 'snippet,liveStreamingDetails',
    id: videoId,
    key: apiKey,
  });

  try {
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
        signal: AbortSignal.timeout(YOUTUBE_API_TIMEOUT_MS),
      }),
      YOUTUBE_API_TIMEOUT_MS,
      null
    );
    if (!response?.ok) return true;

    const payload = await response.json();
    const item = payload.items?.[0];
    if (!item) return false;

    const liveContent = item.snippet?.liveBroadcastContent;
    return liveContent === 'live' || liveContent === 'upcoming';
  } catch {
    return true;
  }
}

async function validateCandidate(videoId) {
  const oembed = await verifyOEmbed(videoId);
  if (!oembed) return null;

  const isLive = await verifyYoutubeLive(videoId);
  if (!isLive) return null;

  return oembed;
}

async function searchWithGemini(match) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const home = match.teamA?.name || 'Local';
  const away = match.teamB?.name || 'Visitante';
  const homeEn = match.teamA?.nameEn || home;
  const awayEn = match.teamB?.nameEn || away;
  const stage = match.stage || 'Mundial 2026';

  const prompt = `Busca en YouTube una transmisión EN VIVO (live stream) que esté transmitiendo AHORA el partido de fútbol:
${home} vs ${away} (${homeEn} vs ${awayEn})
Torneo: FIFA World Cup 2026 · ${stage}

Requisitos:
- Debe ser un directo LIVE actual, NO repetición, NO highlights grabados, NO resumen.
- Preferir relato en español (México/LATAM) o señal deportiva oficial en YouTube.
- Devuelve SOLO JSON válido sin markdown:
{"videoId":"11chars","title":"título del directo","confidence":"high|medium|low","reason":"por qué es el directo correcto","sourceUrl":"url completa del video"}

Si no encuentras un directo en vivo claro, devuelve:
{"videoId":null,"title":null,"confidence":"low","reason":"no live found","sourceUrl":null}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearch: {} }],
  });

  try {
    const result = await withTimeout(
      model.generateContent(prompt),
      GEMINI_TIMEOUT_MS,
      null
    );
    if (!result) return null;

    const text = result.response?.text?.() || '';
    const parsed = parseJsonFromText(text);
    const ids = new Set();

    if (parsed?.videoId && /^[A-Za-z0-9_-]{11}$/.test(parsed.videoId)) {
      ids.add(parsed.videoId);
    }
    if (parsed?.sourceUrl) {
      for (const id of extractVideoIds(parsed.sourceUrl)) ids.add(id);
    }
    for (const id of extractVideoIds(text)) ids.add(id);

    for (const videoId of ids) {
      const validated = await validateCandidate(videoId);
      if (validated) {
        return {
          ...validated,
          confidence: parsed?.confidence || 'medium',
          reason: parsed?.reason || 'Encontrado por búsqueda en vivo',
          source: 'gemini',
        };
      }
    }

    return null;
  } catch (error) {
    console.warn('[youtube-live] Gemini error:', error.message);
    return null;
  }
}

async function searchWithYoutubeApi(match) {
  const apiKey = getYoutubeApiKey();
  if (!apiKey) return null;

  const channels = buildMatchChannels(match);
  const query = channels[0]?.query || `mundial 2026 ${match.teamA?.name} vs ${match.teamB?.name} en vivo`;

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    eventType: 'live',
    q: query,
    maxResults: '5',
    key: apiKey,
  });

  try {
    const response = await withTimeout(
      fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        signal: AbortSignal.timeout(YOUTUBE_API_TIMEOUT_MS),
      }),
      YOUTUBE_API_TIMEOUT_MS,
      null
    );
    if (!response?.ok) return null;

    const payload = await response.json();
    for (const item of payload.items || []) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;

      const validated = await validateCandidate(videoId);
      if (validated) {
        return {
          ...validated,
          confidence: 'medium',
          reason: 'Directo encontrado por búsqueda en vivo',
          source: 'youtube-api',
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function discoverLiveStreamInternal(match) {
  if (!isMatchLiveForStream(match)) {
    return {
      status: 'unavailable',
      embedUrl: null,
      videoId: null,
      title: null,
      message: 'El partido no está en vivo',
      refreshedAt: new Date().toISOString(),
    };
  }

  if (!getGeminiApiKey() && !getYoutubeApiKey()) {
    return {
      status: 'unavailable',
      embedUrl: null,
      videoId: null,
      title: null,
      message: 'Transmisión en vivo no configurada',
      refreshedAt: new Date().toISOString(),
    };
  }

  const geminiResult = await searchWithGemini(match);
  if (geminiResult) {
    return {
      status: 'ready',
      embedUrl: geminiResult.embedUrl,
      videoId: geminiResult.videoId,
      title: geminiResult.title,
      confidence: geminiResult.confidence,
      reason: geminiResult.reason,
      source: geminiResult.source,
      refreshedAt: new Date().toISOString(),
    };
  }

  const youtubeResult = await searchWithYoutubeApi(match);
  if (youtubeResult) {
    return {
      status: 'ready',
      embedUrl: youtubeResult.embedUrl,
      videoId: youtubeResult.videoId,
      title: youtubeResult.title,
      confidence: youtubeResult.confidence,
      reason: youtubeResult.reason,
      source: youtubeResult.source,
      refreshedAt: new Date().toISOString(),
    };
  }

  return {
    status: 'searching',
    embedUrl: null,
    videoId: null,
    title: null,
    message: 'Sin señal disponible · reintentando',
    refreshedAt: new Date().toISOString(),
  };
}

export async function discoverLiveStream(match) {
  if (!match?.id) {
    return {
      status: 'unavailable',
      embedUrl: null,
      videoId: null,
      title: null,
      refreshedAt: new Date().toISOString(),
    };
  }

  const cacheKey = String(match.id);
  const cached = discoveryCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.payload;
  }

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const promise = discoverLiveStreamInternal(match)
    .then((payload) => {
      discoveryCache.set(cacheKey, { fetchedAt: Date.now(), payload });
      inFlight.delete(cacheKey);
      return payload;
    })
    .catch(() => {
      inFlight.delete(cacheKey);
      return {
        status: 'searching',
        embedUrl: null,
        videoId: null,
        title: null,
        message: 'Error al buscar transmisión',
        refreshedAt: new Date().toISOString(),
      };
    });

  inFlight.set(cacheKey, promise);
  return promise;
}

export function clearLiveStreamCache(matchId) {
  discoveryCache.delete(String(matchId));
}
