'use strict';

// Move background images together; update at most once per animation frame.
const parallaxSections = [...document.querySelectorAll('.parallax-section')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let parallaxFrame = null;

function updateParallax() {
  parallaxFrame = null;
  if (reducedMotion.matches) return;

  parallaxSections.forEach(section => {
    const bounds = section.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

    const distance = Math.max(0, window.scrollY - section.offsetTop);
    const offset = Math.min(distance * 0.4, 100);
    section.style.setProperty('--parallax-offset', `${offset}px`);
  });
}

function scheduleParallax() {
  if (parallaxFrame === null && !reducedMotion.matches) {
    parallaxFrame = window.requestAnimationFrame(updateParallax);
  }
}

function syncParallaxMotion() {
  parallaxSections.forEach(section => {
    section.classList.toggle('has-parallax', !reducedMotion.matches);
  });
  if (reducedMotion.matches) {
    if (parallaxFrame !== null) window.cancelAnimationFrame(parallaxFrame);
    parallaxFrame = null;
    parallaxSections.forEach(section => section.style.removeProperty('--parallax-offset'));
  } else {
    scheduleParallax();
  }
}

window.addEventListener('scroll', scheduleParallax, { passive: true });
window.addEventListener('resize', scheduleParallax);
window.addEventListener('pageshow', scheduleParallax);
reducedMotion.addEventListener('change', syncParallaxMotion);
syncParallaxMotion();

const icons = {
  website: '<rect x="3" y="5" width="26" height="22" rx="2"/><path d="M3 11h26M8 8h1m3 0h1M9 17h14M9 22h9"/>',
  mobile: '<rect x="9" y="2" width="15" height="28" rx="3"/><path d="M14 6h5m-4 20h3"/>',
  updates: '<path d="M27 13a11 11 0 0 0-19-5L4 12m0-7v7h7m-6 7a11 11 0 0 0 19 5l4-4m0 7v-7h-7"/>'
};
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
function picture(src, alt, width, height) {
  const img = element('img');
  Object.assign(img, { src, alt, width, height, loading: 'lazy' });
  return img;
}
siteContent.services.forEach((service, index) => {
  const card = element('article', 'service-card');
  const top = element('div', 'service-top');
  const icon = element('span', 'service-icon');
  icon.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${icons[service.icon] || icons.website}</svg>`;
  top.append(icon, element('span', 'card-number', `0${index + 1}`));
  card.append(top, element('h3', '', service.title), element('p', '', service.description), element('p', 'service-detail', service.detail));
  document.querySelector('#services-grid').append(card);
});
siteContent.projects.forEach(project => {
  const card = element('article', 'project-card');
  const media = element('div', 'project-media');
  media.append(picture(project.image, project.imageAlt, 800, 500), element('span', 'placeholder-label', 'PROJECT PLACEHOLDER'));
  const body = element('div', 'project-body');
  body.append(element('h3', '', project.title), element('p', '', project.description), element('p', 'project-work', project.work));
  if (project.services.length) body.append(element('p', 'project-work', project.services.join(' · ')));
  try {
    const destination = new URL(project.url);
    if (['https:', 'http:'].includes(destination.protocol)) {
      const link = element('a', 'inline-link', 'Visit website ↗');
      link.href = destination.href;
      body.append(link);
    }
  } catch { /* No confirmed destination: do not render a link. */ }
  card.append(media, body);
  document.querySelector('#portfolio-grid').append(card);
});
siteContent.team.forEach(member => {
  const card = element('article', 'team-card');
  const image = element('div', 'team-image');
  image.append(picture(member.image, 'Neutral silhouette placeholder; team photo coming soon', 400, 400));
  const body = element('div');
  body.append(element('p', 'eyebrow', 'TEAM PROFILE COMING SOON'), element('h3', '', member.name), element('p', 'team-role', member.role), element('p', '', member.description));
  card.append(image, body);
  document.querySelector('#team-grid').append(card);
});
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
toggle.hidden = false;
document.documentElement.classList.add('js');
function closeMenu(returnFocus = false) {
  toggle.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  if (returnFocus) toggle.focus();
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
});
navigation.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  if (window.matchMedia('(max-width: 760px)').matches) {
    const target = document.querySelector(link.hash);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => { if (!event.target.closest('.header-inner')) closeMenu(); });
window.matchMedia('(min-width: 761px)').addEventListener('change', () => closeMenu());
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navigation.querySelectorAll('a').forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-20% 0px -55% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
}
document.querySelector('#year').textContent = new Date().getFullYear();



// Observe text after the project and team cards have been rendered.
// Each item reveals once, with a short stagger among nearby sibling items.
function setupTextReveals() {
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;

  const selector = [
    'main h1', 'main h2', 'main h3', 'main p', 'main figcaption',
    'main a', '.hero-bottom > span', '.placeholder-label', '.card-number',
    '.contact-note strong', '.footer-bottom > span'
  ].join(', ');
  const items = [...document.querySelectorAll(selector)].filter(item =>
    !item.closest('form, nav') && !item.parentElement.closest(selector)
  );

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  items.forEach(item => {
    const siblings = items.filter(candidate => candidate.parentElement === item.parentElement);
    const delay = 200 + Math.min(siblings.indexOf(item), 3) * 80;
    item.style.setProperty('--reveal-delay', `${delay}ms`);
    observer.observe(item);
    item.classList.add('text-reveal');
  });

  // Reveal focused links immediately, even before their animation would start.
  document.addEventListener('focusin', event => {
    const item = event.target.closest('.text-reveal');
    if (item) {
      item.classList.add('is-visible', 'reveal-immediate');
      observer.unobserve(item);
    }
  });

  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    observer.disconnect();
    items.forEach(item => item.classList.remove('text-reveal'));
  });
}

setupTextReveals();
