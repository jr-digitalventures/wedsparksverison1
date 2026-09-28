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

const supplierDateInput = document.querySelector('#supplier-filter-date');
const supplierDateApply = document.querySelector('.supplier-date-apply');
supplierDateApply?.addEventListener('click', () => {
  if (!supplierDateInput?.value) return;
  const selectedDate = new Date(`${supplierDateInput.value}T00:00:00`);
  const label = new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(selectedDate);
  const dateTrigger = document.querySelector('[data-filter-trigger="supplier-date-options"]');
  dateTrigger.querySelector('span').textContent = label;
  dateTrigger.classList.add('is-selected');
  closeSupplierFilters();
  dateTrigger.focus();
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

  menu.querySelectorAll('button:not(.supplier-date-apply)').forEach(option => {
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
