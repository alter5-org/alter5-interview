// @ts-check
// Julie Swan profile page: disclosure visible, structure, links, a11y basics, mobile layout.
// Runs against PLAYWRIGHT_BASE_URL (deployed) or a local static server; the page is
// requested as /julie-swan.html so no Vercel rewrite is needed locally.
import { test, expect } from '@playwright/test';

const PAGE = '/julie-swan.html';

test.describe('Julie Swan profile', () => {
  test('renders with visible AI disclosure above the fold', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Console "Failed to load resource" lines carry no URL; third-party fonts may be
    // unreachable in CI, so same-origin load failures are tracked via requestfailed.
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on('requestfailed', (r) => { if (new URL(r.url()).host === new URL(page.url() || r.url()).host) errors.push(`${r.url()} ${r.failure()?.errorText}`); });

    const res = await page.goto(PAGE);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Julie Swan — AI Talent Manager at Alter5/);
    await expect(page.locator('h1')).toHaveText('Julie Swan');
    await expect(page.locator('h1')).toHaveCount(1);

    const pill = page.locator('.ai-pill');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('AI agent · Human-supervised');
    await expect(pill).toBeInViewport();

    await expect(page.locator('#site-footer')).toContainText('Julie Swan is an AI agent created for Alter5 — not a person or employee.');
    await expect(page.locator('#limits')).toContainText('Does not take final hiring decisions.');
    expect(errors).toEqual([]);
  });

  test('sections, links and images are well-formed', async ({ page }) => {
    await page.goto(PAGE);
    for (const id of ['about', 'experience', 'skills', 'principles', 'limits', 'featured']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.locator('.chip')).toHaveCount(12);
    await expect(page.locator('.principle')).toHaveCount(4);
    await expect(page.locator('.feature')).toHaveCount(3);

    await expect(page.getByRole('link', { name: /View open roles/ })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: /Meet Alter5/ })).toHaveAttribute('href', 'https://www.alter5.com');
    await expect(page.getByRole('link', { name: /Contact our hiring team/ })).toHaveAttribute('href', 'mailto:careers@alter-5.com');
    await expect(page.locator('nav.nav .nav-link', { hasText: 'Open Roles' })).toHaveAttribute('href', '/');

    const imgs = page.locator('img');
    const n = await imgs.count();
    for (let i = 0; i < n; i++) {
      expect(await imgs.nth(i).getAttribute('alt'), `img #${i} alt`).not.toBeNull();
    }
    const avatar = page.locator('.hero-avatar img');
    await expect(avatar).toHaveAttribute('alt', /not a real person/);
    expect(await avatar.evaluate((el) => el.naturalWidth)).toBeGreaterThan(0);
  });

  test('keyboard reaches the two hero CTAs', async ({ page }) => {
    await page.goto(PAGE);
    const primary = page.getByRole('link', { name: /View open roles/ });
    await primary.focus();
    await expect(primary).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /Meet Alter5/ })).toBeFocused();
  });

  test('no horizontal overflow on a 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PAGE);
    await expect(page.locator('.ai-pill')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
