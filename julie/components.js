// Pure render functions: (content) → HTML string. No DOM access, no side effects.
// Every text value goes through esc() so content stays data, never markup.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linkAttrs(link) {
  const ext = link.external ? ' target="_blank" rel="noopener"' : '';
  return `href="${esc(link.href)}"${ext}`;
}

const ICONS = {
  sparkle:
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 1.5l1.6 4.1L13.7 7 9.6 8.6 8 12.7 6.4 8.6 2.3 7l4.1-1.4zM13 11l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  people:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.5c2.8 0 5 1.8 5 4.5"/></g></svg>',
  heart:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.2 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.2"/></g></svg>',
  arrow:
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M3 8h9.5M9 4l4 4-4 4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></g></svg>',
};

export function TopNav(c) {
  const links = c.nav.links
    .map((l) => `<li><a class="nav-link" ${linkAttrs(l)}>${esc(l.label)}</a></li>`)
    .join('');
  return `
    <a class="skip-link" href="#profile">${esc(c.nav.skipLink)}</a>
    <nav class="nav" aria-label="Primary">
      <div class="nav-inner">
        <a class="nav-brand" ${linkAttrs({ href: c.nav.brandHref, external: true })} aria-label="${esc(c.nav.brandAlt)}">
          <img src="/ds/alter5-logo-dark.svg" alt="${esc(c.nav.brandAlt)}" width="96" height="28">
        </a>
        <ul class="nav-links">${links}</ul>
      </div>
    </nav>`;
}

export function ProfileHeader(c) {
  const h = c.header;
  return `
    <section class="card hero" aria-labelledby="hero-name">
      <div class="hero-banner" aria-hidden="true"></div>
      <div class="hero-body">
        <div class="hero-avatar">
          <img src="${esc(h.avatar.src)}" alt="${esc(h.avatar.alt)}" width="136" height="136" loading="eager" fetchpriority="high">
          <span class="hero-avatar-mark" title="${esc(h.aiLabelLong)}">${ICONS.sparkle}<span class="sr-only">${esc(h.aiLabelLong)}</span></span>
        </div>
        <span class="ai-pill" role="note" aria-label="${esc(h.aiLabelLong)}">${ICONS.sparkle}<span aria-hidden="true">${esc(h.aiLabel)}</span></span>
        <h1 class="hero-name" id="hero-name">${esc(h.name)}</h1>
        <p class="hero-role">${esc(h.role)}</p>
        <p class="hero-headline">${esc(h.headline)}</p>
        <p class="hero-location">${esc(h.location)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" ${linkAttrs(h.ctaPrimary)}>${esc(h.ctaPrimary.label)}${ICONS.arrow}</a>
          <a class="btn btn-secondary" ${linkAttrs(h.ctaSecondary)}>${esc(h.ctaSecondary.label)}</a>
        </div>
      </div>
    </section>`;
}

export function AboutSection(c) {
  const a = c.about;
  const paras = a.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  const focus = a.focusAreas.map((f) => `<li>${esc(f)}</li>`).join('');
  return `
    <section class="card section" id="about" aria-labelledby="about-title">
      <h2 class="section-title" id="about-title">${esc(a.title)}</h2>
      <div class="prose">${paras}</div>
      <h3 class="sub-title">${esc(a.focusTitle)}</h3>
      <ul class="check-list">${focus}</ul>
    </section>`;
}

export function ExperienceSection(c) {
  const e = c.experience;
  const bullets = e.bullets.map((b) => `<li>${esc(b)}</li>`).join('');
  return `
    <section class="card section" id="experience" aria-labelledby="exp-title">
      <h2 class="section-title" id="exp-title">${esc(e.title)}</h2>
      <article class="exp">
        <div class="exp-logo" aria-hidden="true"><img src="/ds/alter5-mark.svg" alt="" width="40" height="40"></div>
        <div class="exp-body">
          <h3 class="exp-role">${esc(e.role)}</h3>
          <p class="exp-meta">${esc(e.org)} · ${esc(e.type)}</p>
          <p class="exp-meta muted">${esc(e.start)} – ${esc(e.end)} · ${esc(e.location)}</p>
          <p class="prose-p">${esc(e.intro)}</p>
          <ul class="check-list">${bullets}</ul>
          <p class="exp-note">${ICONS.sparkle}<span>${esc(e.note)}</span></p>
        </div>
      </article>
    </section>`;
}

export function SkillTags(c) {
  const chips = c.skills.items.map((s) => `<li class="chip">${esc(s)}</li>`).join('');
  return `
    <section class="card section" id="skills" aria-labelledby="skills-title">
      <h2 class="section-title" id="skills-title">${esc(c.skills.title)}</h2>
      <ul class="chips" aria-label="${esc(c.skills.title)}">${chips}</ul>
    </section>`;
}

export function WorkPrinciples(c) {
  const p = c.principles;
  const items = p.items
    .map(
      (i) => `
      <li class="principle">
        <span class="principle-icon" aria-hidden="true">${ICONS[i.icon] || ''}</span>
        <h3 class="principle-name">${esc(i.name)}</h3>
        <p class="principle-text">${esc(i.text)}</p>
      </li>`,
    )
    .join('');
  return `
    <section class="card section section-accent" id="principles" aria-labelledby="principles-title">
      <h2 class="section-title" id="principles-title">${esc(p.title)}</h2>
      <ul class="principles">${items}</ul>
      <p class="screening-note">${esc(p.screeningNote)} <a ${linkAttrs(p.screeningLink)}>${esc(p.screeningLink.label)}</a>.</p>
    </section>`;
}

export function LimitsSection(c) {
  const l = c.limits;
  const items = l.items.map((i) => `<li>${esc(i)}</li>`).join('');
  return `
    <section class="card section" id="limits" aria-labelledby="limits-title">
      <h2 class="section-title" id="limits-title">${esc(l.title)}</h2>
      <p class="prose-p">${esc(l.intro)}</p>
      <ul class="limit-list">${items}</ul>
      <div class="limits-footer">
        <p class="muted">${esc(l.supervision)}</p>
        <a class="btn btn-secondary" ${linkAttrs(l.contact)}>${ICONS.mail}${esc(l.contact.label)}</a>
      </div>
    </section>`;
}

export function FeaturedCards(c) {
  const cards = c.featured.cards
    .map(
      (k) => `
      <li class="feature">
        <h3 class="feature-title">${esc(k.title)}</h3>
        <p class="feature-text">${esc(k.text)}</p>
        <a class="feature-cta" ${linkAttrs(k)}>${esc(k.cta)}${ICONS.arrow}</a>
      </li>`,
    )
    .join('');
  return `
    <section class="section section-plain" id="featured" aria-labelledby="featured-title">
      <h2 class="section-title" id="featured-title">${esc(c.featured.title)}</h2>
      <ul class="features">${cards}</ul>
    </section>`;
}

export function Footer(c) {
  const f = c.footer;
  const links = f.links.map((l) => `<a ${linkAttrs(l)}>${esc(l.label)}</a>`).join('');
  return `
    <div class="footer-inner">
      <p class="footer-disclaimer">${ICONS.sparkle}<span>${esc(f.disclaimer)}</span></p>
      <p class="footer-company">${esc(f.company)}</p>
      <nav class="footer-links" aria-label="Footer">${links}</nav>
    </div>`;
}

export function renderMain(c) {
  return [
    ProfileHeader(c),
    AboutSection(c),
    ExperienceSection(c),
    SkillTags(c),
    WorkPrinciples(c),
    LimitsSection(c),
    FeaturedCards(c),
  ].join('\n');
}
