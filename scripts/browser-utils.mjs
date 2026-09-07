import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

export async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_PATH ||
    [chromium.executablePath(), '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(path => existsSync(path));
  return chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
}

export function fixtureRats(count) {
  return Array.from({ length: count }, (_, index) => ({
    handle: `fixture-runner-${String(index + 1).padStart(2, '0')}`,
    mergedPrs: 2400 - index * 27,
    distance: Math.log10(1 + 2400 - index * 27) * 100,
    laps: Math.floor(Math.log10(1 + 2400 - index * 27) * 100 / 1000), stale: false,
  }));
}

export async function installFixture(page, count) {
  await page.route('**/api/rats', route => route.fulfill({ json: { rats: fixtureRats(count) } }));
}

export async function pauseRace(page) {
  const button = page.locator('.pause-control');
  await button.waitFor({ timeout: 90000 });
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click({ force: true });
  await page.waitForTimeout(1200);
}

export async function measureFrames(page, duration = 5000) {
  return page.evaluate(durationMs => new Promise(resolve => {
    const intervals = [];
    let start, previous;
    const frame = now => {
      start ??= now;
      if (previous !== undefined) intervals.push(now - previous);
      previous = now;
      if (now - start < durationMs) return requestAnimationFrame(frame);
      const sorted = [...intervals].sort((a, b) => a - b);
      const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      resolve({ durationMs: now - start, frames: intervals.length, meanMs: mean,
        fps: 1000 / mean, p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        over33Ms: intervals.filter(value => value > 33.34).length,
        renderer: window.__raceMetrics ?? null });
    };
    requestAnimationFrame(frame);
  }), duration);
}
