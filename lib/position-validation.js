// Validators for the prompt-as-data surface of `positions`.
//
// An admin pastes JSON blobs into the editor modal. A malformed block/question
// shape would render `interview.html` unusable for every candidate assigned
// to that position, so we fail the write at the API boundary rather than
// catching it downstream.
//
// Rules are deliberately tight — if an admin wants something the schema
// doesn't allow, that's a v2 conversation, not a schema bypass.

const SLUG_RE = /^[a-z0-9][a-z0-9\-]{1,40}$/;
const STATUSES = new Set(['active', 'paused', 'closed']);
const QUESTION_TYPES = new Set(['single', 'multi', 'salary', 'open']);
// `scale` exists in interview.html but is not supported here on purpose.
const INTERVIEW_MODES = new Set(['mcq', 'conversational_text']);
const DOMAIN_RE = /^[a-z0-9_\-]{1,60}$/;

function isNonEmptyString(v, max = 10000) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max;
}

function validateBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { ok: false, error: 'blocks_must_be_non_empty_array' };
  }
  if (blocks.length > 20) {
    return { ok: false, error: 'too_many_blocks' };
  }
  const seen = new Set();
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!b || typeof b !== 'object') {
      return { ok: false, error: `block_${i}_invalid_shape` };
    }
    if (!isNonEmptyString(b.id, 40) || !/^[a-z0-9_\-]+$/.test(b.id)) {
      return { ok: false, error: `block_${i}_invalid_id` };
    }
    if (seen.has(b.id)) {
      return { ok: false, error: `block_${i}_duplicate_id:${b.id}` };
    }
    seen.add(b.id);
    if (!isNonEmptyString(b.label, 80)) {
      return { ok: false, error: `block_${i}_invalid_label` };
    }
    if (!isNonEmptyString(b.icon, 10)) {
      return { ok: false, error: `block_${i}_invalid_icon` };
    }
    if (!isNonEmptyString(b.desc, 400)) {
      return { ok: false, error: `block_${i}_invalid_desc` };
    }
  }
  return { ok: true, blockIds: seen };
}

function validateQuestions(questions, blockIds) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, error: 'questions_must_be_non_empty_array' };
  }
  if (questions.length > 50) {
    return { ok: false, error: 'too_many_questions' };
  }
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') {
      return { ok: false, error: `question_${i}_invalid_shape` };
    }
    if (!isNonEmptyString(q.block, 40) || !blockIds.has(q.block)) {
      return { ok: false, error: `question_${i}_unknown_block:${q.block}` };
    }
    if (!QUESTION_TYPES.has(q.type)) {
      return { ok: false, error: `question_${i}_invalid_type:${q.type}` };
    }
    if (!Number.isInteger(q.w) || q.w < 1 || q.w > 5) {
      return { ok: false, error: `question_${i}_invalid_weight` };
    }
    if (!isNonEmptyString(q.text, 2000)) {
      return { ok: false, error: `question_${i}_invalid_text` };
    }
    if (q.hint !== undefined && q.hint !== null && typeof q.hint !== 'string') {
      return { ok: false, error: `question_${i}_invalid_hint` };
    }
    if (q.hint && q.hint.length > 1000) {
      return { ok: false, error: `question_${i}_hint_too_long` };
    }
    if (!Number.isInteger(q.min) || q.min < 0 || q.min > 600) {
      return { ok: false, error: `question_${i}_invalid_min` };
    }
    if (!Number.isInteger(q.sus) || q.sus < 0 || q.sus > 3600) {
      return { ok: false, error: `question_${i}_invalid_sus` };
    }

    if (q.type === 'salary') {
      // No options, no correct.
      if (q.options !== undefined && q.options !== null) {
        return { ok: false, error: `question_${i}_salary_must_not_have_options` };
      }
      continue;
    }

    if (q.type === 'open') {
      // Free-text answer graded by the LLM (case_score) — no options, no
      // correct. `minChars` drives the depth-gated fallback score and the
      // counter shown to the candidate (interview.html caps input at 10000).
      if (q.options !== undefined && q.options !== null) {
        return { ok: false, error: `question_${i}_open_must_not_have_options` };
      }
      if (q.correct !== undefined) {
        return { ok: false, error: `question_${i}_open_must_not_have_correct` };
      }
      if (q.minChars !== undefined && q.minChars !== null) {
        if (!Number.isInteger(q.minChars) || q.minChars < 0 || q.minChars > 10000) {
          return { ok: false, error: `question_${i}_invalid_minChars` };
        }
      }
      continue;
    }

    // single or multi → need options.
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10) {
      return { ok: false, error: `question_${i}_invalid_options_count` };
    }
    for (let j = 0; j < q.options.length; j++) {
      if (!isNonEmptyString(q.options[j], 500)) {
        return { ok: false, error: `question_${i}_option_${j}_invalid` };
      }
    }
    if (q.type === 'single') {
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
        // `correct` is optional ONLY for the motivation block (no scoring).
        // Motivation block is identified by block id === 'motivation' — if the
        // admin wants a non-scored single question in a different block they
        // must still put it under block id 'motivation' or accept scoring.
        if (q.block !== 'motivation' || q.correct !== undefined) {
          return { ok: false, error: `question_${i}_invalid_correct` };
        }
      }
    }
    // multi questions never have `correct` (no "right answer" — multi is
    // used for self-report style questions like frameworks worked with).
    if (q.type === 'multi' && q.correct !== undefined) {
      return { ok: false, error: `question_${i}_multi_must_not_have_correct` };
    }
  }
  return { ok: true };
}

