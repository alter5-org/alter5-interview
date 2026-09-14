// @ts-check
// Per-position video card (Julie Swan) on a position landing. Runs against a
// deployed URL (needs /api/positions); lenient when the API is unavailable.
import { test, expect } from '@playwright/test';

async function expectVideoCard(page, slug, { titleMatch = 'Julie', noteMatch = ['generado con IA', 'toma decisiones de contratación'] } = {}) {
  const res = await page.goto(`/positions/${slug}`);
  if (!res || res.status() !== 200) { test.skip(true, 'landing not reachable'); return; }
  const content = page.locator('#content');
  await expect(content).toBeVisible({ timeout: 15000 });

  const card = page.locator('#pvideo');
  await expect(card).toBeVisible();
  await expect(card.locator('#pvideo-title')).toContainText(titleMatch);
  await expect(card.locator('.pvideo-sub')).toContainText('agente de IA');
  for (const m of noteMatch) await expect(card.locator('.pvideo-note')).toContainText(m);

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
}

test('GMM landing shows Julie\'s video card with disclosure, subtitles and transcript', async ({ page }) => {
  await expectVideoCard(page, process.env.VIDEO_SLUG || 'growth-marketing-manager');
});

test('RT landing shows Julie\'s video card describing the conversational interview', async ({ page }) => {
  const res = await page.goto('/positions/responsable-transacciones');
  if (!res || res.status() !== 200) { test.skip(true, 'landing not reachable'); return; }
  await expect(page.locator('#content')).toBeVisible({ timeout: 15000 });
  const card = page.locator('#pvideo');
  await expect(card).toBeVisible();
  // RT's note additionally clarifies the human team runs the technical
  // interview stage too (not just the hiring decision) — the conversational
  // interview evaluator is advisory, never automatic.
  await expect(card.locator('.pvideo-note')).toContainText('entrevista técnica y la decisión las gestiona el equipo humano');
  await expect(card.locator('details p')).toContainText('entrevista técnica conversacional');
  const video = card.locator('video');
  for (const sel of ['source', 'track']) {
    const src = await video.locator(sel).getAttribute('src');
    const r = await page.request.get(src);
    expect(r.status(), `${sel} ${src}`).toBe(200);
  }
});

test('a position without a video (hoe) shows no card', async ({ page }) => {
  const res = await page.goto('/positions/hoe');
  if (!res || res.status() !== 200) { test.skip(true, 'landing not reachable'); return; }
  await expect(page.locator('#content')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#pvideo')).toBeHidden();
});
