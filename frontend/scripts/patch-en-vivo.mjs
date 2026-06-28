import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const apiBase = (process.env.VITE_API_URL || '').replace(/\/$/, '');
const proxyMeta = apiBase
  ? `<meta name="tobis-stream-proxy-base" content="${apiBase}/api">`
  : null;

const targets = [
  join(process.cwd(), 'public', 'en-vivo.html'),
  join(process.cwd(), 'dist', 'en-vivo.html'),
  join(process.cwd(), 'index.html'),
  join(process.cwd(), 'dist', 'index.html'),
];

for (const filePath of targets) {
  try {
    let html = readFileSync(filePath, 'utf8');

    if (proxyMeta) {
      html = html.replace(
        '<meta name="tobis-stream-proxy-base" content="">',
        proxyMeta
      );
    }

    writeFileSync(filePath, html);
    console.log(`✓ stream proxy meta → ${filePath}`);
  } catch (error) {
    if (filePath.includes('dist') && error.code === 'ENOENT') {
      continue;
    }
    throw error;
  }
}
