const menuButton = document.querySelector('.mobile-menu-toggle');
const mobileMenu = document.querySelector('#marketplace-mobile-navigation');

menuButton?.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
  mobileMenu.hidden = !opening;
});

document.addEventListener('click', event => {
  if (mobileMenu?.hidden || mobileMenu?.contains(event.target) || menuButton?.contains(event.target)) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
});
