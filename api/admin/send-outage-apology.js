// POST /api/admin/send-outage-apology
//
// One-off rescue endpoint for candidates whose /api/apply attempt on
// 2026-04-20 crashed (NOT NULL position_id, then FUNCTION_INVOCATION_FAILED
// after the fallback rotate-secrets.sh run left env vars unset).
//
// Affected emails were identified by scraping Vercel runtime logs
// (scripts/scrape-vercel-failed-applies.js) and cross-checking Supabase
// for successful retries (candidates who retried and got through are
// excluded).
//
// Auth: middleware.js enforces Basic Auth on /api/admin/*.
//
// Body:
//   { dryRun?: boolean }   — dryRun=true returns the recipient list without
//                            sending; dryRun=false actually sends.
//
// Recipients are hardcoded here (not in the body) so a stolen ADMIN_PASS
// can't spam arbitrary addresses via this endpoint.

const { sendOutageApologyEmail } = require('../../lib/email');

const RECIPIENTS = [
  'anepoti@gmail.com',
  'nepoti@proton.me',
];

const APPLY_URL = 'https://careers.alter-5.com/hoe';
const POSITION_TITLE = 'Head of Engineering (AI & Infrastructure)';

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const { dryRun = false } = req.body || {};

  if (dryRun) {
    return res.status(200).json({
      ok: true,
      dryRun: true,
      recipients: RECIPIENTS,
      applyUrl: APPLY_URL,
      positionTitle: POSITION_TITLE,
    });
  }

  const results = [];
  for (const to of RECIPIENTS) {
    try {
      const r = await sendOutageApologyEmail({
        to,
        applyUrl: APPLY_URL,
        positionTitle: POSITION_TITLE,
      });
      results.push({ to, ok: !!r.ok, id: r.id || null, error: r.ok ? null : (r.error || 'send_failed') });
    } catch (e) {
      results.push({ to, ok: false, id: null, error: e.message });
    }
    // Tiny spacing between sends — polite with Resend rate limits.
    await new Promise((r) => setTimeout(r, 400));
  }

  const okCount = results.filter((r) => r.ok).length;
  return res.status(okCount === RECIPIENTS.length ? 200 : 500).json({
    ok: okCount === RECIPIENTS.length,
    sent: okCount,
    total: RECIPIENTS.length,
    results,
  });
};
