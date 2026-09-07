import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchBrowser, installFixture, pauseRace, measureFrames } from './browser-utils.mjs';

const base = process.env.CAPTURE_URL || 'http://127.0.0.1:3100';
const output = process.env.CAPTURE_OUTPUT || '/tmp/whoslopped-verification';
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
const report = { base, browser: browser.version(), data: 'deterministic intercepted fixtures', checks: [], performance: [], errors: [] };
async function check(name, run) {
  try { await run(); report.checks.push({ name, passed: true }); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.checks.at(-1)));
}
async function noOverflow(page) {
  const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(size.content <= size.viewport, JSON.stringify(size));
}
try {
  for (const width of [1440, 390, 320, 844]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 1000 : width === 844 ? 375 : 844 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push({ width, type: 'pageerror', message: error.message }));
    page.on('console', message => { if (message.type() === 'error') report.errors.push({ width, type: 'console', message: message.text(), location: message.location() }); });
    await installFixture(page, 15);
    await check(`home ${width}`, async () => {
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await noOverflow(page);
      await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true, animations: 'disabled' });
    });
    await check(`race ${width}`, async () => {
      await page.goto(`${base}/race?metrics=1`, { waitUntil: 'domcontentloaded' });
      await page.locator('.pause-control').waitFor({ timeout: 90000 });
      await page.getByText('fixture-runner-01', { exact: true }).waitFor({ state: 'attached' });
      await pauseRace(page);
      assert.equal(await page.locator('.pause-control').getAttribute('aria-pressed'), 'true');
      await noOverflow(page);
      await page.screenshot({ path: `${output}/race-${width}.png`, animations: 'disabled', timeout: 90000 });
    });
    await check(`camera and keyboard ${width}`, async () => {
      for (const label of ['Trackside', 'Rat cam', 'Overview']) {
        await page.getByRole('button', { name: label, exact: true }).click();
        assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true');
        await page.waitForTimeout(1200);
        if (width === 1440) await page.screenshot({ path: `${output}/camera-${label.toLowerCase().replaceAll(' ', '-')}.png`, animations: 'disabled', timeout: 90000 });
      }
      await page.getByRole('button', { name: 'Join the race' }).click();
      const input = page.getByRole('textbox', { name: 'github handle' });
      await input.waitFor({ state: 'visible' });
      await input.focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Join the race' }).getAttribute('aria-expanded'), 'false');
      await noOverflow(page);
    });
    if (width === 1440 || width === 390) {
      for (const count of [15, 80]) {
        await check(`performance ${count} runners ${width}`, async () => {
          await page.unroute('**/api/rats');
          await installFixture(page, count);
          await page.goto(`${base}/race?metrics=1`, { waitUntil: 'domcontentloaded' });
          await page.locator('.pause-control').waitFor({ timeout: 90000 });
          if (await page.locator('.pause-control').getAttribute('aria-pressed') === 'true') await page.locator('.pause-control').click();
          await page.waitForTimeout(8000);
          report.performance.push({ width, runners: count, ...await measureFrames(page) });
          await pauseRace(page);
        });
      }
    }
    await page.close();
  }
  for (const state of ['empty', 'error']) {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route('**/api/rats', route => route.fulfill(state === 'empty' ? { json: { rats: [] } } : { status: 503, json: { error: 'fixture unavailable' } }));
    await check(`board ${state}`, async () => {
      await page.goto(`${base}/race`, { waitUntil: 'domcontentloaded' });
      await pauseRace(page);
      await page.getByText(state === 'empty' ? /No runners yet/ : /board is unavailable/).waitFor();
      await page.screenshot({ path: `${output}/board-${state}.png`, animations: 'disabled' });
    });
    await page.close();
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
if (report.checks.some(check => !check.passed) || report.errors.length) process.exitCode = 1;
