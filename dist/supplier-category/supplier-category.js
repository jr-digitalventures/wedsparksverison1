const supplierFilterTriggers = [...document.querySelectorAll('[data-filter-trigger]')];
const supplierHeadingTriggers = [...document.querySelectorAll('[data-heading-filter]')];

const closeSupplierFilters = () => supplierFilterTriggers.forEach(trigger => {
  trigger.setAttribute('aria-expanded', 'false');
  const menu = document.getElementById(trigger.dataset.filterTrigger);
  if (menu) menu.hidden = true;
});

const closeSupplierHeadingFilters = () => supplierHeadingTriggers.forEach(trigger => {
  trigger.setAttribute('aria-expanded', 'false');
  const menu = document.getElementById(trigger.dataset.headingFilter);
  if (menu) menu.hidden = true;
});

supplierHeadingTriggers.forEach(trigger => {
  const menu = document.getElementById(trigger.dataset.headingFilter);
  if (!menu) return;

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const opening = menu.hidden;
    closeSupplierHeadingFilters();
    closeSupplierFilters();
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
  });

  menu.querySelectorAll('button').forEach(option => {
    option.addEventListener('click', () => {
      trigger.querySelector('span').textContent = option.textContent.trim();
      closeSupplierHeadingFilters();
      trigger.focus();
    });
  });
});

supplierFilterTriggers.forEach(trigger => {
  const menu = document.getElementById(trigger.dataset.filterTrigger);
  if (!menu) return;

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const opening = menu.hidden;
    closeSupplierFilters();
    closeSupplierHeadingFilters();
    menu.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
  });

  menu.querySelectorAll('button').forEach(option => {
    option.addEventListener('click', () => {
      trigger.querySelector('span').textContent = option.textContent.trim();
      trigger.classList.add('is-selected');
      closeSupplierFilters();
      trigger.focus();
    });
  });
});

document.addEventListener('click', event => {
  if (!event.target.closest('.supplier-filter')) closeSupplierFilters();
  if (!event.target.closest('.supplier-heading-filter')) closeSupplierHeadingFilters();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeSupplierFilters();
    closeSupplierHeadingFilters();
  }
});
