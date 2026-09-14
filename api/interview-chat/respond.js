// POST /api/interview-chat/respond
//
// Body: { token, sessionId, kind: 'answer' | 'clarify', text }
//
// The single turn handler for the conversational text interview. Every
// request re-derives state from Supabase (interviews.orchestrator_state) —
// no in-memory session, matching every other route in this codebase.
//
// Session-recovery guarantee (spec §24.4): the candidate's submitted answer
// is persisted to interview_answers BEFORE any Claude call is made. If the
// Claude call that follows then fails or times out, the answer is already
// durably stored and a client retry just re-runs the turn-decision logic —
// the candidate never has to retype anything.
//
// Prompt-injection guard (spec §28) is a code-level pre-check
// (lib/interview-orchestrator.js:detectInjectionAttempt) run BEFORE any
// Claude call for the turn — a match never reaches the model.
//
// Two Claude calls can happen per turn, both tightly scoped and NEITHER
// ever receives the evaluator rubric (positions.interview_system_prompt) —
// that document is loaded only by lib/interview-chat-analysis.js in
// complete.js, after the interview is over:
//   1. classifyAnswer — given the current question, its fixed candidate
//      follow-up triggers, and the candidate's answer, decide whether a
//      follow-up is warranted and, if so, which trigger applies. Returns a
//      closed-set choice (a trigger index) — the follow-up TEXT itself is
//      always the pre-written, reviewed string from the position's bank,
//      never freely generated.
//   2. pickAdaptiveQuestion — runs once, at the anchor→adaptive transition,
//      to choose which of the adaptive bank's canned questions best targets
//      the CV profile's weakest evidenced areas. Also a closed-set choice
//      (an id from the bank), with a deterministic fallback if the call
//      fails so a flaky API response never stalls the interview.

const { supabaseAdmin } = require('../../lib/supabase');
const { hashToken, isValidTokenFormat } = require('../../lib/tokens');
const { getPositionByApplication } = require('../../lib/positions');
const orch = require('../../lib/interview-orchestrator');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const CLARIFY_MAX = 3;
const REFUSAL_LINE = 'No puedo mostrar los criterios internos durante la entrevista. Responde como abordarías tú la situación.';
const CLARIFY_LINE = 'Puedes asumir lo que consideres razonable, dejando explícita tu hipótesis; no hay más datos disponibles sobre el caso además de los ya indicados.';

async function callClaude({ system, user, maxTokens, signal }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: 'missing_api_key' };
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        output_config: { effort: 'low' },
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error?.message || `api_error_${resp.status}` };
    }
    const data = await resp.json();
    const text = data.content?.find(c => c.type === 'text')?.text || '{}';
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e.message || 'network_error' };
  }
}

// Never receives the evaluator rubric — only this one question's own
// candidate-facing triggers. Returns { followupNeeded, triggerIndex }.
function parseClassifyResponse(raw, triggerCount) {
  try {
    const j = JSON.parse(String(raw || '{}').replace(/```json|```/g, '').trim());
    const needed = j.followup_needed === true;
    const idx = Number.isInteger(j.trigger_index) ? j.trigger_index : null;
    if (needed && Number.isInteger(idx) && idx >= 0 && idx < triggerCount) {
      return { followupNeeded: true, triggerIndex: idx };
    }
    return { followupNeeded: false, triggerIndex: null };
  } catch {
    return { followupNeeded: false, triggerIndex: null };
  }
}

async function classifyAnswer({ questionText, triggers, answerText, signal }) {
  if (!Array.isArray(triggers) || triggers.length === 0) {
    return { followupNeeded: false, triggerIndex: null };
  }
  const system = 'Eres un clasificador de respuestas de entrevista técnica. No evalúas calidad ni asignas puntuación: solo decides si una repregunta concreta de una lista cerrada añadiría información relevante. No tienes acceso a ningún criterio de puntuación. Responde SOLO con JSON: {"followup_needed": true|false, "trigger_index": <índice entero de la lista o null>}. Elige como mucho un índice, el que mejor describa por qué la respuesta lo necesita. Si la respuesta ya es concreta, razonada y con nombres/decisiones propias cuando corresponde, responde followup_needed:false.';
  const user = `PREGUNTA: ${questionText}\n\nMOTIVOS DE REPREGUNTA DISPONIBLES (elige uno por índice si aplica):\n${triggers.map((t, i) => `${i}: ${t.trigger}`).join('\n')}\n\nRESPUESTA DEL CANDIDATO:\n${String(answerText || '').slice(0, 4000)}`;
  const r = await callClaude({ system, user, maxTokens: 200, signal });
  if (!r.ok) return { followupNeeded: false, triggerIndex: null }; // fail open: move on rather than stall
  return parseClassifyResponse(r.text, triggers.length);
}

// Closed-set pick from the adaptive bank. Falls back to the first unused
// entry if the call fails or returns something outside the bank.
function parseAdaptivePick(raw, bank) {
  try {
    const j = JSON.parse(String(raw || '{}').replace(/```json|```/g, '').trim());
    const id = typeof j.adaptive_id === 'string' ? j.adaptive_id : null;
    if (id && bank.some(b => b.id === id)) return id;
  } catch { /* fall through to fallback */ }
  return bank[0]?.id || null;
}

