// POST /api/admin/reanalyze-cv
//
// Body: { applicationId }
// Re-runs the CV analysis for an application using its latest stored CV and
// the position's current cv_analysis_prompt, then routes the application by
// score exactly like the upload paths do (lib/positions.js routeCvScore).
//
// Exists because an LLM failure (e.g. a retired model id) leaves candidates
// parked in `cv_uploaded` with a `cv_analysis_failed` event and no way to
// recover them from the admin panel. Admin-only (Basic Auth in middleware).

const { supabaseAdmin } = require('../../lib/supabase');
const { analyzeCv } = require('../../lib/cv-analysis');
const { getPositionByApplication, routeCvScore, reviewThreshold } = require('../../lib/positions');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Statuses where a fresh CV score is meaningful. Post-interview statuses are
// deliberately excluded: re-scoring the CV there would mislabel the funnel.
const RESCORABLE = new Set([
  'cv_uploaded',
  'analyzed_pending_review',
  'analyzed_auto_rejected',
]);

module.exports.default = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const { applicationId } = req.body || {};
  if (!applicationId || !UUID_RE.test(applicationId)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  try {
    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('id, status, name, experience, deleted_at')
      .eq('id', applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app || app.deleted_at) return res.status(404).json({ error: 'not_found' });
    if (!RESCORABLE.has(app.status)) {
      return res.status(409).json({ error: 'status_not_rescorable', status: app.status });
    }

    const { data: cv, error: cvErr } = await supabaseAdmin
      .from('cvs')
      .select('id, storage_path, filename')
      .eq('application_id', applicationId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cvErr) throw cvErr;
    if (!cv) return res.status(404).json({ error: 'no_cv' });

    const position = await getPositionByApplication(applicationId);
    if (!position) return res.status(500).json({ error: 'position_not_found' });

    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from('cvs')
      .download(cv.storage_path);
    if (dlErr) throw dlErr;
    const fileBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');

    const analysis = await analyzeCv({
      fileBase64,
      filename: cv.filename,
      systemPrompt: position.cv_analysis_prompt,
      reviewThreshold: reviewThreshold(position),
    });
    if (!analysis.ok) {
      await supabaseAdmin.from('application_events').insert({
        application_id: applicationId,
        event_type: 'cv_analysis_failed',
        event_data: { error: analysis.error, reanalysis: true },
        actor: 'admin',
      });
      return res.status(502).json({ error: analysis.error });
    }

    const { data: analysisRow, error: anErr } = await supabaseAdmin
      .from('analyses')
      .insert({
        application_id: applicationId,
        cv_id: cv.id,
        score: analysis.score,
        recommendation: analysis.recommendation,
        summary: analysis.summary,
        raw_response: analysis.raw,
        model: analysis.model,
      })
      .select('id')
      .single();
    if (anErr) throw anErr;

    const nextStatus = routeCvScore(analysis.score, position);
    const updateApp = { status: nextStatus, analyzed_at: new Date().toISOString() };
    if (analysis.name && !app.name) updateApp.name = analysis.name;
    await supabaseAdmin.from('applications').update(updateApp).eq('id', applicationId);

    await supabaseAdmin.from('application_events').insert({
      application_id: applicationId,
      event_type: 'cv_analyzed',
      event_data: {
        score: analysis.score,
        recommendation: analysis.recommendation,
        routed_to: nextStatus,
        threshold: reviewThreshold(position),
        position_slug: position.slug,
        analysis_id: analysisRow.id,
        reanalysis: true,
        previous_status: app.status,
      },
      actor: 'admin',
    });

    return res.status(200).json({
      ok: true,
      score: analysis.score,
      recommendation: analysis.recommendation,
      status: nextStatus,
    });
  } catch (e) {
    console.error('[admin/reanalyze-cv] error:', e.message);
    return res.status(500).json({ error: 'internal_error' });
  }
};
