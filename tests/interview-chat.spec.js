// @ts-check
// Conversational interview page: static invariants that don't need a real
// magic-link session (no candidate score ever shown by construction, the
// consent/disclosure copy from spec §25 is present, Julie assets are never
// referenced, invalid token fails loud). A full turn-by-turn walkthrough
// needs a live backend + synthetic candidate and is covered by manual smoke
// against a preview deploy (see docs/positions/.../README.md).
import { test, expect } from '@playwright/test';

test.describe('Conversational interview page', () => {
  test('missing token shows the error screen, not a blank/broken page', async ({ page }) => {
    const res = await page.goto('/interview-chat.html');
    expect(res?.status()).toBe(200);
    await expect(page.locator('#screen-error')).toBeVisible();
    await expect(page.locator('#screen-loading')).toBeHidden();
  });

  test('malformed token also fails loud', async ({ page }) => {
    await page.goto('/interview-chat.html?token=not-a-real-token');
    await expect(page.locator('#screen-error')).toBeVisible();
  });

  test('the page never hardcodes a score/timer UI element', async ({ page }) => {
    await page.goto('/interview-chat.html');
    const html = await page.content();
    expect(html).not.toMatch(/id="(score|timer|countdown)"/i);
    expect(html).not.toMatch(/class="[^"]*\b(score|timer)\b/i);
  });

  test('the page never references Julie Swan assets or copy', async ({ page }) => {
    await page.goto('/interview-chat.html');
    const html = await page.content();
    expect(html).not.toMatch(/julie/i);
    expect(html.match(/Alter5 Technical Interview/g)?.length).toBeGreaterThan(0);
  });

  test('consent screen source carries the spec §25 disclosure checklist', async ({ page }) => {
    const res = await page.request.get('/interview-chat.html');
    const html = await res.text();
    expect(html).toMatch(/10-12 minutos/);
    expect(html).toMatch(/asistente conversacional de IA, supervisado/);
    expect(html).toMatch(/se guardan para la revisión/);
    expect(html).toMatch(/sin asistencia externa de IA/);
    expect(html).toMatch(/No verás una puntuación/);
    expect(html).toMatch(/apply\/privacy/);
  });
});
