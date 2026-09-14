// POST /api/interview-chat/complete
//
// Body: { token, sessionId }
// Locks a conversational interview session and runs the post-interview
// evaluator (spec §4.3). Mirrors api/submit-interview.js's evaluator-trigger
// tail closely: same 50s AbortController inside the 60s Vercel budget, same
// "the candidate's session is over either way" posture — if the Claude call
// fails, the interview is still marked completed (never leave the candidate
// stuck) and an event is logged so it can be revisited.
//
// The evaluator prompt (positions.interview_system_prompt) is loaded ONLY
// here — never by the live interviewer (see api/interview-chat/respond.js
// and docs/positions/.../orchestrator-prompt.md's "Nota interna").

const { supabaseAdmin } = require('../../lib/supabase');
const { hashToken, isValidTokenFormat } = require('../../lib/tokens');
const { getPositionByApplication } = require('../../lib/positions');
const { sanitizeHtml } = require('../../lib/sanitize-html');
const {
  evaluateConversationalInterview, extractEvaluationJson, rescaleGlobalScore, buildTranscriptText,
} = require('../../lib/interview-chat-analysis');

function profileSummaryText(profile) {
  if (!profile) return 'no disponible';
  const parts = [];
  if (profile.years_experience_estimate) parts.push(`${profile.years_experience_estimate} años de experiencia estimados`);
  if (profile.current_role) parts.push(`rol actual: ${profile.current_role}`);
  if (Array.isArray(profile.areas_to_probe) && profile.areas_to_probe.length) {
    parts.push(`áreas menos evidenciadas: ${profile.areas_to_probe.join(', ')}`);
  }
  return parts.join(' · ') || 'no disponible';
}

module.exports.default = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'method' });

  const { token, sessionId } = req.body || {};
  if (!token || !isValidTokenFormat(token)) return res.status(400).json({ ok: false, reason: 'invalid' });
  if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ ok: false, reason: 'invalid_session' });

  try {
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('magic_links')
      .select('id, application_id, expires_at, used_at, purpose')
      .eq('token_hash', hashToken(token))
      .eq('purpose', 'interview')
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return res.status(200).json({ ok: false, reason: 'invalid_link' });
    const appId = link.application_id;

    const { data: interview, error: ivErr } = await supabaseAdmin
      .from('interviews')
      .select('id, application_id, channel, status, orchestrator_state, started_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (ivErr) throw ivErr;
    if (!interview || interview.application_id !== appId || interview.channel !== 'conversational_text') {
      return res.status(200).json({ ok: false, reason: 'session_not_found' });
    }
    // Idempotent: a client retry after a network blip on a prior /complete
    // call should not error, it should just report success again.
    if (interview.status === 'completed') {
      return res.status(200).json({ ok: true, alreadyCompleted: true });
    }

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('id, name, deleted_at')
      .eq('id', appId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app || app.deleted_at) return res.status(200).json({ ok: false, reason: 'application_not_found' });

    const position = await getPositionByApplication(appId, { withInterview: true });
    if (!position) return res.status(500).json({ ok: false, reason: 'position_not_found' });

    const { data: turns, error: turnsErr } = await supabaseAdmin
      .from('interview_answers')
      .select('question_idx, answer_text, turn_meta')
      .eq('interview_id', interview.id)
      .order('question_idx', { ascending: true });
    if (turnsErr) throw turnsErr;

    const totalTimeSec = Math.max(0, Math.floor((Date.now() - new Date(interview.started_at).getTime()) / 1000));

    // Lock the session first — a slow/failed evaluator call must never leave
    // the candidate able to keep answering after they've asked to finish.
    const { error: lockErr } = await supabaseAdmin
      .from('interviews')
      .update({ status: 'completed', completed_at: new Date().toISOString(), total_time_sec: totalTimeSec, answers_count: (turns || []).length })
      .eq('id', interview.id);
    if (lockErr) throw lockErr;

    await supabaseAdmin
      .from('magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', link.id);

    await supabaseAdmin
      .from('applications')
      .update({
        status: 'interview_completed',
        interview_started_at: interview.started_at,
        interview_completed_at: new Date().toISOString(),
      })
      .eq('id', appId);

    // Best-effort evaluator call — same posture as api/submit-interview.js:
    // the candidate's session is already locked and closed either way.
    try {
      const { data: analysis } = await supabaseAdmin
        .from('analyses').select('raw_response').eq('application_id', appId)
        .order('analyzed_at', { ascending: false }).limit(1).maybeSingle();
      const profile = analysis?.raw_response?.interview_profile || null;

      const transcriptText = buildTranscriptText(turns);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);
      const result = await evaluateConversationalInterview({
        name: app.name || '',
        profileSummary: profileSummaryText(profile),
        transcriptText,
        signal: controller.signal,
        systemPrompt: position.interview_system_prompt || null,
      });
      clearTimeout(timeoutId);

      if (result.ok) {
        const { evaluation, html } = extractEvaluationJson(result.html);
        const safeHtml = sanitizeHtml(html);
        const update = { ai_analysis_html: safeHtml };
        if (evaluation) {
          update.evaluation_json = evaluation;
          const gs = rescaleGlobalScore(evaluation.overall_evidence_score);
          if (gs !== null) update.global_score = gs;
        }
        await supabaseAdmin.from('interviews').update(update).eq('id', interview.id);
        await supabaseAdmin.from('application_events').insert({
          application_id: appId,
          event_type: 'conversational_interview_evaluated',
          event_data: {
            interview_id: interview.id,
            overall_evidence_score: evaluation?.overall_evidence_score ?? null,
            suggested_next_step: evaluation?.suggested_next_step ?? null,
          },
          actor: 'system',
        });
      } else {
        await supabaseAdmin.from('application_events').insert({
          application_id: appId,
          event_type: 'conversational_interview_evaluation_failed',
          event_data: { error: result.error, interview_id: interview.id },
          actor: 'system',
        });
      }
    } catch (evalErr) {
      console.error('[interview-chat/complete] evaluator error:', evalErr.message);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, interviewId: interview.id });
  } catch (e) {
    console.error('[interview-chat/complete] error:', e.message);
    return res.status(500).json({ ok: false, reason: 'server' });
  }
};

module.exports.profileSummaryText = profileSummaryText;
