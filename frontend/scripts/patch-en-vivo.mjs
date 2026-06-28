import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distPath = join(process.cwd(), 'dist', 'en-vivo.html');
const publicPath = join(process.cwd(), 'public', 'en-vivo.html');
const apiBase = (process.env.VITE_API_URL || '').replace(/\/$/, '');

for (const filePath of [publicPath, distPath]) {
  try {
    let html = readFileSync(filePath, 'utf8');

    if (apiBase) {
      html = html.replace(
        '<meta name="tobis-stream-proxy-base" content="">',
        `<meta name="tobis-stream-proxy-base" content="${apiBase}/api">`
      );
    }

    writeFileSync(filePath, html);
    console.log(`✓ stream proxy meta → ${filePath}`);
  } catch (error) {
    if (filePath === distPath && error.code === 'ENOENT') {
      continue;
    }
    throw error;
  }
}
