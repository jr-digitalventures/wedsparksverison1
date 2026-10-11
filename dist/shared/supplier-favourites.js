import { supabase } from './supabase-client.js';
import {
  verifiedUser, loadAccount, siteUrl, onSessionChange
} from './auth.js';

const list = document.querySelector('.supplier-results-list');
const pagination = document.querySelector('.supplier-pagination');
const template = list.querySelector('.supplier-listing-card').cloneNode(true);

const status = document.createElement('p');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
list.before(status);

const featured = document.querySelector('.featured-supplier-card');
if (featured) {
  featured.style.setProperty('display', 'none', 'important');
}

let page = 0;
let revision = 0;
let user = null;
let canSave = false;
let saved = new Set();

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function renderButton(button, vendor) {
  const selected = saved.has(vendor.vendor_id);
  button.classList.toggle('is-saved', selected);
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label',
    `${selected ? 'Remove' : 'Save'} ${vendor['Name of Wedding Vendor']}`);
  button.querySelector('span').textContent =
    selected ? 'Saved - remove' : 'Save to Favourites';
}

async function toggleSave(button, vendor, version) {
  if (button.disabled || version !== revision) return;

  if (!user) {
    const login = new URL(siteUrl('login/'));
    const returnTo = location.pathname + location.search +
      '#supplier-' + vendor.vendor_id;
    login.searchParams.set('returnTo', returnTo);
    location.assign(login.href);
    return;
  }

  if (!canSave) {
    status.textContent =
      'Saving suppliers requires a wedding planning account.';
    return;
  }

  const owner = user.id;
  const removing = saved.has(vendor.vendor_id);
  button.disabled = true;
  status.textContent = '';

  try {
    const result = removing
      ? await supabase.from('saved_suppliers')
          .delete()
          .eq('user_id', owner)
          .eq('vendor_id', vendor.vendor_id)
          .select('vendor_id')
      : await supabase.from('saved_suppliers')
          .insert({
            user_id: owner,
            vendor_id: vendor.vendor_id
          })
          .select('vendor_id');

    if (version !== revision) return;
    if (result.error || result.data?.length !== 1) throw new Error();

    if (removing) saved.delete(vendor.vendor_id);
    else saved.add(vendor.vendor_id);

    renderButton(button, vendor);
    status.textContent = removing
      ? 'Supplier removed from favourites.'
      : 'Supplier saved to favourites.';
  } catch {
    if (version === revision) {
      status.textContent =
        'Could not confirm the change. Refresh and try again.';
    }
  } finally {
    button.disabled = false;
  }
}

