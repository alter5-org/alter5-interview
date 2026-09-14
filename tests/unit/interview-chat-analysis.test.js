const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractEvaluationJson,
  rescaleGlobalScore,
  buildTranscriptText,
  DIMENSION_KEYS,
} = require('../../lib/interview-chat-analysis');

const sampleEvaluation = {
  overall_evidence_score: 82,
  confidence: 'high',
  suggested_next_step: 'strong_evidence_prioritise_human_interview',
  dimensions: {
    corporate_financing: { score_0_4: 3, confidence: 'high', tested: true, evidence: ['buen razonamiento de cash-flow'] },
    project_finance: { score_0_4: 4, confidence: 'high', tested: true, evidence: [] },
    investor_knowledge: {
      score_0_4: 2, confidence: 'medium', tested: true, evidence: [],
      named_institutions: [{ name: 'Fondo Ejemplo', validation: 'unverified', candidate_rationale: 'ticket adecuado' }],
    },
    transaction_judgement: { score_0_4: 3, confidence: 'high', tested: true },
    ownership_execution: { score_0_4: 3, confidence: 'high', tested: true },
    commercial_judgement: { score_0_4: null, confidence: 'low', tested: false },
    technology_mindset: { score_0_4: 3, confidence: 'medium', tested: true },
    communication_clarity: { score_0_4: 3, confidence: 'high', tested: true },
  },
  strongest_evidence: ['a', 'b'],
  main_uncertainties: ['c'],
  contradictions_for_human_review: [],
  human_interview_focus: ['d', 'e'],
};

function withTrailer(evalObj) {
  return `<h4>Resumen ejecutivo</h4><p>x</p>\n<!--EVALUATION ${JSON.stringify(evalObj)}-->`;
}

test('extractEvaluationJson parses a well-formed trailer and strips it from the HTML', () => {
  const { evaluation, html } = extractEvaluationJson(withTrailer(sampleEvaluation));
  assert.equal(html.includes('EVALUATION'), false);
  assert.equal(evaluation.overall_evidence_score, 82);
  assert.equal(evaluation.confidence, 'high');
  assert.equal(evaluation.suggested_next_step, 'strong_evidence_prioritise_human_interview');
  assert.equal(evaluation.dimensions.project_finance.score_0_4, 4);
  assert.equal(evaluation.dimensions.commercial_judgement.tested, false);
  assert.equal(evaluation.dimensions.commercial_judgement.score_0_4, null);
  assert.equal(evaluation.dimensions.investor_knowledge.named_institutions[0].validation, 'unverified');
  assert.deepEqual(Object.keys(evaluation.dimensions).sort(), [...DIMENSION_KEYS].sort());
});

test('not_tested stays null even if the model sneaks in a numeric score', () => {
  const bad = { ...sampleEvaluation, dimensions: { ...sampleEvaluation.dimensions, commercial_judgement: { score_0_4: 0, confidence: 'high', tested: false } } };
  const { evaluation } = extractEvaluationJson(withTrailer(bad));
  assert.equal(evaluation.dimensions.commercial_judgement.score_0_4, null);
});

test('extractEvaluationJson tolerates a missing trailer', () => {
  const { evaluation, html } = extractEvaluationJson('<h4>Resumen</h4><p>sin trailer</p>');
  assert.equal(evaluation, null);
  assert.match(html, /sin trailer/);
});

test('extractEvaluationJson tolerates a malformed JSON trailer', () => {
  const { evaluation } = extractEvaluationJson('<p>x</p>\n<!--EVALUATION {not valid json}-->');
  assert.equal(evaluation, null);
});

test('extractEvaluationJson never marks an unrecognized investor name as wrong', () => {
  const { evaluation } = extractEvaluationJson(withTrailer(sampleEvaluation));
  const inst = evaluation.dimensions.investor_knowledge.named_institutions[0];
  assert.notEqual(inst.validation, 'confirmed_mismatch');
});

test('rescaleGlobalScore maps 0-100 onto the existing 0-10 convention', () => {
  assert.equal(rescaleGlobalScore(100), 10);
  assert.equal(rescaleGlobalScore(0), 0);
  assert.equal(rescaleGlobalScore(82), 8.2);
  assert.equal(rescaleGlobalScore(null), null);
  assert.equal(rescaleGlobalScore(undefined), null);
});

test('buildTranscriptText renders question/answer pairs with turn kind and time', () => {
  const turns = [
    { answer_text: 'Estructuraría deuda senior y private credit.', turn_meta: { turn_kind: 'anchor', question_text: 'Caso corporate', elapsed_seconds_at_submit: 135 } },
    { answer_text: 'Fondo A y Fondo B.', turn_meta: { turn_kind: 'followup', question_text: 'Dame cinco nombres concretos.', elapsed_seconds_at_submit: 260 } },
  ];
  const text = buildTranscriptText(turns);
  assert.match(text, /#0 \[anchor\] Caso corporate/);
  assert.match(text, /Estructuraría deuda senior/);
  assert.match(text, /#1 \[followup\] Dame cinco nombres concretos\./);
  assert.match(text, /Tiempo acumulado: 2:15/);
  assert.match(text, /Tiempo acumulado: 4:20/);
});

test('buildTranscriptText handles a missing answer gracefully', () => {
  const text = buildTranscriptText([{ turn_meta: { question_text: 'Q1' } }]);
  assert.match(text, /\(sin respuesta\)/);
});