async function pickAdaptiveQuestion({ profile, adaptiveBank, signal }) {
  if (!Array.isArray(adaptiveBank) || adaptiveBank.length === 0) return null;
  const areas = Array.isArray(profile?.areas_to_probe) ? profile.areas_to_probe : [];
  const system = 'Eliges UNA pregunta adaptativa de una lista cerrada para una entrevista técnica, en función de qué área del perfil del candidato tiene menos evidencia. No evalúas ni puntúas. Responde SOLO con JSON: {"adaptive_id": "<uno de los ids de la lista>"}.';
  const user = `ÁREAS A PROFUNDIZAR SEGÚN EL CV (menos evidenciadas): ${areas.length ? areas.join(', ') : 'sin datos de CV'}\n\nPREGUNTAS DISPONIBLES:\n${adaptiveBank.map(a => `id=${a.id} dominio=${a.domain}: ${a.case_text.slice(0, 160)}`).join('\n')}`;
  const r = await callClaude({ system, user, maxTokens: 100, signal });
  if (!r.ok) return adaptiveBank[0]?.id || null; // deterministic fallback, never stall the interview
  return parseAdaptivePick(r.text, adaptiveBank);
}

function turnKindFor(phase) {
  if (phase === orch.PHASES.FOLLOWUP) return 'followup';
  if (phase === orch.PHASES.ADAPTIVE) return 'adaptive';
  if (phase === orch.PHASES.ADAPTIVE_FOLLOWUP) return 'adaptive_followup';
  return 'anchor';
}