function makeCard(vendor, version) {
  const card = template.cloneNode(true);
  card.hidden = false;
  card.id = 'supplier-' + vendor.vendor_id;

  function text(selector, value) {
    const element = card.querySelector(selector);
    if (element) element.textContent = value || '';
  }

  text('h2', vendor['Name of Wedding Vendor']);
  text('.supplier-type', vendor['Wedding Vendor Type']);
  text('.supplier-price-value', vendor['Starting Price']);
  text('.supplier-location span', vendor.Location);
  text('.supplier-description', vendor['About Paragraph']);

  const price = card.querySelector('.supplier-card-price-block');
  if (price && !vendor['Starting Price']) {
    price.style.display = 'none';
  }

  const features = card.querySelector('.supplier-features');
  if (features) {
    const seed = features.firstElementChild?.cloneNode(true);
    features.replaceChildren();

    for (let index = 1; index <= 4; index++) {
      const value = vendor['Showcased Feature #' + index];
      if (!value || !seed) continue;
      const feature = seed.cloneNode(true);
      feature.querySelector('b').textContent = value;
      features.append(feature);
    }
  }

  card.querySelector('.supplier-tags')?.remove();

  const profile = card.querySelector('.supplier-profile-button');
  const destination = safeUrl(vendor['Destination URL']);
  if (profile) {
    if (destination) profile.href = destination;
    else profile.style.display = 'none';
  }

  const images = Array.from({ length: 10 }, (_, index) =>
    safeUrl(vendor['Image #' + (index + 1)])
  ).filter(Boolean);

  const image = card.querySelector('.supplier-listing-media img');
  const counter = card.querySelector('.listing-image-count');
  let imageIndex = 0;

  function showImage() {
    if (images.length) {
      image.style.display = '';
      image.src = images[imageIndex];
      image.alt = vendor['Name of Wedding Vendor'];
      image.loading = 'lazy';
      image.onerror = () => { image.style.display = 'none'; };
    } else {
      image.removeAttribute('src');
      image.style.display = 'none';
    }

    if (counter) {
      counter.style.display = images.length < 2 ? 'none' : '';
      counter.textContent = `${imageIndex + 1}/${images.length}`;
    }
  }

  for (const [selector, direction] of [
    ['.listing-image-prev', -1],
    ['.listing-image-next', 1]
  ]) {
    const arrow = card.querySelector(selector);
    if (!arrow) continue;
    arrow.style.display = images.length < 2 ? 'none' : '';
    arrow.addEventListener('click', () => {
      imageIndex =
        (imageIndex + direction + images.length) % images.length;
      showImage();
    });
  }

  showImage();

  const button = card.querySelector('.supplier-favourite');
  renderButton(button, vendor);
  button.addEventListener('click', () =>
    toggleSave(button, vendor, version));

  return card;
}

function renderFeaturedSupplier(vendor, version) {
  document.querySelector('#real-featured-supplier')?.remove();
  if (!vendor) return;

  const card = makeCard(vendor, version);
  card.id = 'real-featured-supplier';
  card.className = 'featured-supplier-card';

  const media = card.querySelector('.supplier-listing-media');
  media.className = 'featured-supplier-media';

  const content = card.querySelector('.supplier-listing-content');
  content.className = 'featured-supplier-content';

  const description = card.querySelector('.supplier-description');
  description.textContent =
    vendor['Highlighted About Paragraph'] ||
    vendor['About Paragraph'] || '';

  const features = card.querySelector('.supplier-features');
  const seed = features?.firstElementChild?.cloneNode(true);
  if (features && seed) {
    const values = Array.from({ length: 6 }, (_, index) =>
      vendor['Highlighted Feature #' + (index + 1)]
    ).filter(Boolean);

    if (values.length) {
      features.replaceChildren();
      for (const value of values) {
        const item = seed.cloneNode(true);
        item.querySelector('b').textContent = value;
        features.append(item);
      }
    }
  }

  const badge = document.createElement('span');
  badge.textContent = 'Featured supplier';
  badge.style.cssText =
    'position:absolute;top:20px;left:20px;z-index:5;padding:10px 16px;background:#faf8f5;border-radius:25px;font:600 12px Arial,sans-serif;letter-spacing:1px';
  media.append(badge);

  const actions = document.createElement('div');
  actions.className = 'featured-supplier-actions';

  const save = card.querySelector('.supplier-favourite');
  save.classList.remove('supplier-favourite');
  save.style.cssText =
    'display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px;border:1px solid #dedbd6;border-radius:8px;background:#fff;color:#103e33;cursor:pointer';
  const icon = save.querySelector('svg');
  if (icon) {
    icon.style.cssText =
      'width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.5';
  }
  actions.append(save);

  const profile = card.querySelector('.supplier-profile-button');
  if (profile) {
    profile.classList.remove('supplier-profile-button');
    actions.append(profile);
  }

  content.append(actions);
  list.before(card);
}

const parameters = new URLSearchParams(location.search);
const filters = {
  category: parameters.get('category') || '',
  location: parameters.get('location') || '',
  price: parameters.get('price') || '',
  style: parameters.get('style') || ''
};

let cataloguePromise = null;
let menusReady = false;

