import { mkdir } from 'node:fs/promises';
import { launchBrowser, installFixture, pauseRace } from './browser-utils.mjs';

const base = process.env.CAPTURE_URL || 'http://127.0.0.1:3000';
const output = process.env.CAPTURE_OUTPUT || '/tmp/whoslopped-candidate';
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await installFixture(page, 15);
  page.on('pageerror', error => console.error(error.message));
  await page.goto(`${base}/race?metrics=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pauseRace(page);
  for (const camera of ['Overview', 'Rat cam', 'Trackside']) {
    await page.getByRole('button', { name: camera, exact: true }).click({ force: true });
    await page.waitForTimeout(2500);
    const path = `${output}/${camera.toLowerCase().replaceAll(' ', '-')}.png`;
    await page.screenshot({ path, animations: 'disabled', timeout: 90000 });
    console.log(path);
    console.log(await page.evaluate(() => window.__raceMetrics));
  }
} finally { await browser.close(); }
