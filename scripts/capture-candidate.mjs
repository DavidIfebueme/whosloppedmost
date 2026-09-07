import { mkdir } from 'node:fs/promises';
import { launchBrowser, installFixture, pauseRace } from './browser-utils.mjs';

const base = process.env.CAPTURE_URL || 'http://127.0.0.1:3000';
const output = process.env.CAPTURE_OUTPUT || '/tmp/whoslopped-candidate';
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
let page;
try {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await installFixture(page, 15);
  page.on('pageerror', error => console.error(error.message));
  console.log(`Opening ${base}/race with 15 fixture runners`);
  await page.goto(`${base}/race?metrics=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  console.log('Document loaded, waiting for paused scene');
  await pauseRace(page);
  console.log('Scene paused');
  for (const camera of ['Overview', 'Rat cam', 'Trackside']) {
    if (camera !== 'Overview') await page.locator('.camera-dock button').filter({ hasText: camera }).click({ force: true, timeout: 90000 });
    await page.waitForTimeout(2500);
    const path = `${output}/${camera.toLowerCase().replaceAll(' ', '-')}.png`;
    console.log(`Capturing ${camera}`);
    await page.screenshot({ path, animations: 'disabled', timeout: 90000 });
    console.log(path);
    console.log(await page.evaluate(() => window.__raceMetrics));
  }
} catch (error) {
  console.error(error);
  console.error(await page?.locator('body').innerText({ timeout: 10000 }).catch(() => 'Unable to read page body'));
  await page?.screenshot({ path: `${output}/failure.png`, timeout: 30000 }).catch(() => {});
  process.exitCode = 1;
} finally { await browser.close(); }
