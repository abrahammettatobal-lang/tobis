import {
  fetchStreamEmbed,
  isAllowedStreamTarget,
} from '../../lib/streamEmbedProxy.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

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
    res.status(200).send(html);
  } catch (error) {
    console.warn('[api/stream/embed]', error?.message || error);
    res.status(502).send('No se pudo cargar la señal');
  }
}
