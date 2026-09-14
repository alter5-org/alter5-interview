const test = require('node:test');
const assert = require('node:assert/strict');
const { profileSummaryText } = require('../../api/interview-chat/complete');

test('profileSummaryText renders a short readable summary', () => {
  const s = profileSummaryText({
    years_experience_estimate: 7,
    current_role: 'VP Project Finance',
    areas_to_probe: ['corporate_financing', 'institutional_investors'],
  });
  assert.match(s, /7 años/);
  assert.match(s, /VP Project Finance/);
  assert.match(s, /corporate_financing, institutional_investors/);
});

test('profileSummaryText handles a missing or empty profile', () => {
  assert.equal(profileSummaryText(null), 'no disponible');
  assert.equal(profileSummaryText({}), 'no disponible');
});
