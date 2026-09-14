const test = require('node:test');
const assert = require('node:assert/strict');
const { progressOf, introCopy } = require('../../api/interview-chat/start');

test('progressOf reports completed anchors out of 4, never more', () => {
  assert.deepEqual(progressOf({ anchorsCompleted: [] }), { completed: 0, total: 4 });
  assert.deepEqual(progressOf({ anchorsCompleted: ['a', 'b'] }), { completed: 2, total: 4 });
});

test('introCopy extracts the quoted intro block from the orchestrator prompt', () => {
  const prompt = 'Some preamble.\n\nINTRODUCCIÓN — copia exacta para iniciar la entrevista (español):\n\n"Hola. Esta es la entrevista técnica inicial de Alter5..."\n\nMENSAJE DE CIERRE — copia exacta...';
  assert.match(introCopy(prompt), /^Hola\. Esta es la entrevista técnica inicial de Alter5/);
});

test('introCopy falls back to a neutral line when the marker is missing', () => {
  assert.equal(introCopy('no marker here'), 'Empezamos la entrevista técnica de Alter5.');
  assert.equal(introCopy(''), 'Empezamos la entrevista técnica de Alter5.');
  assert.equal(introCopy(null), 'Empezamos la entrevista técnica de Alter5.');
});

test('introCopy matches the real orchestrator-prompt.md content', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const content = fs.readFileSync(
    path.join(__dirname, '../../docs/positions/responsable-transacciones/orchestrator-prompt.md'),
    'utf8',
  );
  const text = introCopy(content);
  assert.match(text, /entrevista técnica inicial de Alter5/);
  assert.match(text, /Empezamos\.$/);
});
