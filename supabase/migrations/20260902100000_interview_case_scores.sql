-- Server-side interview scoring.
--
-- `correct` indices no longer leave the server (api/interview/config.js) and
-- api/submit-interview.js recomputes global_score / dim_scores / verdict from
-- the position's question bank. Open (free-text) questions are graded by the
-- LLM, which appends `<!--SCORES {"<idx>": 0-10}-->` to its report; those
-- per-question scores are kept here for auditability and re-scoring.
alter table interviews add column if not exists case_scores jsonb;
