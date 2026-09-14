// Position lookup helpers.
//
// The CV-analysis and interview-analysis pipelines, plus several admin and
// public endpoints, all need to resolve a position from either an application
// id or a slug. Centralized here so the join logic and "what fields do we
// actually need at the LLM call site" question have one canonical answer.

const { supabaseAdmin } = require('./supabase');

// Just enough to drive analysis + email subjects. Avoid over-selecting:
// callers that need the full row (admin edit modal) hit
// /api/admin/positions/[id] which selects everything explicitly.
// interview_mode is a single scalar column (default 'mcq') cheap enough to
// always select — several callers (e.g. api/admin/review-decision.js) just
// need to know which link/page to route to, not the full conversational
// content.
const PROMPT_FIELDS = 'id, slug, title, subtitle, status, min_score_to_invite, cv_analysis_prompt, interview_system_prompt, interview_mode';
// Interview grading needs the question bank too (server-side scoring).
const SCORING_FIELDS = `${PROMPT_FIELDS}, interview_blocks, interview_questions`;
// The conversational text interview needs its own content on top of
// everything above: the live-interviewer prompt and the two question
// banks. interview_system_prompt (already selected above) doubles as the
// evaluator prompt in this mode too.
const CONVERSATIONAL_FIELDS = `${PROMPT_FIELDS}, interview_orchestrator_prompt, interview_anchor_bank, interview_adaptive_bank`;

async function getPositionByApplication(applicationId, { withInterview = false, withConversational = false } = {}) {
  if (!applicationId) return null;
  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('position_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (!app?.position_id) return null;
  const fields = withConversational ? CONVERSATIONAL_FIELDS : (withInterview ? SCORING_FIELDS : PROMPT_FIELDS);
  const { data: pos } = await supabaseAdmin
    .from('positions')
    .select(fields)
    .eq('id', app.position_id)
    .maybeSingle();
  return pos || null;
}

async function getPositionBySlug(slug) {
  if (!slug) return null;
  const { data: pos } = await supabaseAdmin
    .from('positions')
    .select(PROMPT_FIELDS)
    .eq('slug', slug)
    .maybeSingle();
  return pos || null;
}

async function getPositionById(id) {
  if (!id) return null;
  const { data: pos } = await supabaseAdmin
    .from('positions')
    .select(PROMPT_FIELDS)
    .eq('id', id)
    .maybeSingle();
  return pos || null;
}

// CV routing threshold, per position. `min_score_to_invite` is the minimum
// CV score that reaches the admin review queue; anything below is
// auto-rejected. Nobody is auto-invited from a score — invites are always a
// human decision (admin review, or an explicit autoInvite override on
// manual/partner uploads).
const DEFAULT_REVIEW_THRESHOLD = 4;

function reviewThreshold(position) {
  const t = position && Number.isInteger(position.min_score_to_invite)
    ? position.min_score_to_invite
    : DEFAULT_REVIEW_THRESHOLD;
  return Math.min(10, Math.max(1, t));
}

function routeCvScore(score, position) {
  if (!position) throw new Error('routeCvScore: position is required');
  return score >= reviewThreshold(position)
    ? 'analyzed_pending_review'
    : 'analyzed_auto_rejected';
}

module.exports = {
  getPositionByApplication,
  getPositionBySlug,
  getPositionById,
  routeCvScore,
  reviewThreshold,
  DEFAULT_REVIEW_THRESHOLD,
};
