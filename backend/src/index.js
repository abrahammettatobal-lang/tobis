import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { getCache, hydrateMemoryFromDisk, refreshCache } from './cache.js';
import apiRoutes from './routes/api.js';
import streamRoutes from './routes/stream.js';
import { updateWorldCupData } from './services/worldCupSync.js';
import { buildCorsOptions } from './utils/corsOptions.js';
import { getTodayInTimezone } from './utils/timezone.js';

const app = express();
const PORT = process.env.PORT || 3001;
const LIVESCORE_LOCALE = process.env.LIVESCORE_LOCALE || 'en';

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use('/api', apiRoutes);
app.use('/api/stream', streamRoutes);

app.use((error, _req, res, _next) => {
  console.error('[backend]', error);
  res.status(500).json({ message: 'Error interno del servidor' });
});

let schedulerTimer = null;

async function runSyncCycle(date = getTodayInTimezone()) {
  try {
    const result = await refreshCache(() => updateWorldCupData(date, LIVESCORE_LOCALE));
    const stamp = result.lastUpdated || new Date().toISOString();
    console.log(
      `[${stamp}] Sync · ${result.matches.length} partidos · fuente=${result.source} · API ${result.apiBudget?.usedToday}/${result.apiBudget?.limit} · refresh=${result.recommendedRefreshSeconds}s`
    );
    scheduleNext(result.recommendedRefreshSeconds || 300);
    return result;
  } catch (error) {
    console.error('[sync] Error:', error.message);
    scheduleNext(300);
    return null;
  }
}

function scheduleNext(seconds) {
  if (schedulerTimer) clearTimeout(schedulerTimer);
  schedulerTimer = setTimeout(() => runSyncCycle(), seconds * 1000);
}

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', async () => {
    const host = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.FLY_APP_NAME
        ? `https://${process.env.FLY_APP_NAME}.fly.dev`
        : `http://localhost:${PORT}`;
    console.log(`Tobis backend escuchando en ${host}`);
    await hydrateMemoryFromDisk();
    runSyncCycle().catch((error) => {
      console.error('[sync] Error en ciclo inicial:', error.message);
    });
  });

  process.on('SIGTERM', () => {
    if (schedulerTimer) clearTimeout(schedulerTimer);
    console.log('Apagando backend...');
    process.exit(0);
  });
}

export { app, getCache, runSyncCycle };
export default app;
