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

const supplierResultsList = document.querySelector('.supplier-results-list');
const supplierPagination = document.querySelector('.supplier-pagination');

if (supplierResultsList && supplierPagination) {
  const placeholderNames = [
    'Harbour & Vine', 'Evergreen Events', 'Golden Hour Studio',
    'The Garden House', 'White Rose Floral', 'Storybook Weddings',
    'Coastal Table Co.', 'Luna Photography', 'Modern Love Events',
    'The Ivory Room', 'Wildflower Collective', 'Ever After Films'
  ];
  const seedCards = [...supplierResultsList.querySelectorAll('.supplier-listing-card')];

  placeholderNames.forEach((name, index) => {
    const card = seedCards[index % seedCards.length].cloneNode(true);
    const title = card.querySelector('.supplier-card-titleline h2');
    const favourite = card.querySelector('.supplier-favourite');
    if (title) title.textContent = name;
    if (favourite) favourite.setAttribute('aria-label', `Save ${name}`);
    supplierResultsList.append(card);
  });

  const truncateCopy = (element, limit) => {
    const copy = element.textContent.trim();
    if (copy.length <= limit) return;
    const shortened = copy.slice(0, limit - 3);
    const lastSpace = shortened.lastIndexOf(' ');
    element.textContent = `${shortened.slice(0, lastSpace).trimEnd()}...`;
  };

  supplierResultsList.querySelectorAll('.supplier-listing-content > .supplier-description').forEach(description => truncateCopy(description, 300));
  supplierResultsList.querySelectorAll('.supplier-listing-content > .supplier-features b').forEach(takeaway => truncateCopy(takeaway, 40));

  const featuredDescription = document.querySelector('.featured-supplier-content > .supplier-description');
  if (featuredDescription) truncateCopy(featuredDescription, 170);
  document.querySelectorAll('.featured-supplier-content > .supplier-features b').forEach(takeaway => truncateCopy(takeaway, 30));

  const pageSize = 15;
  const cards = [...supplierResultsList.querySelectorAll('.supplier-listing-card')];
  const pageCount = Math.ceil(cards.length / pageSize);

  const animateFavourite = (control, expanded) => {
    const startWidth = parseFloat(getComputedStyle(control).width);
    const endWidth = expanded ? 180 : 42;
    control.getAnimations().forEach(animation => animation.cancel());
    control.classList.toggle('is-expanded', expanded);
    control.style.width = `${startWidth}px`;
    const animation = control.animate(
      [{width: `${startWidth}px`}, {width: `${endWidth}px`}],
      {duration: 450, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards'}
    );
    animation.addEventListener('finish', () => {
      control.style.width = `${endWidth}px`;
      animation.cancel();
    }, {once: true});
  };

  cards.forEach(card => {
    const favourite = card.querySelector('.supplier-favourite');
    if (!favourite) return;
    favourite.addEventListener('mouseenter', () => animateFavourite(favourite, true));
    favourite.addEventListener('mouseleave', () => animateFavourite(favourite, false));
    favourite.addEventListener('focus', () => animateFavourite(favourite, true));
    favourite.addEventListener('blur', () => animateFavourite(favourite, false));
  });

  const showSupplierPage = page => {
    cards.forEach((card, index) => {
      card.hidden = index < page * pageSize || index >= (page + 1) * pageSize;
    });
    supplierPagination.querySelectorAll('button').forEach((button, index) => {
      button.setAttribute('aria-current', String(index === page));
    });
  };

  if (pageCount > 1) {
    supplierPagination.hidden = false;
    Array.from({length: pageCount}, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `Show supplier results page ${index + 1}`);
      button.addEventListener('click', () => {
        showSupplierPage(index);
        supplierResultsList.scrollIntoView({behavior: 'smooth', block: 'start'});
      });
      supplierPagination.append(button);
      return button;
    });
  }
  showSupplierPage(0);
}

document.addEventListener('click', event => {
  const favourite = event.target.closest('.supplier-favourite');
  if (!favourite) return;
  const saved = favourite.classList.toggle('is-saved');
  favourite.setAttribute('aria-pressed', String(saved));
  const label = favourite.querySelector('span');
  if (label) label.textContent = saved ? 'Saved' : 'Save to Favourites';
});