const priceOptions = [
  ['', 'Any price'],
  ['under1000', 'Under $1,000'],
  ['1000to2500', '$1,000 to under $2,500'],
  ['2500to5000', '$2,500 to under $5,000'],
  ['5000plus', '$5,000+']
];

const definitions = [
  ['category', 'heading-category-options', 'All categories'],
  ['location', 'heading-location-options', 'All locations'],
  ['price', 'supplier-price-options', 'Starting price'],
  ['style', 'supplier-style-options', 'Any style']
];

const clear = document.createElement('button');
clear.type = 'button';
clear.textContent = 'Clear filters';
clear.style.cssText =
  'min-height:44px;padding:10px 18px;margin:0 0 20px;border:1px solid #103e33;border-radius:8px;background:white;color:#103e33;cursor:pointer';
status.before(clear);
clear.addEventListener('click', () => {
  Object.keys(filters).forEach(key => { filters[key] = ''; });
  page = 0;
  updateFilterLabels();
  rememberFilters();
  load();
});

function styleValues(value) {
  return String(value || '')
    .split(/[,;|]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function locationValues(vendor) {
  return [
    vendor.Location,
    vendor['Location - Suburb/City'],
    vendor['Location - State']
  ].filter(Boolean).map(value => String(value).trim());
}

// Only interpret an unambiguous single monetary amount.
// Ranges and "POA" remain visible under Any price.
function startingPrice(value) {
  const text = String(value || '').trim();
  const match = text.match(
    /^(?:from\s+)?(?:AUD\s*)?\$?\s*(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?\s*\+?$/i
  );
  if (!match) return null;
  return Number(
    match[1].replaceAll(',', '') +
    (match[2] ? '.' + match[2] : '')
  );
}

function matches(vendor) {
  if (filters.category &&
      vendor['Wedding Vendor Type'] !== filters.category) return false;

  if (filters.location &&
      !locationValues(vendor).includes(filters.location)) return false;

  if (filters.style &&
      !styleValues(vendor['Vendor Style']).includes(filters.style)) return false;

  if (filters.price) {
    const amount = startingPrice(vendor['Starting Price']);
    if (amount === null) return false;
    if (filters.price === 'under1000' && amount >= 1000) return false;
    if (filters.price === '1000to2500' &&
        (amount < 1000 || amount >= 2500)) return false;
    if (filters.price === '2500to5000' &&
        (amount < 2500 || amount >= 5000)) return false;
    if (filters.price === '5000plus' && amount < 5000) return false;
  }

  return true;
}

function rememberFilters() {
  const url = new URL(location.href);
  for (const key of Object.keys(filters)) {
    if (filters[key]) url.searchParams.set(key, filters[key]);
    else url.searchParams.delete(key);
  }
  url.hash = '';
  history.replaceState(null, '', url);
}

function updateFilterLabels() {
  for (const [key, id, fallback] of definitions) {
    const trigger = document.querySelector(
      `[aria-controls="${id}"]`
    );
    if (!trigger) continue;

    const label = key === 'price'
      ? priceOptions.find(option => option[0] === filters.price)?.[1]
      : filters[key];

    trigger.querySelector('span').textContent = label || fallback;
    trigger.classList.toggle('is-selected', Boolean(filters[key]));
  }
  clear.hidden = !Object.values(filters).some(Boolean);
}

function setupMenus(vendors) {
  const unique = values =>
    [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'en-AU'));

  const options = {
    category: [
      ['', 'All categories'],
      ...unique(vendors.map(v => v['Wedding Vendor Type']))
        .map(value => [value, value])
    ],
    location: [
      ['', 'All locations'],
      ...unique(vendors.flatMap(locationValues))
        .map(value => [value, value])
    ],
    price: priceOptions,
    style: [
      ['', 'Any style'],
      ...unique(vendors.flatMap(v => styleValues(v['Vendor Style'])))
        .map(value => [value, value])
    ]
  };

  for (const [key, id] of definitions) {
    const menu = document.getElementById(id);
    menu.replaceChildren();
    menu.style.maxHeight = '320px';
    menu.style.overflowY = 'auto';

    if (!options[key].some(option => option[0] === filters[key])) {
      filters[key] = '';
    }

    for (const [value, label] of options[key]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;

      button.addEventListener('click', () => {
        filters[key] = value;
        page = 0;
        menu.hidden = true;

        const trigger = document.querySelector(
          `[aria-controls="${id}"]`
        );
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();

        updateFilterLabels();
        rememberFilters();
        load();
      });

      menu.append(button);
    }
  }

  updateFilterLabels();
  menusReady = true;
}

async function catalogue() {
  if (!cataloguePromise) {
    cataloguePromise = (async () => {
      const rows = [];
      const batchSize = 500;

      for (let offset = 0; ; offset += batchSize) {
        const result = await supabase.from('Vendor Public Profiles')
          .select('*')
          .eq('Profile Active', true)
          .order('Name of Wedding Vendor')
          .range(offset, offset + batchSize - 1);

        if (result.error) throw new Error();
        rows.push(...result.data);
        if (result.data.length < batchSize) break;
      }

      return rows;
    })().catch(error => {
      cataloguePromise = null;
      throw error;
    });
  }

  return cataloguePromise;
}

async function load() {
  const version = ++revision;
  list.replaceChildren();
  pagination.replaceChildren();
  pagination.style.display = 'none';
  document.querySelector('#real-featured-supplier')?.remove();
  status.textContent = 'Loading suppliers...';
  user = null;
  canSave = false;
  saved = new Set();

  try {
    const currentUser = await verifiedUser();
    if (version !== revision) return;

    if (currentUser) {
      const account = await loadAccount(currentUser);
      if (version !== revision) return;

      user = currentUser;
      canSave = account.roles.includes('couple');

      const favourites = await supabase.from('saved_suppliers')
        .select('vendor_id')
        .eq('user_id', user.id);

      if (version !== revision) return;
      if (favourites.error) throw new Error();

      saved = new Set(favourites.data.map(row => row.vendor_id));
    }

    const vendors = await catalogue();
    if (version !== revision) return;
    if (!menusReady) setupMenus(vendors);

    const results = vendors.filter(matches);
    const total = results.length;
    page = Math.min(page, Math.max(0, Math.ceil(total / 15) - 1));

    const count = document.querySelector(
      '#supplier-results-title > span:first-child'
    );
    if (count) count.textContent = String(total);

    const highlighted = results
      .filter(vendor => vendor['Highlighted Record'])
      .sort((a, b) => {
        const priority = value =>
          value === null || value === undefined
            ? Infinity : Number(value);
        return priority(a['Featured Priority']) -
          priority(b['Featured Priority']);
      })[0];

    renderFeaturedSupplier(highlighted, version);

    list.replaceChildren(
      ...results.slice(page * 15, page * 15 + 15)
        .map(vendor => makeCard(vendor, version))
    );

    status.textContent = total
      ? `${total} matching suppliers. Page ${page + 1}.`
      : 'No suppliers match these filters. Try clearing a filter.';

    for (const [label, target] of [
      ['Previous', page - 1],
      ['Next', page + 1]
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = target < 0 || target * 15 >= total;
      button.addEventListener('click', () => {
        page = target;
        load();
      });
      pagination.append(button);
    }

    pagination.hidden = total <= 15;
    pagination.style.display = total > 15 ? '' : 'none';

    const target = document.getElementById(location.hash.slice(1));
    if (target && list.contains(target)) target.scrollIntoView();
  } catch {
    if (version === revision) {
      status.textContent = 'Could not load suppliers. Please refresh.';
    }
  }
}

onSessionChange(() => {
  revision++;
  document.querySelector('#real-featured-supplier')?.remove();
  list.replaceChildren();
  user = null;
  saved.clear();
  setTimeout(load, 0);
});

load();
