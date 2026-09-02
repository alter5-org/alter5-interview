const test = require('node:test');
const assert = require('node:assert/strict');
const { computeScores, extractCaseScores, publicQuestions } = require('../../lib/interview-scoring');

const blocks = [
  { id: 'ejecucion', label: 'Ejecución', icon: 'x', desc: 'd' },
  { id: 'caso', label: 'Caso', icon: 'x', desc: 'd' },
  { id: 'compensation', label: 'Compensación', icon: 'x', desc: 'd' },
  { id: 'motivation', label: 'Motivación', icon: 'x', desc: 'd' },
];
const questions = [
  { block: 'ejecucion', type: 'single', w: 3, text: 'q0', options: ['A', 'B', 'C'], correct: 1, min: 5, sus: 120 },
  { block: 'ejecucion', type: 'multi', w: 2, text: 'q1', options: ['A', 'B', 'C'], min: 5, sus: 120 },
  { block: 'caso', type: 'open', w: 5, text: 'q2', minChars: 100, min: 30, sus: 900 },
  { block: 'compensation', type: 'salary', w: 1, text: 'q3', min: 0, sus: 600 },
  { block: 'motivation', type: 'single', w: 1, text: 'q4', options: ['X', 'Y'], min: 0, sus: 600 },
];

test('single correct/incorrect and multi scoring mirror client rules', () => {
  const r = computeScores({
    blocks, questions,
    answers: [
      { idx: 0, text: 'B', flag: 'ok' },
      { idx: 1, options: ['A', 'C'], flag: 'ok' },
      { idx: 2, text: 'x'.repeat(100), flag: 'ok' },
      { idx: 3, text: '75000', flag: 'ok' },
      { idx: 4, text: 'X', flag: 'ok' },
    ],
  });
  // ejecucion: 9 + 6 = 15 / 15 ; caso: 15/15 (length fallback) → 10
  assert.equal(r.globalScore, 10);
  assert.equal(r.dimScores.ejecucion.pct, 100);
  assert.equal(r.dimScores.caso.pct, 100);
  assert.equal(r.dimScores.compensation, undefined);
  assert.equal(r.dimScores.motivation, undefined);
  assert.equal(r.verdict, 'verde');
});

test('wrong single gets partial credit, skipped gets zero, max still counted', () => {
  const r = computeScores({
    blocks, questions,
    answers: [
      { idx: 0, text: 'A', flag: 'ok' },
      { idx: 1, skipped: true, flag: 'ok' },
      { idx: 2, skipped: true, flag: 'ok' },
    ],
  });
  // ejecucion: 3 / 15 ; caso 0 / 15 → 3/30 → 1
  assert.equal(r.dimScores.ejecucion.pct, 20);
  assert.equal(r.globalScore, 1);
  assert.equal(r.verdict, 'red');
});

test('open question uses LLM case score when provided', () => {
  const r = computeScores({
    blocks, questions,
    answers: [{ idx: 2, text: 'short', flag: 'ok' }],
    caseScores: { 2: 8 },
  });
  // caso: round(5*3*8/10)=12 / 15 → 80%
  assert.equal(r.dimScores.caso.pct, 80);
});

test('open question falls back to depth-gated length scoring', () => {
  const half = computeScores({ blocks, questions, answers: [{ idx: 2, text: 'x'.repeat(50) }] });
  assert.equal(half.dimScores.caso.pct, 67); // w*2 = 10/15
  const tiny = computeScores({ blocks, questions, answers: [{ idx: 2, text: 'x'.repeat(10) }] });
  assert.equal(tiny.dimScores.caso.pct, 0);
});

test('susp flags counted only on scoring questions; verdict thresholds', () => {
  const r = computeScores({
    blocks, questions,
    answers: [
      { idx: 0, text: 'B', flag: 'susp' },
      { idx: 1, options: ['A'], flag: 'susp' },
      { idx: 2, text: 'x'.repeat(100), flag: 'susp' },
      { idx: 3, text: '1', flag: 'susp' },
    ],
  });
  assert.equal(r.flags, 3);
  assert.equal(r.verdict, 'red');
});

test('extractCaseScores parses and strips the SCORES trailer', () => {
  const html = '<h4>Resumen</h4><p>ok</p>\n<!--SCORES {"2": 7.5, "9": 11, "bad": 3}-->';
  const { caseScores, html: cleaned } = extractCaseScores(html);
  assert.deepEqual(caseScores, { 2: 7.5, 9: 10 });
  assert.equal(cleaned, '<h4>Resumen</h4><p>ok</p>');
});

test('extractCaseScores tolerates missing or malformed trailer', () => {
  assert.deepEqual(extractCaseScores('<p>x</p>'), { caseScores: {}, html: '<p>x</p>' });
  const bad = extractCaseScores('<p>x</p><!--SCORES {nope}-->');
  assert.deepEqual(bad.caseScores, {});
  assert.equal(bad.html, '<p>x</p>');
});

test('publicQuestions removes correct but keeps everything else', () => {
  const pub = publicQuestions(questions);
  assert.equal(pub[0].correct, undefined);
  assert.equal(pub[0].options.length, 3);
  assert.equal(pub[2].minChars, 100);
  assert.equal(questions[0].correct, 1); // original untouched
});
