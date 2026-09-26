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

const searchTriggers = [...document.querySelectorAll('[data-marketplace-trigger]')];
const closeSearchDropdowns = () => searchTriggers.forEach(trigger => {
  trigger.setAttribute('aria-expanded', 'false');
  document.getElementById(trigger.dataset.marketplaceTrigger).hidden = true;
});

searchTriggers.forEach(trigger => {
  const dropdown = document.getElementById(trigger.dataset.marketplaceTrigger);
  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const opening = dropdown.hidden;
    closeSearchDropdowns();
    dropdown.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
  });
  dropdown.querySelectorAll(':scope > button:not(.marketplace-date-apply)').forEach(option => {
    option.addEventListener('click', () => {
      trigger.querySelector('strong').textContent = option.textContent.trim();
      closeSearchDropdowns();
      trigger.focus();
    });
  });
});

const dateInput = document.querySelector('#marketplace-date');
document.querySelector('.marketplace-date-apply')?.addEventListener('click', () => {
  if (!dateInput.value) return;
  const selectedDate = new Date(`${dateInput.value}T00:00:00`);
  const label = new Intl.DateTimeFormat('en-AU', {weekday:'short', day:'2-digit', month:'short', year:'numeric'}).format(selectedDate);
  document.querySelector('[data-marketplace-trigger="marketplace-date-options"] strong').textContent = label;
  closeSearchDropdowns();
});

document.addEventListener('click', event => {
  if (!event.target.closest('.marketplace-search-field')) closeSearchDropdowns();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeSearchDropdowns();
});
