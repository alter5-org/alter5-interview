// POST /api/admin/manual-upload
//
// Superadmin-only entry point for ingesting a CV on behalf of a candidate.
// Behind Basic Auth via middleware.js. The actual pipeline lives in
// lib/cv-upload.js so the headhunter portal can reuse it.
//
// Body: { email?, name?, experience?, fileBase64, filename, autoInvite?, source?, position_id? }
//
// `email` is optional — if omitted we extract it from the CV via the LLM.
// `source` accepts the whitelist {'email_agent'} (Mastra HR agent ingest);
// any other value falls back to 'admin_manual'.
// `position_id` is optional; when omitted the CV is routed to the HoE
// position so legacy bulk-upload flows keep working untouched.

const { processCvUpload } = require('../../lib/cv-upload');
const { supabaseAdmin } = require('../../lib/supabase');
const { getClientIp, getUserAgent } = require('../../lib/validation');

module.exports.config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

const ALLOWED_SOURCES = new Set(['email_agent']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const { email, name, experience, fileBase64, filename, autoInvite, source, position_id } = req.body || {};
  const resolvedSource = ALLOWED_SOURCES.has(source) ? source : 'admin_manual';

  // Admin uploads can target any active (non-archived) position. No
  // share_with_headhunters gate here — this endpoint is admin-only.
  let resolvedPositionId = null;
  if (position_id) {
    if (!UUID_RE.test(position_id)) {
      return res.status(400).json({ error: 'invalid_position' });
    }
    const { data: pos } = await supabaseAdmin
      .from('positions')
      .select('id, status, archived_at')
      .eq('id', position_id)
      .maybeSingle();
    if (!pos || pos.archived_at || pos.status !== 'active') {
      return res.status(400).json({ error: 'invalid_position' });
    }
    resolvedPositionId = pos.id;
  }

  try {
    const result = await processCvUpload({
      fileBase64,
      filename,
      source: resolvedSource,
      prefilledEmail: email || null,
      prefilledName: name || null,
      prefilledExperience: experience || null,
      positionId: resolvedPositionId,
      autoInvite: !!autoInvite,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      actor: resolvedSource === 'email_agent' ? 'agent' : 'admin',
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        error: result.error,
        ...(result.detail ? { detail: result.detail } : {}),
      });
    }

    return res.status(200).json({
      ok: true,
      applicationId: result.applicationId,
      score: result.score,
      recommendation: result.recommendation,
      status: result.appStatus,
      interview_url: result.interview_url,
      ...(result.analysis_error ? { analysis_error: result.analysis_error } : {}),
    });
  } catch (e) {
    console.error('[admin/manual-upload] error:', e.message);
    return res.status(500).json({ error: 'internal_error' });
  }
};
