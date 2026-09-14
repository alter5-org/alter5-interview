const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateAnchorBank,
  validateAdaptiveBank,
  validatePosition,
} = require('../../lib/position-validation');

function anchor(id, domain) {
  return {
    id,
    domain,
    case_text: `Case text for ${id}`,
    evidence: 'short evidence notes',
    followups: [{ trigger: 'answer is generic', question: 'Be more specific.' }],
  };
}

const fourAnchors = [
  anchor('corporate', 'corporate'),
  anchor('project_finance', 'project_finance'),
  anchor('investors', 'investors'),
  anchor('ownership', 'ownership'),
];
const oneAdaptive = [anchor('b1_ownership', 'ownership')];

test('validateAnchorBank requires exactly 4 entries', () => {
  assert.equal(validateAnchorBank(fourAnchors).ok, true);
  assert.equal(validateAnchorBank(fourAnchors.slice(0, 3)).ok, false);
  assert.equal(validateAnchorBank([...fourAnchors, anchor('extra', 'corporate')]).ok, false);
  assert.equal(validateAnchorBank(null).ok, false);
});

test('validateAnchorBank rejects duplicate ids', () => {
  const dup = [...fourAnchors.slice(0, 3), anchor('corporate', 'ownership')];
  const r = validateAnchorBank(dup);
  assert.equal(r.ok, false);
  assert.match(r.error, /duplicate_id/);
});

test('validateAnchorBank rejects malformed followups', () => {
  const bad = [{ ...fourAnchors[0], followups: [{ trigger: 'x' }] }, ...fourAnchors.slice(1)];
  assert.equal(validateAnchorBank(bad).ok, false);
});

test('validateAdaptiveBank accepts 1 to 12 entries', () => {
  assert.equal(validateAdaptiveBank(oneAdaptive).ok, true);
  assert.equal(validateAdaptiveBank([]).ok, false);
  const thirteen = Array.from({ length: 13 }, (_, i) => anchor(`q${i}`, 'ownership'));
  assert.equal(validateAdaptiveBank(thirteen).ok, false);
});

test('validatePosition on create requires the three conversational fields when mode is conversational_text', () => {
  const base = {
    slug: 'test-pos',
    title: 'Test',
    cv_analysis_prompt: 'x'.repeat(10),
    interview_system_prompt: 'x'.repeat(10),
    interview_blocks: [{ id: 'a', label: 'A', icon: 'x', desc: 'd' }],
    interview_questions: [{ block: 'a', type: 'salary', w: 1, text: 'q', min: 0, sus: 60 }],
    interview_mode: 'conversational_text',
  };
  assert.equal(validatePosition(base, { requireAll: true }).ok, false); // missing orchestrator content

  const complete = {
    ...base,
    interview_orchestrator_prompt: 'x'.repeat(10),
    interview_anchor_bank: fourAnchors,
    interview_adaptive_bank: oneAdaptive,
  };
  assert.equal(validatePosition(complete, { requireAll: true }).ok, true);
});

test('validatePosition rejects conversational fields without conversational_text mode', () => {
  const r = validatePosition({ interview_anchor_bank: fourAnchors }, { requireAll: false });
  assert.equal(r.ok, false);
  assert.match(r.error, /conversational_fields_require_conversational_text_mode/);
});

test('validatePosition PATCH: setting mode requires all three fields together', () => {
  const r = validatePosition({ interview_mode: 'conversational_text' }, { requireAll: false });
  assert.equal(r.ok, false);
});

test('validatePosition PATCH: mode already set, only the changed field needs revalidating', () => {
  // Simulates a PATCH to an existing conversational_text position that only
  // touches the anchor bank — interview_mode is not resent.
  const r = validatePosition({ interview_anchor_bank: fourAnchors }, { requireAll: false });
  // Without mode in the payload this PATCH-only call can't know the
  // position is already conversational_text, so it correctly rejects per
  // the "fields require the mode" rule above — the caller must resend mode
  // on any PATCH that touches these fields. Documented via this test.
  assert.equal(r.ok, false);
});

test('mcq positions (default mode) are unaffected', () => {
  const r = validatePosition({
    slug: 'mcq-pos',
    title: 'MCQ',
    cv_analysis_prompt: 'x'.repeat(10),
    interview_system_prompt: 'x'.repeat(10),
    interview_blocks: [{ id: 'a', label: 'A', icon: 'x', desc: 'd' }],
    interview_questions: [{ block: 'a', type: 'salary', w: 1, text: 'q', min: 0, sus: 60 }],
  }, { requireAll: true });
  assert.equal(r.ok, true, r.error);
});
