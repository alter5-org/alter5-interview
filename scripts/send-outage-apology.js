// One-off rescue for candidates whose /api/apply attempt on 2026-04-20 crashed
// with a NOT NULL position_id violation (before the staging→prod merge was
// promoted). We verified via Vercel log scrape + Supabase that these two
// emails tried multiple times and were never saved. Send a single branded
// apology with a retry link.
//
// Usage:
//   node --env-file=.env.local scripts/send-outage-apology.js --dry
//   node --env-file=.env.local scripts/send-outage-apology.js --test
//   node --env-file=.env.local scripts/send-outage-apology.js --send
//
//   --dry   : print the resolved recipient list and exit, no API calls.
//   --test  : send ONE mail to TEST_RECIPIENT (env var) and exit.
//   --send  : send to the real RECIPIENTS list.
//
// Resend key is read from RESEND_API_KEY (already in .env.local).

const { sendOutageApologyEmail } = require('../lib/email');

const RECIPIENTS = [
  'anepoti@gmail.com',
  'nepoti@proton.me',
];

const APPLY_URL = 'https://careers.alter-5.com/hoe';
const POSITION_TITLE = 'Head of Engineering (AI & Infrastructure)';

const TEST_RECIPIENT = process.env.TEST_RECIPIENT || 'salvador@mobiledreams.mobi';

const mode = process.argv[2];

async function sendOne(to) {
  process.stdout.write(`→ ${to} ... `);
  const r = await sendOutageApologyEmail({
    to,
    applyUrl: APPLY_URL,
    positionTitle: POSITION_TITLE,
  });
  if (r.ok) console.log(`sent (id=${r.id})`);
  else console.log(`FAIL: ${JSON.stringify(r)}`);
  return r.ok;
}

(async () => {
  if (mode === '--dry' || !mode) {
    console.log('DRY RUN — would send to:');
    RECIPIENTS.forEach((e) => console.log('  ' + e));
    console.log(`\nPosition: ${POSITION_TITLE}`);
    console.log(`Apply URL: ${APPLY_URL}`);
    console.log(`\nTo test: node --env-file=.env.local scripts/send-outage-apology.js --test`);
    console.log(`To send: node --env-file=.env.local scripts/send-outage-apology.js --send`);
    return;
  }
  if (mode === '--test') {
    console.log(`TEST MODE → ${TEST_RECIPIENT}`);
    const ok = await sendOne(TEST_RECIPIENT);
    process.exit(ok ? 0 : 1);
  }
  if (mode === '--send') {
    console.log(`LIVE SEND to ${RECIPIENTS.length} recipients`);
    let okCount = 0;
    for (const to of RECIPIENTS) {
      const ok = await sendOne(to);
      if (ok) okCount += 1;
      // Tiny spacing between sends to be polite with Resend rate limits.
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log(`\nDone. ${okCount}/${RECIPIENTS.length} sent.`);
    process.exit(okCount === RECIPIENTS.length ? 0 : 1);
  }
  console.error('Unknown mode. Use --dry, --test, or --send.');
  process.exit(1);
})();
