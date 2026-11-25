"use strict";

// Standalone page navigation; no homepage-only rendering is needed here.
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#primary-nav');
menuToggle.hidden = false;
document.documentElement.classList.add('js');

function closePricingMenu(returnFocus = false) {
  menuToggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
  if (returnFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
});
menu.addEventListener('click', event => {
  if (event.target.closest('a')) closePricingMenu();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header-inner')) closePricingMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') closePricingMenu(true);
});
window.matchMedia('(min-width: 761px)').addEventListener('change', () => closePricingMenu());
document.querySelector('#year').textContent = new Date().getFullYear();


