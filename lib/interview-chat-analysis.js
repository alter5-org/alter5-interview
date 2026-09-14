// Post-interview evaluator for the conversational text interview (spec
// §4.3/§16-19). Close copy of lib/interview-analysis.js's single-shot Claude
// call pattern — same fetch, same model env var, same caller-supplied
// AbortController so api/interview-chat/complete.js can guard the same
// 50s-inside-60s Vercel budget as api/submit-interview.js already does.
//
// Deliberately a SEPARATE call from the live interviewer (lib/interview-
// orchestrator.js + the per-turn Claude call in api/interview-chat/respond.js):
// this is the only place the position's rubric (interview_system_prompt) is
// ever loaded as a system prompt, so a leaked interviewer turn can never
// reveal it — see docs/positions/responsable-transacciones/orchestrator-prompt.md.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

function safe(s) {
  return String(s || '').replace(/[<>"'&]/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c]);
}
function stripXmlBreakout(s) {
  return String(s || '').replace(/<\/?interview_responses>/gi, '');
}

// Input: { name, profileSummary, transcriptText, signal, systemPrompt }
// transcriptText: the full turn-by-turn conversation, already formatted by
// the caller (question + answer pairs, in order — see buildTranscriptText
// below for the shared formatting so respond.js/complete.js don't drift).
async function evaluateConversationalInterview({ name, profileSummary, transcriptText, signal, systemPrompt = null }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: 'missing_api_key' };
  if (!transcriptText) return { ok: false, error: 'missing_transcript' };
  if (typeof systemPrompt !== 'string' || !systemPrompt.trim()) {
    return { ok: false, error: 'missing_system_prompt' };
  }

  const userContent = `CANDIDATO: ${safe(name)}
PERFIL DEL CV (contexto, no prueba de competencia): ${safe(profileSummary || 'no disponible')}

<interview_responses>
${stripXmlBreakout(String(transcriptText).slice(0, 60000))}
</interview_responses>`;

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
        max_tokens: 8000,
        output_config: { effort: 'low' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error?.message || `api_error_${resp.status}` };
    }
    const data = await resp.json();
    const html = data.content?.find(c => c.type === 'text')?.text || '';
    return { ok: true, html, model: MODEL };
  } catch (e) {
    return { ok: false, error: e.message || 'network_error' };
  }
}

// The evaluator ends its HTML with a single-line
// `<!--EVALUATION {...}-->` comment (spec §19 shape). Pull it out and strip
// it before the HTML is sanitized/stored, mirroring
// lib/interview-scoring.js's extractCaseScores. Tolerates a missing or
// malformed trailer — admin still gets the HTML report either way, just
// without structured per-dimension fields that render sorting/filtering.
const EVALUATION_RE = /<!--\s*EVALUATION\s*(\{[\s\S]*?\})\s*-->/i;

const DIMENSION_KEYS = [
  'corporate_financing', 'project_finance', 'investor_knowledge',
  'transaction_judgement', 'ownership_execution', 'commercial_judgement',
  'technology_mindset', 'communication_clarity',
];

function extractEvaluationJson(html) {
  const src = String(html || '');
  const m = src.match(EVALUATION_RE);
  if (!m) return { evaluation: null, html: src };
  const cleaned = src.replace(EVALUATION_RE, '').trim();
  let parsed;
  try { parsed = JSON.parse(m[1]); } catch { return { evaluation: null, html: cleaned }; }
  if (!parsed || typeof parsed !== 'object') return { evaluation: null, html: cleaned };

  // Light normalization only — this is a display/audit payload, not a
  // scoring input, so we don't re-derive anything from it server-side.
  const dims = parsed.dimensions && typeof parsed.dimensions === 'object' ? parsed.dimensions : {};
  const dimensions = {};
  for (const key of DIMENSION_KEYS) {
    const d = dims[key];
    if (!d || typeof d !== 'object') { dimensions[key] = { score_0_4: null, confidence: 'low', tested: false }; continue; }
    const score = Number.isFinite(Number(d.score_0_4)) ? Math.min(4, Math.max(0, Number(d.score_0_4))) : null;
    dimensions[key] = {
      score_0_4: d.tested === false ? null : score,
      confidence: ['high', 'medium', 'low'].includes(d.confidence) ? d.confidence : 'low',
      tested: !!d.tested,
      evidence: Array.isArray(d.evidence) ? d.evidence.slice(0, 10).map(e => String(e).slice(0, 500)) : [],
      ...(key === 'investor_knowledge' && Array.isArray(d.named_institutions)
        ? { named_institutions: d.named_institutions.slice(0, 20).map(n => ({
            name: String(n?.name || '').slice(0, 200),
            validation: n?.validation === 'confirmed_match' ? 'confirmed_match' : 'unverified',
            candidate_rationale: String(n?.candidate_rationale || '').slice(0, 500),
          })) }
        : {}),
    };
  }

  const overall = Number.isFinite(Number(parsed.overall_evidence_score))
    ? Math.min(100, Math.max(0, Math.round(Number(parsed.overall_evidence_score))))
    : null;

  const evaluation = {
    overall_evidence_score: overall,
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
    suggested_next_step: typeof parsed.suggested_next_step === 'string' ? parsed.suggested_next_step : null,
    dimensions,
    strongest_evidence: Array.isArray(parsed.strongest_evidence) ? parsed.strongest_evidence.slice(0, 5).map(String) : [],
    main_uncertainties: Array.isArray(parsed.main_uncertainties) ? parsed.main_uncertainties.slice(0, 5).map(String) : [],
    contradictions_for_human_review: Array.isArray(parsed.contradictions_for_human_review)
      ? parsed.contradictions_for_human_review.slice(0, 5).map(String) : [],
    human_interview_focus: Array.isArray(parsed.human_interview_focus) ? parsed.human_interview_focus.slice(0, 5).map(String) : [],
  };

  return { evaluation, html: cleaned };
}

// overall_evidence_score (0-100) → the existing 0-10 global_score convention
// (interviews.global_score), so admin sorting/filtering keeps working the
// same way across both interview channels without special-casing.
function rescaleGlobalScore(overallEvidenceScore) {
  if (!Number.isFinite(overallEvidenceScore)) return null;
  return Math.round((Math.min(100, Math.max(0, overallEvidenceScore)) / 100) * 10 * 10) / 10;
}

// Builds the transcript text sent to the evaluator from persisted
// interview_answers rows (each carrying turn_meta — see the migration).
// Shared by respond.js's in-progress reads and complete.js's final read so
// the exact same formatting always reaches the model.
function buildTranscriptText(turns) {
  return (turns || [])
    .map((t, i) => {
      const meta = t.turn_meta || {};
      const kind = meta.turn_kind || 'anchor';
      const q = meta.question_text || t.question_text || '';
      const a = t.answer_text || '(sin respuesta)';
      const mm = Math.floor((meta.elapsed_seconds_at_submit || 0) / 60);
      const ss = String((meta.elapsed_seconds_at_submit || 0) % 60).padStart(2, '0');
      return `#${i} [${kind}] ${q}\nRespuesta: ${a}\nTiempo acumulado: ${mm}:${ss}`;
    })
    .join('\n\n');
}

module.exports = {
  evaluateConversationalInterview,
  extractEvaluationJson,
  rescaleGlobalScore,
  buildTranscriptText,
  DIMENSION_KEYS,
  MODEL,
};
