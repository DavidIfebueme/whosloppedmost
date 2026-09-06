import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.CAPTURE_URL || 'http://127.0.0.1:3000';
await mkdir('/tmp/whoslopped-review', { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/sable/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/race', { waitUntil: 'networkidle', timeout: 180000 });
await page.waitForTimeout(6000);
await page.locator('.pause-control').click();
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/whoslopped-review/race-desktop.png', timeout: 90000 });
await page.addStyleTag({ content: '.race-hud { display: none !important; }' });
await mkdir('public/images', { recursive: true });
await page.screenshot({ path: 'public/images/circuit.jpg', type: 'jpeg', quality: 90, timeout: 90000 });
await page.goto(base, { waitUntil: 'networkidle', timeout: 180000 });
await page.screenshot({ path: '/tmp/whoslopped-review/home-desktop.png', fullPage: true });
for (const width of [390, 320]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 180000 });
  await page.screenshot({ path: `/tmp/whoslopped-review/home-${width}.png`, fullPage: true });
  await page.goto(base + '/race', { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `/tmp/whoslopped-review/race-${width}.png` });
}
console.log(JSON.stringify({ base, errors }, null, 2));
await browser.close();
