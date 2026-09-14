// POST /api/interview-chat/start
//
// Body: { token }
// Starts (or resumes) a conversational text interview session for the
// magic-link owner. Idempotent: a candidate who reloads mid-session gets
// back the SAME in-progress session and its current question, never a new
// one — this is the session-recovery guarantee from the plan (persist
// before you risk losing it), applied at the session-creation boundary too.
//
// Returns:
//   { ok:true, resumed, sessionId, intro, question: { text, progress },
//     history: [{ questionText, answerText }] }
// or { ok:false, reason }.

const { supabaseAdmin } = require('../../lib/supabase');
const { hashToken, isValidTokenFormat } = require('../../lib/tokens');
const { getPositionByApplication } = require('../../lib/positions');
const orch = require('../../lib/interview-orchestrator');

function introCopy(orchestratorPrompt) {
  // The orchestrator prompt file carries the exact candidate-facing intro
  // text as a fenced block introduced by "INTRODUCCIÓN". Rather than parsing
  // markdown at request time, the position content also duplicates that
  // string is avoided by re-deriving it here from a fixed marker so there is
  // exactly one place (orchestrator-prompt.md) the copy is authored. If the
  // marker is missing (unexpected content edit), fall back to a minimal
  // neutral line rather than failing the whole session.
  const m = String(orchestratorPrompt || '').match(/INTRODUCCIÓN[^:]*:\s*\n*"([\s\S]*?)"/);
  return m ? m[1].trim() : 'Empezamos la entrevista técnica de Alter5.';
}

module.exports.default = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'method' });

  const { token } = req.body || {};
  if (!token || !isValidTokenFormat(token)) {
    return res.status(400).json({ ok: false, reason: 'invalid' });
  }

  try {
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('magic_links')
      .select('id, application_id, expires_at, used_at, purpose')
      .eq('token_hash', hashToken(token))
      .eq('purpose', 'interview')
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return res.status(200).json({ ok: false, reason: 'not_found' });
    if (link.used_at) return res.status(200).json({ ok: false, reason: 'used' });
    if (new Date(link.expires_at) < new Date()) {
      return res.status(200).json({ ok: false, reason: 'expired' });
    }
    const appId = link.application_id;

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('id, name, status, deleted_at, source')
      .eq('id', appId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app || app.deleted_at) return res.status(200).json({ ok: false, reason: 'not_found' });
    if (app.status === 'interview_completed') {
      return res.status(200).json({ ok: false, reason: 'completed' });
    }

    const position = await getPositionByApplication(appId, { withConversational: true });
    if (!position || position.interview_mode !== 'conversational_text') {
      // A magic link for this application exists but the position isn't
      // configured for this channel — fail loud rather than silently
      // degrade to a blank page.
      return res.status(200).json({ ok: false, reason: 'wrong_interview_mode' });
    }
    const anchorBank = position.interview_anchor_bank || [];
    const anchorById = new Map(anchorBank.map(a => [a.id, a]));
    if (anchorBank.length !== 4) {
      return res.status(200).json({ ok: false, reason: 'misconfigured_anchor_bank' });
    }

    // Resume an existing in-progress session for this application, if any.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('interviews')
      .select('id, status, orchestrator_state')
      .eq('application_id', appId)
      .eq('channel', 'conversational_text')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (exErr) throw exErr;

    if (existing && existing.status === 'in_progress') {
      const state = existing.orchestrator_state;
      const { data: turns, error: turnsErr } = await supabaseAdmin
        .from('interview_answers')
        .select('question_idx, answer_text, turn_meta')
        .eq('interview_id', existing.id)
        .order('question_idx', { ascending: true });
      if (turnsErr) throw turnsErr;

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ok: true,
        resumed: true,
        sessionId: existing.id,
        intro: introCopy(position.interview_orchestrator_prompt),
        question: { text: state.currentQuestionText, progress: progressOf(state) },
        history: (turns || []).map(t => ({
          questionText: t.turn_meta?.question_text || '',
          answerText: t.answer_text || '',
        })),
      });
    }

    // New session. Seed the deterministic state, pull the CV profile (if
    // any — the interview still proceeds without one, just less adaptive)
    // and ask anchor 1.
    const { data: analysis } = await supabaseAdmin
      .from('analyses')
      .select('raw_response')
      .eq('application_id', appId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const profile = analysis?.raw_response?.interview_profile || null;

    let state = orch.initState(anchorBank.map(a => a.id));
    const first = orch.chooseNextQuestion(state);
    if (first.action !== 'ask_anchor') {
      // Should be unreachable (4 fresh anchors always come first), but fail
      // loud instead of starting a broken session.
      return res.status(500).json({ ok: false, reason: 'orchestrator_error' });
    }
    const anchor = anchorById.get(first.anchorId);
    state = orch.recordQuestionAsked(state, {
      id: anchor.id, kind: 'anchor', text: anchor.case_text, domain: anchor.domain,
    });

    const { data: interview, error: ivErr } = await supabaseAdmin
      .from('interviews')
      .insert({
        application_id: appId,
        channel: 'conversational_text',
        status: 'in_progress',
        source: app.source || 'public',
        orchestrator_state: state,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (ivErr) throw ivErr;

    await supabaseAdmin.from('application_events').insert({
      application_id: appId,
      event_type: 'conversational_interview_started',
      event_data: { interview_id: interview.id, has_cv_profile: !!profile },
      actor: 'candidate',
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      resumed: false,
      sessionId: interview.id,
      intro: introCopy(position.interview_orchestrator_prompt),
      question: { text: anchor.case_text, progress: progressOf(state) },
      history: [],
    });
  } catch (e) {
    console.error('[interview-chat/start] error:', e.message);
    return res.status(500).json({ ok: false, reason: 'server' });
  }
};

// "1 de 4 áreas" style progress — the only signal shown to the candidate
// (spec §25: no timer, no score). Adaptive/follow-up turns still count
// against the same "4 áreas" denominator so the number never goes backwards.
function progressOf(state) {
  return { completed: state.anchorsCompleted.length, total: 4 };
}

module.exports.progressOf = progressOf;
module.exports.introCopy = introCopy;
