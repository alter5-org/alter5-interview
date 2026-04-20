// POST /api/headhunter/upload-cv
//
// Authenticated by the a5_hh_session cookie. Forces source='headhunter' and
// stamps the candidate row + event with the partner's id. The actual
// processing is shared with the admin manual-upload (lib/cv-upload.js).
//
// Body: { fileBase64, filename, note?, autoInvite?, position_id? }
//
// `autoInvite` from a partner is intentionally accepted — they often have
// already screened the candidate; admin still gets the event log to audit.
//
// `position_id` must reference a position with share_with_headhunters=true
// AND status='active'. A partner can't upload a CV into a closed position
// or into one we haven't explicitly shared with them. If not supplied we
// fall back to the HoE position so legacy clients keep working.

const { processCvUpload } = require('../../lib/cv-upload');
const { getSession } = require('../../lib/headhunter-session');
const { supabaseAdmin } = require('../../lib/supabase');
const { getClientIp, getUserAgent } = require('../../lib/validation');

module.exports.config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const session = getSession(req);
  if (!session?.hh_id) return res.status(401).json({ error: 'unauthenticated' });

  // Re-check the partner is still active before letting them write. We
  // gate on `status === 'active'` (not `!== 'disabled'`) so any future
  // intermediate state — pending review, suspended — fails closed.
  const { data: hh } = await supabaseAdmin
    .from('headhunters')
    .select('id, status, auto_invite_allowed')
    .eq('id', session.hh_id)
    .maybeSingle();
  if (!hh || hh.status !== 'active') {
    return res.status(401).json({ error: 'unauthenticated' });
  }

  const { fileBase64, filename, note, autoInvite, position_id } = req.body || {};

  // Validate position_id against the share+active gate. This is the real
  // authorization boundary: partners-upload.html only *shows* shared
  // positions in the dropdown, but we can't trust the client — recheck.
  let resolvedPositionId = null;
  if (position_id) {
    if (!UUID_RE.test(position_id)) {
      return res.status(400).json({ error: 'invalid_position' });
    }
    const { data: pos } = await supabaseAdmin
      .from('positions')
      .select('id, share_with_headhunters, status, archived_at')
      .eq('id', position_id)
      .maybeSingle();
    if (!pos || pos.archived_at || pos.status !== 'active' || !pos.share_with_headhunters) {
      return res.status(400).json({ error: 'invalid_position' });
    }
    resolvedPositionId = pos.id;
  }

  // autoInvite from a partner bypasses the IA scoring → mass interview
  // invites without human review. Gate it behind an explicit admin opt-in
  // (headhunters.auto_invite_allowed). Partners without the flag silently
  // get the default queue-for-review behaviour even if they tick the box.
  const effectiveAutoInvite = !!autoInvite && !!hh.auto_invite_allowed;

  try {
    const result = await processCvUpload({
      fileBase64,
      filename,
      source: 'headhunter',
      headhunterId: hh.id,
      positionId: resolvedPositionId,
      uploaderNote: note ? String(note) : null,
      autoInvite: effectiveAutoInvite,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      actor: 'headhunter',
    });

    if (!result.ok) {
      // Don't propagate `detail` to the client: it can leak Postgres/Supabase
      // schema info. The detail is already on console for ops debugging.
      if (result.detail) console.error('[headhunter/upload-cv] detail:', result.detail);
      return res.status(result.status || 400).json({ error: result.error });
    }

    return res.status(200).json({
      ok: true,
      applicationId: result.applicationId,
      score: result.score,
      recommendation: result.recommendation,
      status: result.appStatus,
      ...(result.analysis_error ? { analysis_error: result.analysis_error } : {}),
    });
  } catch (e) {
    console.error('[headhunter/upload-cv] error:', e.message);
    return res.status(500).json({ error: 'internal_error' });
  }
};
