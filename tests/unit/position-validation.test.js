const test = require('node:test');
const assert = require('node:assert/strict');
const { validateQuestions, validateBlocks } = require('../../lib/position-validation');

const blocks = [
  { id: 'caso', label: 'Caso', icon: '📄', desc: 'Mini-caso' },
  { id: 'motivation', label: 'Motivación', icon: '✨', desc: 'No puntúa' },
];
const { blockIds } = validateBlocks(blocks);

const base = { block: 'caso', w: 5, text: 'Describe tu plan', min: 30, sus: 900 };

test('open question with minChars is accepted', () => {
  const r = validateQuestions([{ ...base, type: 'open', minChars: 500 }], blockIds);
  assert.equal(r.ok, true, r.error);
});

test('open question without minChars is accepted', () => {
  const r = validateQuestions([{ ...base, type: 'open' }], blockIds);
  assert.equal(r.ok, true, r.error);
});

test('open question rejects options, correct and bad minChars', () => {
  assert.equal(validateQuestions([{ ...base, type: 'open', options: ['a', 'b'] }], blockIds).ok, false);
  assert.equal(validateQuestions([{ ...base, type: 'open', correct: 0 }], blockIds).ok, false);
  assert.equal(validateQuestions([{ ...base, type: 'open', minChars: -1 }], blockIds).ok, false);
  assert.equal(validateQuestions([{ ...base, type: 'open', minChars: 20000 }], blockIds).ok, false);
  assert.equal(validateQuestions([{ ...base, type: 'open', minChars: '10' }], blockIds).ok, false);
});

test('scale is still not a supported type', () => {
  assert.equal(validateQuestions([{ ...base, type: 'scale' }], blockIds).ok, false);
});

test('single outside motivation still requires correct', () => {
  const r = validateQuestions([{ ...base, type: 'single', options: ['a', 'b'] }], blockIds);
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid_correct/);
});
