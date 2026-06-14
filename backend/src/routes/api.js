import { Router } from 'express';
import {
  filterMatchesByDate,
  filterMatchesByStatus,
  getCache,
  getFallbackScheduleMatches,
  refreshCache,
} from '../cache.js';
import { fetchStandings } from '../dataSource.js';
import {
  getMatchDetail,
  findMatchById,
  resolveMatchById,
} from '../services/matchDetailService.js';
import { updateWorldCupData } from '../services/worldCupSync.js';
import {
  clearLiveStreamCache,
  discoverLiveStream,
} from '../services/youtubeLiveDiscovery.js';
import { attachChannelsToMatches } from '../utils/channels.js';
import { enrichMatchFromDetail } from '../utils/matchEnrichment.js';
import { getTodayInTimezone } from '../utils/timezone.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tobalazo-backend' });
});

router.get('/worldcup/match/:id', async (req, res) => {
  try {
    const cache = getCache();
    let match = await resolveMatchById(req.params.id, cache.matches);

    if (!match) {
      const date = String(req.query.date || getTodayInTimezone());
      const payload = await refreshCache(() => updateWorldCupData(date));
      match = await resolveMatchById(req.params.id, payload.matches);
    }

    if (!match) {
      res.status(404).json({ message: 'Partido no encontrado' });
      return;
    }

    const detail = await getMatchDetail(match);
    const enrichedMatch = enrichMatchFromDetail(match, detail);
    res.json({
      match: enrichedMatch,
      detail,
      message: detail?.events?.length
        ? 'Seguimiento del partido disponible'
        : 'Datos del partido en preparación',
    });
  } catch {
    res.json({
      match: null,
      detail: { events: [], lineup: null, stats: null },
      message: 'Mostrando la última información disponible',
    });
  }
});

router.get('/worldcup/match/:id/live-stream', async (req, res) => {
  try {
    const cache = getCache();
    let match = await resolveMatchById(req.params.id, cache.matches);

    if (!match) {
      const date = String(req.query.date || getTodayInTimezone());
      const payload = await refreshCache(() => updateWorldCupData(date));
      match = await resolveMatchById(req.params.id, payload.matches);
    }

    if (!match) {
      res.status(404).json({
        status: 'unavailable',
        message: 'Partido no encontrado',
      });
      return;
    }

    if (req.query.refresh === '1') {
      clearLiveStreamCache(match.id);
    }

    const stream = await discoverLiveStream(match);
    res.json(stream);
  } catch {
    res.json({
      status: 'searching',
      embedUrl: null,
      videoId: null,
      title: null,
      message: 'Error al buscar transmisión',
      refreshedAt: new Date().toISOString(),
    });
  }
});

router.get('/worldcup/today', async (req, res) => {
  const date = String(req.query.date || getTodayInTimezone());
  try {
    const payload = await refreshCache(() => updateWorldCupData(date));
    const allMatches = payload.allMatches || payload.matches;
    const dateMatches = filterMatchesByDate(allMatches, date);

    res.json({
      matches: attachChannelsToMatches(dateMatches),
      allMatches: attachChannelsToMatches(allMatches),
      totalInSchedule: allMatches.length,
      lastUpdatedAt: payload.lastUpdatedAt,
      source: payload.source,
      apiBudget: payload.apiBudget,
      recommendedRefreshSeconds: payload.recommendedRefreshSeconds,
      message: payload.message,
      budgetExhausted: payload.budgetExhausted,
    });
  } catch {
    const cache = getCache();
    const allMatches = cache.matches?.length
      ? cache.matches
      : await getFallbackScheduleMatches();
    const dateMatches = filterMatchesByDate(allMatches, date);

    res.json({
      matches: attachChannelsToMatches(dateMatches),
      allMatches: attachChannelsToMatches(allMatches),
      totalInSchedule: allMatches.length,
      lastUpdatedAt: cache.lastUpdated,
      source: 'cache',
      apiBudget: cache.apiBudget || { limit: 100, usedToday: 0, remainingToday: 100 },
      recommendedRefreshSeconds: cache.recommendedRefreshSeconds || 300,
      message: cache.message || 'Mostrando la última actualización disponible',
      budgetExhausted: cache.budgetExhausted || false,
    });
  }
});

router.get('/matches', (req, res) => {
  const date = req.query.date ? String(req.query.date) : getTodayInTimezone();
  const { status } = req.query;
  const cache = getCache();

  let matches = cache.matches;
  if (date) matches = filterMatchesByDate(matches, date);
  if (status) matches = filterMatchesByStatus(matches, String(status));

  res.json({
    matches: attachChannelsToMatches(matches),
    meta: {
      total: cache.matches.length,
      filtered: matches.length,
      lastUpdated: cache.lastUpdated,
      source: cache.source,
      stale: cache.stale,
      lastError: cache.lastError,
      apiBudget: cache.apiBudget,
      recommendedRefreshSeconds: cache.recommendedRefreshSeconds,
      message: cache.message,
      budgetExhausted: cache.budgetExhausted,
    },
  });
});

router.get('/standings', async (_req, res) => {
  try {
    const standings = await fetchStandings();
    if (!standings) {
      res.status(503).json({ error: 'Standings no disponibles' });
      return;
    }
    res.json({ standings, generatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.get('/streams', (_req, res) => {
  res.json({
    official: [
      {
        id: 'vix',
        name: 'ViX Deportes',
        description: 'Señal oficial en México (gratis con registro).',
        url: 'https://vix.com/es-es/deportes',
        color: '#FF6B00',
      },
      {
        id: 'azteca',
        name: 'TV Azteca Deportes',
        description: 'Transmisión en señal abierta y streaming web.',
        url: 'https://www.tvazteca.com/azteca7/en-vivo',
        color: '#00A651',
      },
      {
        id: 'canal5',
        name: 'Canal 5',
        description: 'Partidos seleccionados del Mundial en México.',
        url: 'https://www.canal5.com.mx/envivo',
        color: '#005BBB',
      },
      {
        id: 'telemundo',
        name: 'Telemundo / Peacock',
        description: 'Cobertura oficial en Estados Unidos.',
        url: 'https://www.telemundo.com/deportes/mundial',
        color: '#6A0DAD',
      },
      {
        id: 'fifa-plus',
        name: 'FIFA+',
        description: 'Contenido oficial, highlights y partidos seleccionados.',
        url: 'https://www.fifa.com/fifaplus/es',
        color: '#326295',
      },
    ],
  });
});

export default router;
