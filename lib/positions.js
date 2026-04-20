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
const PROMPT_FIELDS = 'id, slug, title, subtitle, status, min_score_to_invite, cv_analysis_prompt, interview_system_prompt';

async function getPositionByApplication(applicationId) {
  if (!applicationId) return null;
  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('position_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (!app?.position_id) return null;
  const { data: pos } = await supabaseAdmin
    .from('positions')
    .select(PROMPT_FIELDS)
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

module.exports = { getPositionByApplication, getPositionBySlug, getPositionById };