// Shape shared by anchor and adaptive bank entries (conversational_text
// mode, spec §11/§12). Follow-ups are canned trigger→question pairs — the
// live orchestrator picks among them, it doesn't generate new ones, so the
// exact candidate-facing wording is pinned in this reviewed content, not at
// runtime. `evidence` is free-form prose for the evaluator prompt author to
// read (not scored programmatically), kept short.
function validateQuestionBankEntry(entry, i, label) {
  if (!entry || typeof entry !== 'object') {
    return { ok: false, error: `${label}_${i}_invalid_shape` };
  }
  if (!isNonEmptyString(entry.id, 40) || !/^[a-z0-9_\-]+$/.test(entry.id)) {
    return { ok: false, error: `${label}_${i}_invalid_id` };
  }
  if (!isNonEmptyString(entry.domain, 60) || !DOMAIN_RE.test(entry.domain)) {
    return { ok: false, error: `${label}_${i}_invalid_domain` };
  }
  if (!isNonEmptyString(entry.case_text, 4000)) {
    return { ok: false, error: `${label}_${i}_invalid_case_text` };
  }
  if (entry.evidence !== undefined && entry.evidence !== null) {
    if (typeof entry.evidence !== 'string' || entry.evidence.length > 2000) {
      return { ok: false, error: `${label}_${i}_invalid_evidence` };
    }
  }
  if (!Array.isArray(entry.followups)) {
    return { ok: false, error: `${label}_${i}_followups_must_be_array` };
  }
  if (entry.followups.length > 8) {
    return { ok: false, error: `${label}_${i}_too_many_followups` };
  }
  for (let j = 0; j < entry.followups.length; j++) {
    const f = entry.followups[j];
    if (!f || typeof f !== 'object') {
      return { ok: false, error: `${label}_${i}_followup_${j}_invalid_shape` };
    }
    if (!isNonEmptyString(f.trigger, 300)) {
      return { ok: false, error: `${label}_${i}_followup_${j}_invalid_trigger` };
    }
    if (!isNonEmptyString(f.question, 500)) {
      return { ok: false, error: `${label}_${i}_followup_${j}_invalid_question` };
    }
  }
  return { ok: true };
}

// Exactly 4 mandatory anchors (spec §11) — comparability across every
// candidate depends on this count never drifting.
function validateAnchorBank(bank) {
  if (!Array.isArray(bank) || bank.length !== 4) {
    return { ok: false, error: 'anchor_bank_must_have_exactly_4_entries' };
  }
  const seen = new Set();
  for (let i = 0; i < bank.length; i++) {
    const r = validateQuestionBankEntry(bank[i], i, 'anchor');
    if (!r.ok) return r;
    if (seen.has(bank[i].id)) return { ok: false, error: `anchor_${i}_duplicate_id:${bank[i].id}` };
    seen.add(bank[i].id);
  }
  return { ok: true };
}

// At least 1 adaptive question so the orchestrator has something to pick
// from (spec §12 lists 7 — B1..B7 — but a smaller curated set is valid too).
function validateAdaptiveBank(bank) {
  if (!Array.isArray(bank) || bank.length < 1 || bank.length > 12) {
    return { ok: false, error: 'adaptive_bank_invalid_count' };
  }
  const seen = new Set();
  for (let i = 0; i < bank.length; i++) {
    const r = validateQuestionBankEntry(bank[i], i, 'adaptive');
    if (!r.ok) return r;
    if (seen.has(bank[i].id)) return { ok: false, error: `adaptive_${i}_duplicate_id:${bank[i].id}` };
    seen.add(bank[i].id);
  }
  return { ok: true };
}

