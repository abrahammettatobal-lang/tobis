export const STREAM_IFRAME_ALLOW =
  'autoplay; encrypted-media; fullscreen; picture-in-picture';

export const STREAM_ALLOWED_HOSTS = ['stream-xhd.com', 'www.stream-xhd.com'];

export function isAllowedStreamHost(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && STREAM_ALLOWED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export const GAD_DEFAULT_STREAM =
  'https://stream-xhd.com/live1.php?stream=dsports';

export const GAD_STREAM_OPTIONS = [
  { id: 's1', label: 'Señal 1', url: 'https://stream-xhd.com/live1.php?stream=dsports' },
  { id: 's2', label: 'Señal 2', url: 'https://stream-xhd.com/live1.php?stream=dsports&op=2' },
  { id: 's3', label: 'Señal 3', url: 'https://stream-xhd.com/live1.php?stream=dsports&op=3' },
  { id: 's4', label: 'Señal 4', url: 'https://stream-xhd.com/live1.php?stream=dsports&op=4' },
  { id: 's5', label: 'Señal 5', url: 'https://stream-xhd.com/live1.php?stream=dsports&op=5' },
  { id: 's6', label: 'Señal 6', url: 'https://stream-xhd.com/live1.php?stream=dsports&op=6' },
  { id: 'p2s1', label: 'Partido 2 – S1', url: 'https://stream-xhd.com/live1.php?stream=dsports2' },
  { id: 'p2s2', label: 'Partido 2 – S2', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=2' },
  { id: 'p2s3', label: 'Partido 2 – S3', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=3' },
  { id: 'p2s4', label: 'Partido 2 – S4', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=4' },
  { id: 'p2s5', label: 'Partido 2 – S5', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=5' },
  { id: 'p2s6', label: 'Partido 2 – S6', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=6' },
  { id: 'p2s7', label: 'Partido 2 – S7', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=7' },
  { id: 'p2s8', label: 'Partido 2 – S8', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=8' },
  { id: 'p2s9', label: 'Partido 2 – S9', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=9' },
  { id: 'p2s10', label: 'Partido 2 – S10', url: 'https://stream-xhd.com/live1.php?stream=dsports2&op=10' },
  { id: 'p3s1', label: 'Partido 3 – S1', url: 'https://stream-xhd.com/live1.php?stream=dsports3' },
  { id: 'p3s2', label: 'Partido 3 – S2', url: 'https://stream-xhd.com/live1.php?stream=dsports3&op=2' },
  { id: 'p3s3', label: 'Partido 3 – S3', url: 'https://stream-xhd.com/live1.php?stream=dsports3&op=3' },
  { id: 'p3s4', label: 'Partido 3 – S4', url: 'https://stream-xhd.com/live1.php?stream=dsports3&op=4' },
];

export { OPENFOOTBALL_WC_URL } from '../services/openfootball.js';
