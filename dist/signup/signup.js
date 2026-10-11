const form = document.querySelector('#signup-form');
const password = document.querySelector('#signup-password');
const toggle = document.querySelector('#toggle-password');
const heading = document.querySelector('#signup-heading');

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Hide' : 'Show';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

form.addEventListener('change', () => {
  const selected = form.elements.initial_experience.value;
  heading.textContent = selected === 'supplier'
    ? 'Grow your wedding business'
    : 'Start planning your day';
});

// Account creation is enabled in the next step,
// together with email verification and callback handling.
form.addEventListener('submit', event => event.preventDefault());

const menuButton = document.querySelector('.mobile-menu-toggle');
const mobileMenu = document.querySelector('.mobile-nav-panel');

function closeMenu() {
  if (!mobileMenu || !menuButton) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}

menuButton?.addEventListener('click', () => {
  if (!mobileMenu) return;
  const opening = mobileMenu.hidden;
  mobileMenu.hidden = !opening;
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute(
    'aria-label', opening ? 'Close navigation' : 'Open navigation'
  );
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mobileMenu && !mobileMenu.hidden) {
    closeMenu();
    menuButton.focus();
  }
});

document.addEventListener('click', event => {
  if (
    !mobileMenu?.contains(event.target) &&
    !menuButton?.contains(event.target)
  ) closeMenu();
});

import './signup-submit.js';
