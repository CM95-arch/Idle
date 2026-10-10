// Renders assets/icons/icon.svg into the PNG sizes iOS and Android want: `node tools/icons.mjs`
// Needs Playwright (any Chromium). Run once after changing icon.svg.
import { readFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const svg = readFileSync(new URL('../assets/icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['apple-touch-icon.png', 180, 0], ['icon-maskable-512.png', 512, 0.1]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0e0c12"><div style="width:${size}px;height:${size}px;display:grid;place-items:center"><div style="width:${size * (1 - pad * 2)}px;height:${size * (1 - pad * 2)}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div></body></html>`);
  await page.screenshot({ path: new URL(`../assets/icons/${name}`, import.meta.url).pathname });
}
await browser.close();
