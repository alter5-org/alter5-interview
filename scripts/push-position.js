#!/usr/bin/env node
// Push a versioned position (docs/positions/<slug>/) to the admin API.
//
//   node --env-file=.env.local scripts/push-position.js <slug> [--base URL] [--dry] [--status active|paused|closed]
//
// Files read from docs/positions/<slug>/:
//   position.json        slug, title, subtitle, status, share_with_headhunters, min_score_to_invite
//   intro.html           -> public_intro_html (optional / may be empty)
//   cv-prompt.md         -> cv_analysis_prompt
//   interview-prompt.md  -> interview_system_prompt
//   blocks.json          -> interview_blocks
//   questions.json       -> interview_questions
//
// The payload is validated locally with lib/position-validation.js (same
// rules as the server) before any request. If the slug already exists the
// row is PATCHed, otherwise POSTed — so the script is safe to re-run after
// editing a prompt or a question.
//
// Env: ADMIN_USER (default admin), ADMIN_PASS, optional
// VERCEL_AUTOMATION_BYPASS_SECRET (needed when --base is a Vercel preview).
//
// NOTE: preview deployments share the production database. Push with
// --status paused until the position is verified end-to-end.

const fs = require('fs');
const path = require('path');
const { validatePosition } = require('../lib/position-validation');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const slug = process.argv[2];
const DRY = process.argv.includes('--dry');
const BASE = (arg('--base', process.env.PUSH_BASE_URL || 'https://careers.alter-5.com')).replace(/\/$/, '');
const STATUS_OVERRIDE = arg('--status');

if (!slug || slug.startsWith('--')) {
  console.error('usage: push-position.js <slug> [--base URL] [--dry] [--status active|paused|closed]');
  process.exit(2);
}

const dir = path.join(__dirname, '..', 'docs', 'positions', slug);
if (!fs.existsSync(dir)) {
  console.error(`no such position folder: ${dir}`);
  process.exit(2);
}
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const readJson = (f) => JSON.parse(read(f));
const readOpt = (f) => (fs.existsSync(path.join(dir, f)) ? read(f) : '');

const meta = readJson('position.json');
if (meta.slug !== slug) {
  console.error(`position.json slug (${meta.slug}) does not match folder (${slug})`);
  process.exit(2);
}

const payload = {
  slug: meta.slug,
  title: meta.title,
  subtitle: meta.subtitle || null,
  status: STATUS_OVERRIDE || meta.status || 'paused',
  share_with_headhunters: !!meta.share_with_headhunters,
  min_score_to_invite: Number.isInteger(meta.min_score_to_invite) ? meta.min_score_to_invite : 4,
  public_intro_html: readOpt('intro.html').trim() || null,
  cv_analysis_prompt: read('cv-prompt.md').trim(),
  interview_system_prompt: read('interview-prompt.md').trim(),
  interview_blocks: readJson('blocks.json'),
  interview_questions: readJson('questions.json'),
};

const v = validatePosition(payload, { requireAll: true });
if (!v.ok) {
  console.error(`validation failed: ${v.error}`);
  process.exit(1);
}

const qs = payload.interview_questions;
const summary = {
  slug: payload.slug,
  title: payload.title,
  subtitle: payload.subtitle,
  status: payload.status,
  share_with_headhunters: payload.share_with_headhunters,
  min_score_to_invite: payload.min_score_to_invite,
  blocks: payload.interview_blocks.map(b => b.id),
  questions: qs.length,
  by_type: qs.reduce((a, q) => ({ ...a, [q.type]: (a[q.type] || 0) + 1 }), {}),
  intro_html_chars: (payload.public_intro_html || '').length,
  cv_prompt_chars: payload.cv_analysis_prompt.length,
  interview_prompt_chars: payload.interview_system_prompt.length,
};
console.log(JSON.stringify(summary, null, 2));

if (DRY) {
  console.log('--dry: validation OK, nothing sent.');
  process.exit(0);
}

const user = process.env.ADMIN_USER || 'admin';
const pass = process.env.ADMIN_PASS;
if (!pass) {
  console.error('ADMIN_PASS is required (node --env-file=.env.local …)');
  process.exit(2);
}
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
};
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

async function main() {
  const listRes = await fetch(`${BASE}/api/admin/positions`, { headers });
  if (!listRes.ok) {
    console.error(`GET /api/admin/positions → ${listRes.status} ${await listRes.text()}`);
    process.exit(1);
  }
  const list = await listRes.json();
  const existing = (list.positions || []).find(p => p.slug === slug);

  let res;
  if (existing) {
    console.log(`PATCH existing position ${existing.id}`);
    const { slug: _s, ...patch } = payload; // slug is immutable on PATCH
    res = await fetch(`${BASE}/api/admin/positions/${existing.id}`, {
      method: 'PATCH', headers, body: JSON.stringify(patch),
    });
  } else {
    console.log('POST new position');
    res = await fetch(`${BASE}/api/admin/positions`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
  }
  const body = await res.text();
  console.log(`${res.status} ${body}`);
  process.exit(res.ok ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
