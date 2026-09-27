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
  const marketplaceExpandedGrid = document.querySelector('#marketplace-expanded-categories');
  const marketplaceShowCategories = document.querySelector('#marketplace-show-categories');
  const marketplaceHideCategories = document.querySelector('#marketplace-hide-categories');
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

  const createCategoryCard = (row, featured = false) => {
      const link = document.createElement('a');
      link.className = `marketplace-category-card has-data-image${featured ? ' marketplace-category-featured' : ''}`;
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
  };

  const renderMarketplaceCategories = rows => {
    const featuredRows = rows.filter(row => !/^cake$/i.test(row.name.trim())).slice(0, 7);
    const remainingRows = rows.filter(row => !featuredRows.includes(row));
    const cards = featuredRows.map((row, index) => createCategoryCard(row, index === 0));
    if (cards.length) marketplaceCategoryGrid.replaceChildren(...cards);

    if (marketplaceExpandedGrid && marketplaceShowCategories && remainingRows.length) {
      const remainingCards = remainingRows.map((row, index) => {
        const card = createCategoryCard(row);
        card.style.setProperty('--card-index', index);
        return card;
      });
      marketplaceExpandedGrid.replaceChildren(...remainingCards);
      marketplaceShowCategories.hidden = false;
    }
  };

  marketplaceShowCategories?.addEventListener('click', () => {
    marketplaceShowCategories.setAttribute('aria-expanded', 'true');
    marketplaceShowCategories.hidden = true;
    marketplaceExpandedGrid.hidden = false;
    marketplaceHideCategories.hidden = false;
    marketplaceExpandedGrid.classList.remove('is-open');
    marketplaceExpandedGrid.style.setProperty('--expanded-height', `${marketplaceExpandedGrid.scrollHeight}px`);
    marketplaceExpandedGrid.getBoundingClientRect();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => marketplaceExpandedGrid.classList.add('is-open'));
    });
  });

  marketplaceHideCategories?.addEventListener('click', () => {
    marketplaceShowCategories.setAttribute('aria-expanded', 'false');
    marketplaceExpandedGrid.classList.remove('is-open');
    marketplaceHideCategories.hidden = true;
    window.setTimeout(() => {
      marketplaceExpandedGrid.hidden = true;
      marketplaceShowCategories.hidden = false;
    }, 650);
  });

  window.addEventListener('resize', () => {
    if (marketplaceShowCategories?.getAttribute('aria-expanded') === 'true') {
      marketplaceExpandedGrid.style.setProperty('--expanded-height', `${marketplaceExpandedGrid.scrollHeight}px`);
    }
  });

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

const marketplaceLocationTrack = document.querySelector('#marketplace-location-track');
if (marketplaceLocationTrack) {
  const pagination = document.querySelector('.marketplace-location-pagination');
  const SUPABASE_URL = 'https://vfdtyxcfrqnqdyuimtho.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd';
  let pageButtons = [];

  const safeLocationUrl = value => {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const supplierCountLabel = value => {
    const text = String(value ?? '').trim();
    if (!text) return 'Suppliers';
    if (/suppliers?$/i.test(text)) return text;
    const numericValue = Number(text.replaceAll(',', '').replace('+', ''));
    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString('en-AU')}+ suppliers` : `${text} suppliers`;
  };

  const createLocationPagination = () => {
    const card = marketplaceLocationTrack.querySelector('.marketplace-location-card');
    if (!card) return;
    const gap = Number.parseFloat(getComputedStyle(marketplaceLocationTrack).columnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    const visibleCount = Math.max(1, Math.floor((marketplaceLocationTrack.clientWidth + gap) / step));
    const hiddenCount = Math.max(0, marketplaceLocationTrack.children.length - visibleCount);
    const pageCount = hiddenCount > 0 ? hiddenCount + 1 : 0;
    pagination.replaceChildren();
    pagination.hidden = pageCount === 0;
    pageButtons = Array.from({length: pageCount}, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show wedding location position ${index + 1}`);
      button.setAttribute('aria-current', String(index === 0));
      button.addEventListener('click', () => {
        marketplaceLocationTrack.scrollTo({left: step * index, behavior: 'smooth'});
      });
      pagination.append(button);
      return button;
    });
  };

  const renderLocations = rows => {
    const activeRows = rows
      .filter(row => {
        const active = row.is_active ?? row.Is_active;
        return active === true || String(active).toLowerCase() === 'true';
      })
      .sort((a, b) => Number(a.display_order ?? a.dispaly_order ?? a.Display_order ?? a.Dispaly_order ?? 0) - Number(b.display_order ?? b.dispaly_order ?? b.Display_order ?? b.Dispaly_order ?? 0));
    const cards = activeRows.map(row => {
      const link = document.createElement('a');
      link.className = 'marketplace-location-card';
      link.href = safeLocationUrl(row.destination_url ?? row.desintation_url ?? row.Destination_url ?? row.Desintation_url) || '#';

      const image = document.createElement('img');
      image.src = safeLocationUrl(row.image_url ?? row.Image_url) || '../assets/background-v2.png';
      image.alt = row.location_name ?? row.Location_name ?? 'Wedding location';

      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = row.location_name ?? row.Location_name ?? 'Wedding location';
      const count = document.createElement('small');
      count.textContent = supplierCountLabel(row.location_suppliers ?? row.Location_suppliers);
      const arrow = document.createElement('b');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      content.append(title, count, arrow);
      link.append(image, content);
      return link;
    });
    if (!cards.length) return;
    marketplaceLocationTrack.replaceChildren(...cards);
    marketplaceLocationTrack.scrollLeft = 0;
    createLocationPagination();
  };

  let locationFrame;
  marketplaceLocationTrack.addEventListener('scroll', () => {
    cancelAnimationFrame(locationFrame);
    locationFrame = requestAnimationFrame(() => {
      const maxScroll = marketplaceLocationTrack.scrollWidth - marketplaceLocationTrack.clientWidth;
      const card = marketplaceLocationTrack.querySelector('.marketplace-location-card');
      const gap = Number.parseFloat(getComputedStyle(marketplaceLocationTrack).columnGap) || 0;
      const step = card ? card.getBoundingClientRect().width + gap : 1;
      const active = maxScroll > 0 ? Math.round(marketplaceLocationTrack.scrollLeft / step) : 0;
      pageButtons.forEach((button, index) => button.setAttribute('aria-current', String(index === active)));
    });
  }, {passive: true});

  const loadLocations = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Locations?select=*`, {
        headers: {apikey: SUPABASE_PUBLISHABLE_KEY}
      });
      if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
      const rows = await response.json();
      if (Array.isArray(rows)) renderLocations(rows);
    } catch (error) {
      console.warn('Using local wedding-location fallback:', error.message);
    }
  };

  createLocationPagination();
  window.addEventListener('resize', () => {
    marketplaceLocationTrack.scrollLeft = 0;
    createLocationPagination();
  });
  loadLocations();
}