module.exports.default = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'method' });

  const body = req.body || {};
  const { token, sessionId } = body;
  const kind = body.kind === 'clarify' ? 'clarify' : 'answer';
  const text = typeof body.text === 'string' ? body.text.slice(0, 8000) : '';
  if (!token || !isValidTokenFormat(token)) return res.status(400).json({ ok: false, reason: 'invalid' });
  if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ ok: false, reason: 'invalid_session' });
  if (kind === 'answer' && !text.trim()) return res.status(400).json({ ok: false, reason: 'empty_answer' });

  try {
    const { data: link, error: linkErr } = await supabaseAdmin
      .from('magic_links')
      .select('id, application_id, expires_at, used_at, purpose')
      .eq('token_hash', hashToken(token))
      .eq('purpose', 'interview')
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link || link.used_at || new Date(link.expires_at) < new Date()) {
      return res.status(200).json({ ok: false, reason: 'invalid_link' });
    }
    const appId = link.application_id;

    const { data: interview, error: ivErr } = await supabaseAdmin
      .from('interviews')
      .select('id, application_id, channel, status, orchestrator_state, started_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (ivErr) throw ivErr;
    if (!interview || interview.application_id !== appId || interview.channel === 'mcq') {
      return res.status(200).json({ ok: false, reason: 'session_not_found' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(200).json({ ok: false, reason: 'session_closed' });
    }

    const position = await getPositionByApplication(appId, { withConversational: true });
    if (!position || position.interview_mode !== 'conversational_text') {
      return res.status(200).json({ ok: false, reason: 'wrong_interview_mode' });
    }
    const anchorBank = position.interview_anchor_bank || [];
    const adaptiveBank = position.interview_adaptive_bank || [];
    const anchorById = new Map(anchorBank.map(a => [a.id, a]));

    let state = interview.orchestrator_state;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(interview.started_at).getTime()) / 1000));
    state = { ...state, elapsedSeconds };

    // Hard stop, no exceptions: never process another turn past 15 minutes.
    if (orch.isHardTimeUp(state)) {
      state = orch.markClosing(state);
      await persistState(interview.id, state);
      return res.status(200).json({ ok: true, closing: true, sessionComplete: true, message: CLOSING_COPY() });
    }

    if (kind === 'clarify') {
      if (state.candidateClarificationsUsed >= CLARIFY_MAX) {
        return res.status(200).json({ ok: true, clarification: 'Ya hemos aclarado varios puntos de este caso — responde con la mejor hipótesis que tengas.' });
      }
      state = orch.recordClarificationUsed(state);
      await supabaseAdmin.from('application_events').insert({
        application_id: appId,
        event_type: 'conversational_interview_clarification',
        event_data: { interview_id: interview.id, question_id: state.currentQuestionId },
        actor: 'candidate',
      });
      await persistState(interview.id, state);
      return res.status(200).json({ ok: true, clarification: CLARIFY_LINE });
    }

    // kind === 'answer'
    if (orch.detectInjectionAttempt(text)) {
      await supabaseAdmin.from('application_events').insert({
        application_id: appId,
        event_type: 'conversational_interview_injection_attempt',
        event_data: { interview_id: interview.id, question_id: state.currentQuestionId },
        actor: 'candidate',
      });
      // Not persisted as an answer — the current question stays open and the
      // candidate is asked to actually respond to it.
      return res.status(200).json({ ok: true, refusal: REFUSAL_LINE, question: { text: state.currentQuestionText, progress: progressOf(state) } });
    }

    // 1. PERSIST the answer BEFORE any Claude call (session recovery, §24.4).
    const questionIdx = Math.max(0, state.questionsAsked.length - 1);
    const turnMeta = {
      question_text: state.currentQuestionText,
      domain: state.currentQuestionDomain,
      difficulty: state.currentQuestionDifficulty,
      turn_kind: turnKindFor(state.phase),
      elapsed_seconds_at_submit: elapsedSeconds,
    };
    const { error: upsertErr } = await supabaseAdmin
      .from('interview_answers')
      .upsert({
        interview_id: interview.id,
        question_idx: questionIdx,
        question_type: 'open',
        answer_text: text,
        time_sec: elapsedSeconds,
        turn_meta: turnMeta,
      }, { onConflict: 'interview_id,question_idx' });
    if (upsertErr) throw upsertErr;

    // 2. Decide whether a follow-up is warranted (skip the Claude call
    //    entirely once the time gates already forbid one — cheaper and
    //    keeps the interview moving as the clock runs out).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      if (orch.canAskFollowup(state)) {
        const currentAnchor = state.currentQuestionKind === 'anchor' ? anchorById.get(state.currentQuestionId) : null;
        const currentAdaptive = state.currentQuestionKind === 'adaptive'
          ? adaptiveBank.find(a => a.id === state.currentQuestionId) : null;
        const triggers = (currentAnchor || currentAdaptive)?.followups || [];
        const { followupNeeded, triggerIndex } = await classifyAnswer({
          questionText: state.currentQuestionText, triggers, answerText: text, signal: controller.signal,
        });
        if (followupNeeded) {
          const followupText = triggers[triggerIndex].question;
          state = orch.recordFollowupAsked(state, followupText);
          await persistState(interview.id, state);
          return res.status(200).json({ ok: true, question: { text: followupText, progress: progressOf(state) } });
        }
      }

      // 3. No follow-up — advance the deterministic plan.
      if (state.currentQuestionKind === 'anchor') state = orch.completeCurrentAnchor(state);
      const next = orch.chooseNextQuestion(state);

      if (next.action === 'ask_anchor') {
        const anchor = anchorById.get(next.anchorId);
        state = orch.recordQuestionAsked(state, { id: anchor.id, kind: 'anchor', text: anchor.case_text, domain: anchor.domain });
        await persistState(interview.id, state);
        return res.status(200).json({ ok: true, question: { text: anchor.case_text, progress: progressOf(state) } });
      }

      if (next.action === 'ask_adaptive_pending_pick') {
        state = orch.markAdaptivePendingPick(state);
        const { data: analysis } = await supabaseAdmin
          .from('analyses').select('raw_response').eq('application_id', appId)
          .order('analyzed_at', { ascending: false }).limit(1).maybeSingle();
        const profile = analysis?.raw_response?.interview_profile || null;
        const adaptiveId = await pickAdaptiveQuestion({ profile, adaptiveBank, signal: controller.signal });
        const adaptive = adaptiveBank.find(a => a.id === adaptiveId) || adaptiveBank[0];
        if (!adaptive) {
          state = orch.markClosing(state);
          await persistState(interview.id, state);
          return res.status(200).json({ ok: true, closing: true, sessionComplete: true, message: CLOSING_COPY() });
        }
        state = orch.recordAdaptiveSelected(state, { id: adaptive.id, text: adaptive.case_text, domain: adaptive.domain });
        await persistState(interview.id, state);
        return res.status(200).json({ ok: true, question: { text: adaptive.case_text, progress: progressOf(state) } });
      }

      // closing
      state = orch.markClosing(state);
      await persistState(interview.id, state);
      return res.status(200).json({ ok: true, closing: true, sessionComplete: true, message: CLOSING_COPY() });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (e) {
    console.error('[interview-chat/respond] error:', e.message);
    return res.status(500).json({ ok: false, reason: 'server' });
  }
};

async function persistState(interviewId, state) {
  const { error } = await supabaseAdmin
    .from('interviews')
    .update({ orchestrator_state: state })
    .eq('id', interviewId);
  if (error) throw error;
}

function progressOf(state) {
  return { completed: state.anchorsCompleted.length, total: 4 };
}

function CLOSING_COPY() {
  return 'Gracias. Hemos terminado la entrevista. El equipo de Alter5 revisará tus respuestas junto con el resto de tu candidatura.';
}

module.exports.parseClassifyResponse = parseClassifyResponse;
module.exports.parseAdaptivePick = parseAdaptivePick;
module.exports.turnKindFor = turnKindFor;
module.exports.progressOf = progressOf;
module.exports.CLOSING_COPY = CLOSING_COPY;
module.exports.REFUSAL_LINE = REFUSAL_LINE;
module.exports.CLARIFY_LINE = CLARIFY_LINE;
