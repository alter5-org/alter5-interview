// GET /api/interview/config?token=<raw-token>
//
// Returns the interview test configuration (blocks + questions + position
// title) for the magic-link owner. Used by interview.html at boot to replace
// the previously hardcoded BLOCKS/QS literals, so each position can define
// its own test.
//
// Security notes:
// - We validate the magic link but do NOT consume it here (that happens on
//   submit). This way a candidate who reloads the page mid-interview keeps
//   working.
// - We return `correct` indices as before — the current UI shows acierto/error
//   to the candidate and calculates score client-side. Moving scoring entirely
//   server-side is a separate v2 concern.

const { supabaseAdmin } = require('../../lib/supabase');
const { hashToken, isValidTokenFormat } = require('../../lib/tokens');

module.exports.default = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });

  const token = req.query?.token;
  if (!token || !isValidTokenFormat(token)) {
    return res.status(400).json({ error: 'invalid_token' });
  }

  try {
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('magic_links')
      .select('id, application_id, expires_at, used_at, purpose')
      .eq('token_hash', hashToken(token))
      .eq('purpose', 'interview')
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return res.status(404).json({ error: 'not_found' });
    if (link.used_at) return res.status(410).json({ error: 'used' });
    if (new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ error: 'expired' });
    }

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('id, position_id, status, deleted_at')
      .eq('id', link.application_id)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app || app.deleted_at) return res.status(404).json({ error: 'application_not_found' });

    const { data: pos, error: posErr } = await supabaseAdmin
      .from('positions')
      .select('id, slug, title, subtitle, interview_blocks, interview_questions')
      .eq('id', app.position_id)
      .maybeSingle();
    if (posErr) throw posErr;
    if (!pos) return res.status(500).json({ error: 'position_not_found' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      position_slug: pos.slug,
      position_title: pos.title,
      position_subtitle: pos.subtitle || '',
      blocks: pos.interview_blocks || [],
      questions: pos.interview_questions || [],
    });
  } catch (e) {
    console.error('[interview/config] error:', e.message);
    return res.status(500).json({ error: 'internal_error' });
  }
};
