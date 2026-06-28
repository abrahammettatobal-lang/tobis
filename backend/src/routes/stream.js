import { Router } from 'express';
import {
  fetchStreamEmbed,
  isAllowedStreamTarget,
} from '../services/streamEmbedProxy.js';

const router = Router();

router.get('/embed', async (req, res) => {
  const target = String(req.query.target || req.query.url || '').trim();

  if (!target || !isAllowedStreamTarget(target)) {
    res.status(400).send('URL de stream no permitida');
    return;
  }

  try {
    const html = await fetchStreamEmbed(target);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(html);
  } catch (error) {
    console.warn('[stream/embed]', error.message);
    res.status(502).send('No se pudo cargar la señal');
  }
});

export default router;