// Top-level validator for the full position payload. Used by POST create and
// by PATCH whenever the caller sends a field we care about.
function validatePosition(payload, { requireAll = false } = {}) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'invalid_payload' };
  }

  if (requireAll || payload.slug !== undefined) {
    if (typeof payload.slug !== 'string' || !SLUG_RE.test(payload.slug)) {
      return { ok: false, error: 'invalid_slug' };
    }
  }
  if (requireAll || payload.title !== undefined) {
    if (!isNonEmptyString(payload.title, 200)) {
      return { ok: false, error: 'invalid_title' };
    }
  }
  if (payload.subtitle !== undefined && payload.subtitle !== null) {
    if (typeof payload.subtitle !== 'string' || payload.subtitle.length > 200) {
      return { ok: false, error: 'invalid_subtitle' };
    }
  }
  if (payload.status !== undefined) {
    if (!STATUSES.has(payload.status)) {
      return { ok: false, error: 'invalid_status' };
    }
  }
  if (payload.share_with_headhunters !== undefined) {
    if (typeof payload.share_with_headhunters !== 'boolean') {
      return { ok: false, error: 'invalid_share_with_headhunters' };
    }
  }
  if (payload.min_score_to_invite !== undefined) {
    if (!Number.isInteger(payload.min_score_to_invite)
        || payload.min_score_to_invite < 1
        || payload.min_score_to_invite > 10) {
      return { ok: false, error: 'invalid_min_score_to_invite' };
    }
  }
  if (payload.public_intro_html !== undefined && payload.public_intro_html !== null) {
    if (typeof payload.public_intro_html !== 'string' || payload.public_intro_html.length > 50000) {
      return { ok: false, error: 'invalid_public_intro_html' };
    }
  }
  if (requireAll || payload.cv_analysis_prompt !== undefined) {
    if (!isNonEmptyString(payload.cv_analysis_prompt, 30000)) {
      return { ok: false, error: 'invalid_cv_analysis_prompt' };
    }
  }
  if (requireAll || payload.interview_system_prompt !== undefined) {
    if (!isNonEmptyString(payload.interview_system_prompt, 30000)) {
      return { ok: false, error: 'invalid_interview_system_prompt' };
    }
  }

  // interview_mode gates the three conversational_text-only fields below.
  // 'mcq' stays the default everywhere (positions that never send this key
  // keep behaving exactly as before — see the migration's column default).
  let mode = payload.interview_mode;
  if (mode !== undefined) {
    if (!INTERVIEW_MODES.has(mode)) {
      return { ok: false, error: 'invalid_interview_mode' };
    }
  } else if (requireAll) {
    mode = 'mcq';
  }

  if (mode === 'conversational_text') {
    // On create (requireAll), or whenever the mode itself is being set to
    // conversational_text, the interviewer content must come along with it
    // — a live position can't run with a null orchestrator prompt or an
    // empty question bank. On an ordinary PATCH to an already-conversational
    // position (mode not resent), only validate whichever of the three
    // fields the caller actually sent, same partial-update posture as
    // everything else in this function.
    const settingMode = payload.interview_mode === 'conversational_text';
    if (requireAll || settingMode || payload.interview_orchestrator_prompt !== undefined) {
      if (!isNonEmptyString(payload.interview_orchestrator_prompt, 30000)) {
        return { ok: false, error: 'invalid_interview_orchestrator_prompt' };
      }
    }
    if (requireAll || settingMode || payload.interview_anchor_bank !== undefined) {
      const r = validateAnchorBank(payload.interview_anchor_bank);
      if (!r.ok) return r;
    }
    if (requireAll || settingMode || payload.interview_adaptive_bank !== undefined) {
      const r = validateAdaptiveBank(payload.interview_adaptive_bank);
      if (!r.ok) return r;
    }
  } else {
    // mode is 'mcq' (default): reject a conversational field arriving with
    // no mode change — it would silently sit unused, which is more likely a
    // mistake than intent (e.g. an admin editing the wrong tab).
    if (payload.interview_orchestrator_prompt !== undefined
        || payload.interview_anchor_bank !== undefined
        || payload.interview_adaptive_bank !== undefined) {
      return { ok: false, error: 'conversational_fields_require_conversational_text_mode' };
    }
  }

  // Blocks + questions must be validated together — questions reference block
  // ids. If the caller is sending one but not the other, we cannot safely
  // partial-validate, so reject the PATCH.
  const hasBlocks = payload.interview_blocks !== undefined;
  const hasQuestions = payload.interview_questions !== undefined;
  if (requireAll || hasBlocks || hasQuestions) {
    if (!hasBlocks || !hasQuestions) {
      return { ok: false, error: 'blocks_and_questions_must_be_sent_together' };
    }
    const blocksResult = validateBlocks(payload.interview_blocks);
    if (!blocksResult.ok) return blocksResult;
    const qResult = validateQuestions(payload.interview_questions, blocksResult.blockIds);
    if (!qResult.ok) return qResult;
  }

  return { ok: true };
}

module.exports = {
  validateBlocks,
  validateQuestions,
  validateAnchorBank,
  validateAdaptiveBank,
  validatePosition,
  SLUG_RE,
};
