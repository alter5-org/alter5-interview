// @ts-check
// Second-position hardening: root index, mandatory slug, `open` questions,
// answer key never leaves the server, position column in exports.
//
// Same posture as positions.spec.js: runs against a deployed URL
// (PLAYWRIGHT_BASE_URL), lenient where admin auth / captcha are unavailable.
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Playwright is run from the repo root (npm test).
const ROOT = process.cwd();
function loadEnvFile(name) {
  const file = path.join(ROOT, name);
  if (!existsSync(file)) return {};
  return readFileSync(file, 'utf-8').split('\n').reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) acc[key.trim()] = value.join('=').trim().replace(/^"/, '').replace(/"$/, '');
    return acc;
  }, {});
}
const envLocal = loadEnvFile('.env.local');
const envPreview = loadEnvFile('.env.preview');
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || envLocal.VERCEL_AUTOMATION_BYPASS_SECRET || '';
const ADMIN_PASS = process.env.ADMIN_PASS || envPreview.ADMIN_PASS || envLocal.ADMIN_PASS || '';
const SLUGS = (process.env.POSITION_SLUGS || 'hoe,responsable-transacciones').split(',').map(s => s.trim()).filter(Boolean);

const bypassHeaders = { 'x-vercel-protection-bypass': BYPASS_SECRET, 'x-vercel-set-bypass-cookie': 'true' };
const adminHeaders = { ...bypassHeaders, Authorization: `Basic ${Buffer.from(`admin:${ADMIN_PASS}`).toString('base64')}` };

test.use({ extraHTTPHeaders: bypassHeaders });

// Returns null when the preview has no working admin auth (expected there).
async function adminOrSkip(request) {
  if (!ADMIN_PASS) return null;
  const r = await request.get('/api/admin/positions', { headers: adminHeaders, timeout: 10000 }).catch(() => null);
  if (!r || r.status() !== 200) return null;
  return r.json();
}

test.describe('positions v2', () => {
  test('index-lists-active-positions', async ({ page, request }) => {
    const r = await request.get('/', { maxRedirects: 0 });
    expect(r.status()).toBe(200); // no more 308 → /hoe

    await page.goto('/');
    await expect(page.locator('h1.big-title')).toContainText('Posiciones abiertas');
    await page.waitForSelector('#list a.card, #empty:not(.hidden)', { timeout: 15000 });

    const api = await (await request.get('/api/positions')).json();
    const active = (api.positions || []).map(p => p.slug);
    for (const slug of active) {
      const href = slug === 'hoe' ? '/hoe' : `/positions/${slug}`;
      await expect(page.locator(`a.card[href="${href}"]`)).toBeVisible();
    }
  });

  test('public-landing-per-slug', async ({ page, request }) => {
    const api = await (await request.get('/api/positions')).json();
    const active = new Set((api.positions || []).map(p => p.slug));
    for (const slug of SLUGS) {
      if (!active.has(slug)) { console.log(`skip ${slug}: not active on this deployment`); continue; }
      await page.goto(`/positions/${slug}`);
      await expect(page.locator('h1.big-title')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('apply-requires-slug', async ({ request }) => {
    const r = await request.post('/api/apply', {
      data: { email: `smoke+${Date.now()}@alter-5.com`, consent_privacy: true, consent_ai_decision: true, turnstile_token: 'x' },
      timeout: 15000,
    });
    if (r.status() === 429) { console.log('rate limited — skip'); return; }
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe('invalid_position');
  });

  test('admin-validator-accepts-open', async ({ request }) => {
    const list = await adminOrSkip(request);
    if (!list) { console.log('admin auth unavailable — skip'); return; }
    const base = {
      slug: `smoke-open-${Date.now().toString(36)}`,
      title: 'Smoke open',
      status: 'paused',
      cv_analysis_prompt: 'x',
      interview_system_prompt: 'x',
      interview_blocks: [{ id: 'caso', label: 'Caso', icon: '📄', desc: 'd' }],
    };
    const bad = await request.post('/api/admin/positions', {
      headers: adminHeaders,
      data: { ...base, interview_questions: [{ block: 'caso', type: 'open', w: 5, text: 'q', min: 10, sus: 900, options: ['a', 'b'] }] },
    });
    expect(bad.status()).toBe(400);

    const good = await request.post('/api/admin/positions', {
      headers: adminHeaders,
      data: { ...base, interview_questions: [{ block: 'caso', type: 'open', w: 5, text: 'q', min: 10, sus: 900, minChars: 300 }] },
    });
    expect([200, 201]).toContain(good.status());
    const created = await good.json();
    const id = created.position?.id || created.id;
    if (id) {
      await request.post('/api/admin/positions/archive', { headers: adminHeaders, data: { id } });
    }
  });

  test('interview-config-hides-correct', async ({ request }) => {
    // Bogus token → 4xx and no bank. A real token is only available in a
    // full E2E; the unit test covers publicQuestions().
    const r = await request.get(`/api/interview/config?token=${'0'.repeat(64)}`);
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
    const body = await r.text();
    expect(body).not.toContain('"correct"');
  });

  test('manual-upload-requires-position', async ({ request }) => {
    const list = await adminOrSkip(request);
    if (!list) { console.log('admin auth unavailable — skip'); return; }
    const r = await request.post('/api/admin/manual-upload', {
      headers: adminHeaders,
      data: { fileBase64: Buffer.from('%PDF-1.4 smoke').toString('base64'), filename: 'x.pdf' },
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toBe('position_required');
  });

  test('export-has-position-column', async ({ request }) => {
    const list = await adminOrSkip(request);
    if (!list) { console.log('admin auth unavailable — skip'); return; }
    for (const type of ['applications', 'interviews']) {
      const r = await request.get(`/api/admin/export?type=${type}`, { headers: adminHeaders });
      expect(r.status()).toBe(200);
      const header = (await r.text()).split('\n')[0];
      expect(header.split(',')).toContain('position');
    }
  });
});
