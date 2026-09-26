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

const marketplaceCategoryGrid = document.querySelector('#marketplace-category-grid');
if (marketplaceCategoryGrid) {
  const SUPABASE_URL = 'https://vfdtyxcfrqnqdyuimtho.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd';
  const safeUrl = value => {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const renderMarketplaceCategories = rows => {
    const featuredRows = rows.filter(row => !/^cake$/i.test(row.name.trim())).slice(0, 7);
    const cards = featuredRows.map((row, index) => {
      const link = document.createElement('a');
      link.className = `marketplace-category-card has-data-image${index === 0 ? ' marketplace-category-featured' : ''}`;
      link.href = safeUrl(row.destination_url) || '#';
      const imageUrl = safeUrl(row.image_url);
      if (imageUrl) link.style.backgroundImage = `url("${imageUrl.replaceAll('"', '%22')}")`;

      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = row.name;
      const action = document.createElement('small');
      action.append('Explore ');
      const arrow = document.createElement('b');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      action.append(arrow);
      content.append(title, action);
      link.append(content);
      return link;
    });
    if (cards.length) marketplaceCategoryGrid.replaceChildren(...cards);
  };

  const loadMarketplaceCategories = async () => {
    const query = 'select=name,display_order,image_url,destination_url&is_active=eq.true&order=display_order.asc';
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/supplier_categories?${query}`, {
        headers: {apikey: SUPABASE_PUBLISHABLE_KEY}
      });
      if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length) renderMarketplaceCategories(rows);
    } catch (error) {
      console.warn('Using local Marketplace category fallback:', error.message);
    }
  };

  loadMarketplaceCategories();
}
