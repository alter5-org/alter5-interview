// One-off: scrape Vercel runtime logs for the NOT NULL position_id failures
// on 2026-04-20 (09:00–14:00 UTC) and extract the candidate email from each.
//
// The MCP truncates log messages to ~40 chars and no public Vercel API exposes
// runtime-log search. This script opens the Vercel dashboard in a headed
// browser, lets you log in once (session is persisted under .playwright-auth/),
// then clicks each row so the side panel reveals the full log — including the
// `Failing row contains (..., 'email@...', ...)` line — and greps the emails.
//
// Usage:
//   node scripts/scrape-vercel-failed-applies.js
//
// First run: a Chromium window opens on the Vercel login page. Log in as usual
// (email + password + whatever SSO Vercel asks). Once the logs page loads and
// you see the 20 rows of red /api/apply 500, press Enter in THIS terminal.
// The script will click each row, scrape the email, and print the list.
// Subsequent runs reuse the saved session so you don't have to log in again.

const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

const TEAM_SLUG = 'salvas-workspaces-projects';
const PROJECT_SLUG = 'alter5-interview';
// 2026-04-20 07:00 UTC → 14:00 UTC in epoch ms (captures the NOT-NULL window)
const SINCE_MS = 1776668400000;
const UNTIL_MS = 1776693600000;
const SEARCH = 'position_id';

const LOGS_URL =
  `https://vercel.com/${TEAM_SLUG}/${PROJECT_SLUG}/logs` +
  `?since=${SINCE_MS}&until=${UNTIL_MS}&search=${SEARCH}&environment=production`;

const SESSION_DIR = path.join(__dirname, '..', '.playwright-auth');

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

(async () => {
  console.log('→ Launching Chromium (session dir: ' + SESSION_DIR + ')');
  const ctx = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
  });
  const page = await ctx.newPage();

  console.log('→ Opening ' + LOGS_URL);
  await page.goto(LOGS_URL, { waitUntil: 'domcontentloaded' });

  // First run: user will see the Vercel login page. Wait for them to log in
  // and for the logs page URL to stabilize.
  console.log('');
  console.log('  If Vercel asked you to log in, complete the login in the browser.');
  console.log('  Wait until you see the 20 rows of red POST /api/apply 500.');
  console.log('  Then come back here and press Enter.');
  console.log('');
  await waitForEnter('  [Press Enter when the log rows are visible] ');

  // Re-navigate in case the login flow redirected us elsewhere.
  if (!page.url().includes('/logs')) {
    console.log('→ Re-navigating to logs URL after login');
    await page.goto(LOGS_URL, { waitUntil: 'networkidle' });
  }

  // Let React finish rendering the rows.
  await page.waitForTimeout(2000);

  // Plan B: Vercel's logs UI might already have the full log text baked
  // into the DOM (React rendered all 20 rows including the "Failing row
  // contains (..., 'email@...', ...)" payload, even if CSS truncates the
  // visual display). We extract ALL text from the page and regex-match
  // emails. No clicking needed.
  //
  // Also dump raw HTML to a file for offline inspection if regex misses.
  const bodyText = await page.evaluate(() => document.body.innerText);
  const bodyHtml = await page.evaluate(() => document.documentElement.outerHTML);
  const fs = require('fs');
  const dumpPath = path.join(__dirname, '..', '.tmp-vercel-logs-dump.txt');
  const htmlPath = path.join(__dirname, '..', '.tmp-vercel-logs-dump.html');
  fs.writeFileSync(dumpPath, bodyText);
  fs.writeFileSync(htmlPath, bodyHtml);
  console.log(`→ Dumped ${bodyText.length} chars of text to ${dumpPath}`);
  console.log(`→ Dumped ${bodyHtml.length} chars of HTML to ${htmlPath}`);

  // Regex out emails from "Failing row contains" lines specifically. If the
  // full error is in the DOM, each of the 20 logs should yield one email.
  const failingRowLines = bodyText
    .split('\n')
    .filter((l) => l.includes('Failing row contains') || l.includes('null value in column'));
  console.log(`→ Found ${failingRowLines.length} "Failing row"/"null value" lines.`);

  const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const rawEmails = bodyText.match(EMAIL_RE) || [];
  const emails = new Set();
  for (const m of rawEmails) {
    const lower = m.toLowerCase();
    if (lower.endsWith('@vercel.com')) continue;
    if (lower === 'hiring@alter-5.com') continue;
    if (lower === 'careers@alter-5.com') continue;
    if (lower === 'privacy@alter-5.com') continue;
    if (lower === 'noreply@anthropic.com') continue;
    emails.add(lower);
  }

  console.log('');
  console.log('=== ALL UNIQUE EMAIL-SHAPED STRINGS IN PAGE ===');
  [...emails].sort().forEach((e) => console.log(e));
  console.log('===============================================');
  console.log(`Total: ${emails.size}`);

  if (emails.size === 0) {
    console.log('');
    console.log('  No emails found in page text. The Vercel UI likely does NOT');
    console.log('  render the full log message in the DOM until you expand each row.');
    console.log('');
    console.log(`  Please share the dump file so I can inspect the structure:`);
    console.log(`    ${dumpPath}`);
    console.log(`    ${htmlPath}`);
  }
  await waitForEnter('[Press Enter to close the browser] ');
  await ctx.close();
  process.exit(0);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
