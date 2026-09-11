// @ts-check
// Per-position video card (Julie Swan) on a position landing. Runs against a
// deployed URL (needs /api/positions); lenient when the API is unavailable.
import { test, expect } from '@playwright/test';

const SLUG = process.env.VIDEO_SLUG || 'growth-marketing-manager';

test('GMM landing shows Julie\'s video card with disclosure, subtitles and transcript', async ({ page }) => {
  const res = await page.goto(`/positions/${SLUG}`);
  if (!res || res.status() !== 200) test.skip(true, 'landing not reachable');
  const content = page.locator('#content');
  await expect(content).toBeVisible({ timeout: 15000 });

  const card = page.locator('#pvideo');
  await expect(card).toBeVisible();
  await expect(card.locator('#pvideo-title')).toContainText('Julie');
  await expect(card.locator('.pvideo-sub')).toContainText('agente de IA');
  await expect(card.locator('.pvideo-note')).toContainText('generado con IA');
  await expect(card.locator('.pvideo-note')).toContainText('no toma decisiones de contratación');

  const video = card.locator('video');
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).not.toHaveAttribute('autoplay', /.*/);
  await expect(video.locator('track[kind="subtitles"]')).toHaveAttribute('srclang', 'es');
  await expect(card.locator('details summary')).toHaveText('Transcripción');

  // Assets resolve on the same origin.
  for (const sel of ['source', 'track']) {
    const src = await video.locator(sel).getAttribute('src');
    expect(src, `${sel} src`).toBeTruthy();
    const r = await page.request.get(src);
    expect(r.status(), `${sel} ${src}`).toBe(200);
  }
});

test('a position without a video shows no card', async ({ page }) => {
  const res = await page.goto('/positions/responsable-transacciones');
  if (!res || res.status() !== 200) test.skip(true, 'landing not reachable');
  await expect(page.locator('#content')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#pvideo')).toBeHidden();
});
