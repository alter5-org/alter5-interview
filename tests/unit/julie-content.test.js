const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..', '..');
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

test('English content has the expected shape', async () => {
  const { default: c } = await load('julie/content.en.js');
  assert.equal(c.lang, 'en');
  assert.equal(c.header.name, 'Julie Swan');
  assert.equal(c.about.paragraphs.length, 3);
  assert.equal(c.about.focusAreas.length, 6);
  assert.equal(c.experience.bullets.length, 6);
  assert.equal(c.skills.items.length, 12);
  assert.equal(c.principles.items.length, 4);
  assert.equal(c.limits.items.length, 4);
  assert.equal(c.featured.cards.length, 3);
  assert.equal(c.nav.links.length, 3);
});

test('AI disclosure is present in header, about, experience and footer', async () => {
  const { default: c } = await load('julie/content.en.js');
  assert.equal(c.header.aiLabel, 'AI agent · Human-supervised');
  assert.match(c.about.paragraphs.join(' '), /AI Talent Manager/);
  assert.match(c.about.paragraphs.join(' '), /human team/i);
  assert.match(c.experience.note, /AI agent operating with human oversight/);
  assert.match(c.footer.disclaimer, /AI agent created for Alter5/);
  assert.match(c.footer.disclaimer, /not a person or employee/);
  assert.match(c.footer.disclaimer, /does not screen, rank, select or make hiring decisions/);
  assert.match(c.header.avatar.alt, /not a real person/);
});

test('no fake social proof or unverifiable metrics', async () => {
  const { default: c } = await load('julie/content.en.js');
  const forbidden = ['followers', 'connections', 'endorsement', 'recommendation', 'testimonial'];
  const blob = JSON.stringify(c).toLowerCase();
  for (const word of forbidden) assert.ok(!blob.includes(word), `content mentions "${word}"`);
  for (const key of ['followers', 'connections', 'endorsements', 'recommendations', 'metrics', 'stats']) {
    assert.ok(!(key in c), `content has forbidden top-level field "${key}"`);
  }
});

test('language resolver falls back to English', async () => {
  const { resolveLang, getContent } = await load('julie/content.js');
  assert.equal(resolveLang('', 'en'), 'en');
  assert.equal(resolveLang('?lang=es', 'en'), 'en'); // no Spanish bundle yet
  assert.equal(resolveLang('?lang=EN-GB', 'es'), 'en');
  assert.equal(getContent('xx').lang, 'en');
});

test('components render every section and escape text', async () => {
  const { default: c } = await load('julie/content.en.js');
  const comp = await load('julie/components.js');
  const html = comp.TopNav(c) + comp.renderMain(c) + comp.Footer(c);
  for (const id of ['about', 'experience', 'skills', 'principles', 'limits', 'featured']) {
    assert.ok(html.includes(`id="${id}"`), `missing section #${id}`);
  }
  assert.ok(html.includes('<h1'), 'h1 present');
  assert.equal((html.match(/<h1/g) || []).length, 1, 'exactly one h1');
  assert.ok(html.includes('AI agent · Human-supervised'));
  assert.ok(html.includes('mailto:careers@alter-5.com'));
  assert.equal(comp.esc('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  // every img has a non-empty alt or is decorative (alt="")
  const imgs = html.match(/<img[^>]*>/g) || [];
  for (const img of imgs) assert.match(img, /\balt="/, `img without alt: ${img}`);
});
