// Server-side interview scoring.
//
// The browser (interview.html) still computes a provisional score for its
// own payload, but it no longer receives `correct` indices (see
// api/interview/config.js), so that number is not trustworthy. This module is
// the source of truth: it re-derives global_score / dim_scores / flags /
// verdict from the position's question bank plus the persisted answers.
//
// Scoring rules mirror the historical client rules so HoE scores stay
// comparable with pre-migration interviews:
//   single : correct → w*3, wrong → w*1 (partial credit), skipped → 0
//   multi  : ≥2 selections → w*3, 1 → w*2, 0 → 0
//   open   : LLM case score 0-10 → w*3*score/10 when available; otherwise a
//            depth-gated fallback by length (minChars) so the row has a score
//            before the grader finishes / if it fails.
//   salary and blocks `compensation` / `motivation` never score.
//
// Pure functions — no DB, no network — so they are unit-testable.

const NON_SCORING_BLOCKS = new Set(['compensation', 'motivation']);

function lengthFallbackPoints(q, text) {
  const len = typeof text === 'string' ? text.trim().length : 0;
  const thr = Number.isFinite(q.minChars) && q.minChars > 0 ? q.minChars : 50;
  if (len >= thr) return q.w * 3;
  if (len >= thr * 0.5) return q.w * 2;
  if (len >= thr * 0.25) return q.w;
  return 0;
}

function pointsFor(q, a, caseScore) {
  if (a.skipped) return 0;
  if (q.type === 'single') {
    const hasAnswer = typeof a.text === 'string' && a.text.length > 0;
    if (!hasAnswer) return 0;
    if (Number.isInteger(q.correct) && Array.isArray(q.options) && a.text === q.options[q.correct]) {
      return q.w * 3;
    }
    return q.w;
  }
  if (q.type === 'multi') {
    const n = Array.isArray(a.options) ? a.options.length : 0;
    if (n >= 2) return q.w * 3;
    if (n === 1) return q.w * 2;
    return 0;
  }
  if (q.type === 'open') {
    if (Number.isFinite(caseScore)) {
      const s = Math.min(10, Math.max(0, caseScore));
      return Math.round((q.w * 3 * s) / 10);
    }
    return lengthFallbackPoints(q, a.text);
  }
  if (q.type === 'scale') {
    const v = parseInt(a.text, 10) || 0;
    if (v >= 7) return q.w * 3;
    if (v >= 4) return q.w * 2;
    return q.w;
  }
  return 0;
}

// answers: [{ idx, text, options, skipped, flag }]
// caseScores: { [idx]: 0-10 } for open questions (from the LLM grader)
function computeScores({ blocks = [], questions = [], answers = [], caseScores = {} }) {
  const dims = {};
  for (const b of blocks) dims[b.id] = { pts: 0, max: 0, name: b.label };

  const byIdx = new Map();
  for (const a of answers) {
    if (Number.isInteger(a.idx)) byIdx.set(a.idx, a);
  }

  let flags = 0;
  questions.forEach((q, idx) => {
    if (!q || NON_SCORING_BLOCKS.has(q.block) || q.type === 'salary') return;
    if (!dims[q.block]) dims[q.block] = { pts: 0, max: 0, name: q.block };
    dims[q.block].max += q.w * 3;
    const a = byIdx.get(idx);
    if (!a) return;
    if (a.flag === 'susp') flags += 1;
    const cs = caseScores && Object.prototype.hasOwnProperty.call(caseScores, idx)
      ? Number(caseScores[idx])
      : undefined;
    dims[q.block].pts += pointsFor(q, a, cs);
  });

  let tp = 0;
  let tm = 0;
  for (const d of Object.values(dims)) { tp += d.pts; tm += d.max; }
  const globalScore = tm > 0 ? Math.round((tp / tm) * 10) : 0;

  const dimScores = {};
  for (const [k, d] of Object.entries(dims)) {
    if (NON_SCORING_BLOCKS.has(k)) continue;
    dimScores[k] = { name: d.name, pct: d.max > 0 ? Math.round((d.pts / d.max) * 100) : 0 };
  }

  let verdict;
  if (flags === 0 && globalScore >= 7) verdict = 'verde';
  else if (flags <= 2 && globalScore >= 5) verdict = 'amber';
  else verdict = 'red';

  return { globalScore, dimScores, flags, verdict };
}

// The grader ends its HTML with `<!--SCORES {"<idx>": 0-10, ...}-->` for open
// questions. Pull that out (and strip it) before the HTML is sanitized and
// stored. Returns { caseScores, html }. Tolerates a missing / malformed
// trailer — the fallback length scoring then applies.
const SCORES_RE = /<!--\s*SCORES\s*(\{[\s\S]*?\})\s*-->/i;

function extractCaseScores(html) {
  const src = String(html || '');
  const m = src.match(SCORES_RE);
  if (!m) return { caseScores: {}, html: src };
  const cleaned = src.replace(SCORES_RE, '').trim();
  let parsed;
  try { parsed = JSON.parse(m[1]); } catch { return { caseScores: {}, html: cleaned }; }
  const caseScores = {};
  for (const [k, v] of Object.entries(parsed || {})) {
    const idx = parseInt(k, 10);
    const s = Number(v);
    if (Number.isInteger(idx) && idx >= 0 && Number.isFinite(s)) {
      caseScores[idx] = Math.min(10, Math.max(0, s));
    }
  }
  return { caseScores, html: cleaned };
}

// Strip `correct` so the browser never learns the answer key.
function publicQuestions(questions) {
  return (questions || []).map(q => {
    if (!q || typeof q !== 'object') return q;
    const { correct, ...rest } = q;
    return rest;
  });
}

module.exports = { computeScores, extractCaseScores, publicQuestions, NON_SCORING_BLOCKS };
