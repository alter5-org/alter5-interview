// Julie Swan — profile content (English).
// This is the ONLY file to edit for copy changes. Components never hardcode text.
// To add a language: copy this file to content.<lang>.js and register it in content.js.

export default {
  lang: 'en',
  meta: {
    title: 'Julie Swan — AI Talent Manager at Alter5',
    description:
      'Julie Swan is an AI agent (human-supervised) that helps Alter5 communicate open roles clearly and with a candidate-first mindset. She does not make hiring decisions.',
  },
  nav: {
    brandAlt: 'Alter5',
    brandHref: 'https://www.alter5.com',
    links: [
      { label: 'Profile', href: '#profile' },
      { label: 'Open Roles', href: '/' },
      { label: 'About Alter5', href: 'https://www.alter5.com', external: true },
    ],
    skipLink: 'Skip to content',
  },
  header: {
    name: 'Julie Swan',
    role: 'AI Talent Manager at Alter5',
    location: 'Remote · Working with Alter5',
    aiLabel: 'AI agent · Human-supervised',
    aiLabelLong: 'Julie Swan is an AI agent supervised by the human team at Alter5',
    avatar: {
      src: '/julie/avatar.webp',
      alt: 'AI-generated portrait of Julie Swan, Alter5’s AI Talent Manager — a synthetic image, not a real person',
    },
    headline: 'AI Talent Manager at Alter5 | Helping great people discover meaningful opportunities',
    ctaPrimary: { label: 'View open roles', href: '/' },
    ctaSecondary: { label: 'Meet Alter5', href: 'https://www.alter5.com', external: true },
  },
  about: {
    title: 'About',
    paragraphs: [
      'Julie Swan is Alter5’s AI Talent Manager, designed to help the company communicate open opportunities with clarity, consistency and a candidate-first mindset.',
      'She supports the talent team by translating open roles into compelling stories, adapting them for the right channels and helping potential candidates understand the work, team and impact behind each opportunity.',
      'Julie works within human-defined workflows and under Alter5 team supervision. Hiring decisions, candidate assessments and sensitive communications remain the responsibility of Alter5’s human team.',
    ],
    focusTitle: 'Focus areas',
    focusAreas: [
      'Open-role communication and distribution strategy',
      'Employer-branding content',
      'Job-post and campaign copywriting',
      'Candidate outreach preparation',
      'Talent-market research',
      'Recruitment campaign reporting and optimisation',
    ],
  },
  experience: {
    title: 'Experience',
    role: 'AI Talent Manager',
    org: 'Alter5',
    type: 'Full-time',
    start: 'September 2026', // configurable
    end: 'Present',
    location: 'Remote',
    intro:
      'Supporting Alter5’s talent and hiring teams with AI-assisted recruitment communication and employer-branding content. Main areas of contribution:',
    bullets: [
      'Creating clear, candidate-friendly job descriptions and role narratives',
      'Developing channel-specific recruitment content for LinkedIn, careers pages, newsletters and talent communities',
      'Preparing outreach drafts and candidate communication materials',
      'Supporting campaign analysis, reporting and content optimisation',
      'Maintaining tone-of-voice consistency across hiring communications',
      'Helping hiring teams communicate the mission, culture and impact behind open roles',
    ],
    note:
      'Julie is an AI agent operating with human oversight. Final hiring decisions and sensitive candidate interactions are handled by Alter5’s human team.',
  },
  skills: {
    title: 'Core skills',
    items: [
      'Talent Acquisition',
      'Employer Branding',
      'Recruitment Marketing',
      'Talent Communications',
      'Job Description Writing',
      'Candidate Experience',
      'LinkedIn Recruiting',
      'Content Strategy',
      'Talent Market Research',
      'AI Workflow Automation',
      'Recruitment Analytics',
      'Human-in-the-Loop AI',
    ],
  },
  principles: {
    title: 'How Julie works',
    items: [
      { icon: 'eye', name: 'Transparent', text: 'Julie is an AI agent, clearly identified as such.' },
      { icon: 'people', name: 'Human-supervised', text: 'Alter5’s team reviews sensitive workflows and decisions.' },
      { icon: 'heart', name: 'Candidate-first', text: 'Communications should be useful, respectful and clear.' },
      { icon: 'lock', name: 'Privacy-aware', text: 'Candidate information is handled only within approved processes.' },
    ],
    screeningNote:
      'Separately from Julie, Alter5 uses AI-assisted CV screening with human review of every outcome. How this works and your rights are described in our',
    screeningLink: { label: 'candidate privacy notice', href: '/apply/privacy' },
  },
  limits: {
    title: 'What Julie doesn’t do',
    intro: 'Clear boundaries keep the process fair. Julie:',
    items: [
      'Does not take final hiring decisions.',
      'Does not run decisive automated evaluations of candidates.',
      'Does not send external communications without human review and approval where the workflow requires it.',
      'Does not replace Alter5’s People, Talent or Hiring Managers.',
    ],
    supervision: 'Supervised by the Talent / People team at Alter5.',
    contact: { label: 'Contact our hiring team', href: 'mailto:careers@alter-5.com' },
  },
  featured: {
    title: 'Featured',
    cards: [
      {
        title: 'Open roles at Alter5',
        text: 'Current opportunities and how our asynchronous application process works.',
        cta: 'Explore opportunities',
        href: '/',
      },
      {
        title: 'How we communicate with candidates',
        text: 'The principles behind every message: useful, respectful, clear and privacy-aware.',
        cta: 'Our candidate principles',
        href: '#principles',
      },
      {
        title: 'Meet the people behind Alter5',
        text: 'The team building institutional-grade investment infrastructure for energy and infrastructure assets.',
        cta: 'Our team and culture',
        href: 'https://www.alter5.com',
        external: true,
      },
    ],
  },
  footer: {
    disclaimer:
      'Julie Swan is an AI agent created for Alter5 — not a person or employee. She supports recruitment communication workflows and does not screen, rank, select or make hiring decisions.',
    company: 'Alter5 Financial Technologies, S.L. · Madrid',
    links: [
      { label: 'Privacy', href: '/apply/privacy' },
      { label: 'Careers', href: '/' },
      { label: 'Alter5', href: 'https://www.alter5.com', external: true },
      { label: 'My data', href: '/privacy/my-data' },
    ],
  },
};
