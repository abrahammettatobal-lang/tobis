/**
 * Genera iconos PNG para PWA y Capacitor desde public/tobis-color.svg
 * Uso: node scripts/generate-icons.mjs
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'tobis-color.svg');
const svg = await readFile(svgPath);

const outputs = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/icons/apple-touch-icon.png', size: 180 },
  { file: 'public/icons/icon-96.png', size: 96 },
  { file: 'assets/icon.png', size: 1024 },
  { file: 'assets/splash.png', size: 2732, splash: true },
];

for (const item of outputs) {
  const out = path.join(root, item.file);
  await mkdir(path.dirname(out), { recursive: true });

  if (item.splash) {
    const logo = await sharp(svg).resize(420, 420).png().toBuffer();
    await sharp({
      create: {
        width: item.size,
        height: item.size,
        channels: 4,
        background: '#121212',
      },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(out);
  } else {
    await sharp(svg).resize(item.size, item.size).png().toFile(out);
  }

  console.log('✓', item.file);
}

console.log('\nIconos listos. Ejecuta: npm run cap:assets');
