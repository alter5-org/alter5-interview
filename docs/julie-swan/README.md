# Julie Swan — AI Talent Manager profile page

Public URL: `https://careers.alter-5.com/julie-swan` (short link `/julie` redirects there).

Julie Swan is an **AI agent persona** used for employer branding and open-role communication.
The page must always make that clear: the "AI agent · Human-supervised" pill, the avatar mark,
the Experience note, the "What Julie doesn't do" section and the footer disclaimer are all
required disclosure elements. Do not remove them.

## Files

```
julie-swan.html          page shell (head, OG tags, empty mounts, <script type="module">)
julie/content.en.js      ALL copy lives here — edit this for text changes
julie/content.js         language resolver (?lang=xx → <html lang> → en)
julie/components.js      render functions: TopNav, ProfileHeader, AboutSection, ExperienceSection,
                         SkillTags, WorkPrinciples, LimitsSection, FeaturedCards, Footer
julie/app.js             mounts components, nav highlight on scroll
julie/julie.css          styles (colors come from /ds/tokens.css — blue builds, teal decorates)
julie/avatar.webp        400px avatar (photorealistic AI-generated portrait of a fictional person)
julie/avatar@2x.webp     800px variant (not wired yet; swap in via srcset if needed)
julie/og.jpg             1200px social preview
tests/unit/julie-content.test.js   content shape + disclosure strings (npm run test:unit)
tests/julie-swan.spec.js           Playwright: disclosure visible, links, alt text, keyboard, 390px
```

No build step, no dependencies: plain HTML + CSS + ES modules, same as the rest of the site.

## Editing the content

Open `julie/content.en.js`. Every section is a plain object:

- `header` — name, role, location, `aiLabel`, avatar `src`/`alt`, headline, both CTAs.
- `about` — 3 paragraphs + `focusAreas[]`.
- `experience` — `start` is the configurable date ("September 2026"), `bullets[]`, `note`.
- `skills.items[]` — the chips.
- `principles.items[]` — 4 cards (`icon` must be one of `eye | people | heart | lock`), `screeningNote`.
- `limits` — the 4 boundaries + `contact` (mailto).
- `featured.cards[]` — 3 cards with `href` (add `external: true` for off-site links).
- `footer` — disclaimer, company line, links.

Text is HTML-escaped by the components, so write plain text (no tags). Run
`npm run test:unit` after editing: it checks counts and that the disclosure sentences are intact.

## Adding Spanish (or any language)

1. Copy `julie/content.en.js` → `julie/content.es.js`, set `lang: 'es'`, translate.
2. In `julie/content.js`: `import es from './content.es.js';` and add `es` to `BUNDLES`.
3. `https://careers.alter-5.com/julie-swan?lang=es` now serves it; unknown languages fall back to English.

## Swapping the avatar

Replace `julie/avatar.webp` (square, ≥400px) and `julie/og.jpg` (≥1200px). The current avatar is a
photorealistic AI-generated portrait of a fictional person (Salvador's decision, 2026-09-11, after
an illustrated first version). Because it looks like a photo, the disclosure elements on the page
(pill, avatar mark, Experience note, limits section, footer) and the alt text in `content.en.js`
("AI-generated… not a real person") are mandatory. Never use a photo of a real person.
Original generation: Higgsfield `soul_2`, 1:1, corporate-headshot prompt.

## Verify locally

```bash
node --check julie/*.js && npm run test:unit
python3 -m http.server 4173 --bind 127.0.0.1 --directory "$PWD" &
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/julie-swan.spec.js --project=chromium
```

## Deploy

Same as every other page: `vercel deploy` for a preview, `vercel deploy --prod --yes` to release
(the GitHub → Vercel trigger is broken; see `DEPLOYMENT.md`).

## Outreach rule (from the GPT-6 Astra review, 2026-09-11)

LinkedIn / Nova outreach messages are sent from the CEO's account and are **signed by him,
never by Julie**. Outreach links to the role page, not to this profile. This page is optional
employer-branding context; it is not a step in the candidate flow.
