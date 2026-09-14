-- Conversational text interview (P0 MVP) — additive columns only.
--
-- Adds an alternate interview mode ("conversational_text") alongside the
-- existing fixed MCQ+open flow ("mcq", the default and only mode so far).
-- Every new column is nullable/defaulted so existing positions and existing
-- `interviews` rows are completely unaffected — this migration cannot change
-- behavior for any position that doesn't opt in via `interview_mode`.
--
-- Design notes (see docs/superpowers/... plan / project memory for the full
-- rationale): no new tables. `positions.interview_system_prompt` already
-- plays the "evaluator" role for the MCQ flow's open-question grading
-- (lib/interview-analysis.js) and keeps doing so here, just with richer
-- prompt content per position. `interview_answers` already gets fetched by
-- interview_id everywhere it's needed (api/admin/application.js), so turn
-- data rides along in a new jsonb column instead of a new table.

alter table positions add column if not exists interview_mode text
  not null default 'mcq' check (interview_mode in ('mcq', 'conversational_text'));

-- Static instructions for the live interviewer (spec §9): candidate intro
-- copy, follow-up rules, time budget, the prompt-injection refusal line.
-- Deliberately separate from interview_system_prompt (the evaluator prompt)
-- so the live-turn Claude call never has rubric text in its context.
alter table positions add column if not exists interview_orchestrator_prompt text;

-- The 4 mandatory anchor questions (spec §11) and the adaptive question bank
-- (spec §12), each with canonical case text + follow-up triggers. Canned
-- content, not free-text generation — see lib/interview-orchestrator.js.
alter table positions add column if not exists interview_anchor_bank jsonb;
alter table positions add column if not exists interview_adaptive_bank jsonb;

-- `interviews` becomes a live session record for conversational_text, not
-- just a completed-result row. `channel` and `status` default to values that
-- exactly match today's only insert path (api/submit-interview.js always
-- inserts a fully 'completed' 'mcq' row), so no existing code needs to
-- change to keep working.
alter table interviews add column if not exists channel text
  not null default 'mcq' check (channel in ('mcq', 'conversational_text'));
alter table interviews add column if not exists status text
  not null default 'completed' check (status in ('in_progress', 'completed', 'abandoned'));

-- Turn-by-turn orchestrator state (spec §22: elapsed time, anchors done/left,
-- adaptive-question budget, follow-up counters). Re-read and re-written on
-- every /respond call — no in-memory session, matching this codebase's
-- stateless-per-request pattern everywhere else.
alter table interviews add column if not exists orchestrator_state jsonb;

-- Structured evaluator output (spec §19: per-dimension scores, evidence,
-- confidence, suggested_next_step, investor-name validation). ai_analysis_html
-- (existing column) keeps holding the human-readable report, same as MCQ.
alter table interviews add column if not exists evaluation_json jsonb;

-- Per-turn metadata: exact question text shown (anchors are canned, but
-- follow-ups are chosen/generated at runtime so there's no static bank
-- entry to look them up by id later), domain, difficulty, turn kind
-- (anchor|followup|adaptive|adaptive_followup|clarification|candidate_question),
-- which turn it followed up on, and elapsed time at submission.
alter table interview_answers add column if not exists turn_meta jsonb;
