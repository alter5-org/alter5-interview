const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseClassifyResponse,
  parseAdaptivePick,
  turnKindFor,
  progressOf,
  REFUSAL_LINE,
  CLARIFY_LINE,
} = require('../../api/interview-chat/respond');
const orch = require('../../lib/interview-orchestrator');

test('parseClassifyResponse accepts a valid follow-up decision', () => {
  const r = parseClassifyResponse('{"followup_needed": true, "trigger_index": 1}', 3);
  assert.deepEqual(r, { followupNeeded: true, triggerIndex: 1 });
});

test('parseClassifyResponse rejects an out-of-range trigger index', () => {
  const r = parseClassifyResponse('{"followup_needed": true, "trigger_index": 5}', 3);
  assert.equal(r.followupNeeded, false);
});

test('parseClassifyResponse fails closed on malformed JSON (no follow-up, never stall)', () => {
  assert.deepEqual(parseClassifyResponse('not json', 3), { followupNeeded: false, triggerIndex: null });
  assert.deepEqual(parseClassifyResponse('', 3), { followupNeeded: false, triggerIndex: null });
});

test('parseClassifyResponse tolerates a ```json fenced reply', () => {
  const r = parseClassifyResponse('```json\n{"followup_needed": false, "trigger_index": null}\n```', 2);
  assert.equal(r.followupNeeded, false);
});

test('parseAdaptivePick returns the chosen id when it is in the bank', () => {
  const bank = [{ id: 'b1' }, { id: 'b2' }];
  assert.equal(parseAdaptivePick('{"adaptive_id": "b2"}', bank), 'b2');
});

test('parseAdaptivePick falls back to the first bank entry on a bad id or malformed JSON', () => {
  const bank = [{ id: 'b1' }, { id: 'b2' }];
  assert.equal(parseAdaptivePick('{"adaptive_id": "not_in_bank"}', bank), 'b1');
  assert.equal(parseAdaptivePick('not json', bank), 'b1');
  assert.equal(parseAdaptivePick('{}', bank), 'b1');
});

test('turnKindFor maps orchestrator phases to persisted turn kinds', () => {
  assert.equal(turnKindFor(orch.PHASES.ANCHOR), 'anchor');
  assert.equal(turnKindFor(orch.PHASES.FOLLOWUP), 'followup');
  assert.equal(turnKindFor(orch.PHASES.ADAPTIVE), 'adaptive');
  assert.equal(turnKindFor(orch.PHASES.ADAPTIVE_FOLLOWUP), 'adaptive_followup');
});

test('progressOf mirrors the start.js helper (completed anchors / 4)', () => {
  assert.deepEqual(progressOf({ anchorsCompleted: ['a'] }), { completed: 1, total: 4 });
});

test('the refusal and clarify lines never mention scores or rubrics', () => {
  assert.doesNotMatch(REFUSAL_LINE, /puntuaci|score|rubric/i);
  assert.doesNotMatch(CLARIFY_LINE, /puntuaci|score|rubric/i);
});
