// Entry point: resolve language, render components into the shell, wire small interactions.
import { resolveLang, getContent } from './content.js';
import { TopNav, renderMain, Footer } from './components.js';

const lang = resolveLang(window.location.search, document.documentElement.lang);
const content = getContent(lang);
document.documentElement.lang = lang;
document.title = content.meta.title;
const metaDesc = document.querySelector('meta[name="description"]');
if (metaDesc) metaDesc.setAttribute('content', content.meta.description);

document.getElementById('site-header').innerHTML = TopNav(content);
document.getElementById('profile').innerHTML = renderMain(content);
document.getElementById('site-footer').innerHTML = Footer(content);

// Highlight the nav link of the section in view (only for in-page anchors).
const navLinks = [...document.querySelectorAll('.nav-link[href^="#"]')];
if ('IntersectionObserver' in window && navLinks.length) {
  const targets = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const link = navLinks.find((a) => a.getAttribute('href') === `#${en.target.id}`);
        if (link) link.classList.toggle('is-active', en.isIntersecting);
      });
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  targets.forEach((t) => io.observe(t));
}

// Elevate the nav once the page scrolls.
const nav = document.querySelector('.nav');
const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });
