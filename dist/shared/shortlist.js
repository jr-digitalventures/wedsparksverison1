import { supabase } from './supabase-client.js';
import {
  requireUser, loadAccount, siteUrl, onSessionChange
} from './auth.js';
import '../supplier-category/supplier-routes.js';

const content = document.querySelector('#shortlist-content');
const loadingText = document.querySelector('#shortlist-loading');
const form = document.querySelector('#shortlist-filters');
const list = document.querySelector('#shortlist-results');
const status = document.querySelector('#shortlist-status');
const previous = document.querySelector('#shortlist-previous');
const next = document.querySelector('#shortlist-next');
const pageLabel = document.querySelector('#shortlist-page');
const retry = document.querySelector('#shortlist-retry');

let owner;
let page = 0;
let version = 0;
let loading = true;
let revoked = false;
let filters = { category:'', state:'', city:'', name:'', sort:'newest' };

const pageSize = 24;
const routes = globalThis.WEDSPARKS_SUPPLIER_ROUTES;
const category = form.elements.category;
const state = form.elements.state;

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, siteUrl());
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function textElement(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function addOptions(select, values, labels) {
  const selected = select.value;
  const initial = select.options[0].cloneNode(true);
  select.replaceChildren(initial);
  [...values].filter(Boolean).sort((a,b) => a.localeCompare(b))
    .forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = labels?.get(value) || value;
      select.append(option);
    });
  if (values.has(selected)) select.value = selected;
}

async function loadFilterOptions() {
  const currentOwner = owner;
  const categories = new Set();
  const states = new Set();
  let offset = 0;

  while (!revoked && owner === currentOwner) {
    const { data, error } = await supabase.from('saved_suppliers')
      .select('vendor_id,vendor:"Vendor Public Profiles"!inner("Wedding Vendor Type","Location - State")')
      .eq('user_id', currentOwner)
      .order('vendor_id')
      .range(offset, offset + 999);

    if (error) throw new Error();
    if (revoked || owner !== currentOwner) return;

    for (const row of data) {
      if (row.vendor?.['Wedding Vendor Type']) {
        categories.add(row.vendor['Wedding Vendor Type']);
      }
      if (row.vendor?.['Location - State']) {
        states.add(row.vendor['Location - State']);
      }
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  const labels = new Map(
    (routes?.categories || []).map(item => [item.value, item.label])
  );
  addOptions(category, categories, labels);
  addOptions(state, states);
}

function supplierCard(row) {
  const vendor = row.vendor;
  const item = document.createElement('li');
  item.className = 'ws-saved-card';
  const name = vendor['Name of Wedding Vendor'];
  const imageUrl = safeUrl(vendor['Image #1']);

  const placeholder = textElement('div', 'WedSparks');
  placeholder.className = 'ws-saved-placeholder';

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(placeholder));
    item.append(image);
  } else item.append(placeholder);

  const body = document.createElement('div');
  body.className = 'ws-saved-body';
  body.append(textElement('h3', name));

  for (const value of [
    vendor['Wedding Vendor Type'],
    [vendor['Location - Suburb/City'], vendor['Location - State']]
      .filter(Boolean).join(', '),
    vendor['Starting Price']
      ? `Starting price: ${vendor['Starting Price']}` : '',
    vendor['Profile Active'] === true
      ? '' : 'This supplier is currently unavailable.'
  ]) {
    if (value) body.append(textElement('p', value));
  }

  const actions = document.createElement('div');
  actions.className = 'ws-saved-actions';
  const url = safeUrl(vendor['Destination URL']);
  if (url && vendor['Profile Active'] === true) {
    const link = textElement('a', 'View profile');
    link.href = url;
    actions.append(link);
  }

  const remove = textElement('button', 'Remove');
  remove.type = 'button';
  remove.className = 'text-button';
  remove.setAttribute('aria-label', `Remove ${name}`);

  remove.addEventListener('click', async () => {
    if (remove.disabled || revoked) return;
    if (!confirm(`Remove ${name} from your saved suppliers?`)) return;

    const currentOwner = owner;
    remove.disabled = true;
    try {
      const { data, error } = await supabase.from('saved_suppliers')
        .delete()
        .eq('user_id', currentOwner)
        .eq('vendor_id', row.vendor_id)
        .select('vendor_id');

      if (revoked || owner !== currentOwner) return;
      if (error || data?.length !== 1) throw new Error();

      await loadResults();
      window.dispatchEvent(new Event('wedsparks:saved-changed'));
    } catch {
      if (!revoked) {
        status.textContent = 'Couldn’t confirm removal. Please try again.';
      }
    } finally { remove.disabled = false; }
  });

  actions.append(remove);
  body.append(actions);
  item.append(body);
  return item;
}

const pattern = value =>
  '%' + value.replace(/[\\%_]/g, character => '\\' + character) + '%';

async function loadResults() {
  if (!owner || revoked) return;
  const current = ++version;
  const requestedPage = page;
  loading = true;
  previous.disabled = next.disabled = true;
  retry.hidden = true;
  list.replaceChildren();
  status.textContent = 'Loading your shortlist…';

  try {
    let query = supabase.from('saved_suppliers')
      .select(
        'vendor_id,created_at,vendor:"Vendor Public Profiles"!inner(vendor_id,"Name of Wedding Vendor","Wedding Vendor Type","Image #1","Starting Price","Location - Suburb/City","Location - State","Destination URL","Profile Active")',
        { count: 'exact' }
      )
      .eq('user_id', owner);

    if (filters.category) {
      query = query.eq('vendor.Wedding Vendor Type', filters.category);
    }
    if (filters.state) {
      query = query.eq('vendor.Location - State', filters.state);
    }
    if (filters.city) {
      query = query.ilike('vendor.Location - Suburb/City', pattern(filters.city));
    }
    if (filters.name) {
      query = query.ilike('vendor.Name of Wedding Vendor', pattern(filters.name));
    }

    query = filters.sort === 'name'
      ? query.order('vendor(Name of Wedding Vendor)', { ascending: true })
      : query.order('created_at', { ascending: filters.sort === 'oldest' });

    query = query.order('vendor_id')
      .range(requestedPage * pageSize, (requestedPage + 1) * pageSize - 1);

    const { data, error, count } = await query;
    if (current !== version || revoked) return;
    if (error || count == null) throw new Error();

    const lastPage = Math.max(0, Math.ceil(count / pageSize) - 1);
    if (requestedPage > lastPage) {
      page = lastPage;
      void loadResults();
      return;
    }

    data.forEach(row => list.append(supplierCard(row)));
    const filtered = filters.category || filters.state ||
      filters.city || filters.name;

    status.textContent = count
      ? `${count} saved suppliers${filtered ? ' match your filters' : ''}. Showing ${requestedPage * pageSize + 1}–${requestedPage * pageSize + data.length}.`
      : filtered
        ? 'No saved suppliers match. Change or clear your filters.'
        : 'No saved suppliers yet. Browse the marketplace to find your favourites.';

    pageLabel.textContent = count
      ? `Page ${requestedPage + 1} of ${lastPage + 1}` : '';

    previous.disabled = requestedPage === 0;
    next.disabled = requestedPage >= lastPage;
  } catch {
    if (current === version && !revoked) {
      status.textContent = 'Couldn’t load your shortlist. Please try again.';
      pageLabel.textContent = '';
      retry.hidden = false;
    }
  } finally {
    if (current === version) loading = false;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(form);
  filters = Object.fromEntries(
    ['category','state','city','name','sort'].map(key =>
      [key, String(values.get(key) || '').trim()]
    )
  );
  page = 0;
  void loadResults();
});

form.addEventListener('reset', () => {
  setTimeout(() => {
    filters = { category:'', state:'', city:'', name:'', sort:'newest' };
    page = 0;
    void loadResults();
  }, 0);
});

previous.addEventListener('click', () => {
  if (!loading && page > 0) { page--; void loadResults(); }
});
next.addEventListener('click', () => {
  if (!loading) { page++; void loadResults(); }
});
retry.addEventListener('click', () => void start());

window.addEventListener('wedsparks:section-open', event => {
  if (event.detail === 'shortlist' && !loading && owner && !revoked) {
    void loadResults();
  }
});

onSessionChange(({ user }) => {
  if (owner && user?.id !== owner) {
    revoked = true;
    version++;
    list.replaceChildren();
    content.hidden = true;
    location.replace(siteUrl('login/'));
  }
});

async function start() {
  try {
    loading = true;
    const user = await requireUser();
    if (!user || revoked) return;
    const account = await loadAccount(user);
    if (revoked) return;
    if (!account.roles.includes('couple')) {
      location.replace(siteUrl('supplier-account/'));
      return;
    }

    owner = user.id;
    document.querySelector('#shortlist-browse').href =
      siteUrl('marketplace-search/');
    loadingText.hidden = true;
    content.hidden = false;

    await loadResults();
    try {
      await loadFilterOptions();
    } catch {
      if (!revoked) {
        status.textContent +=
          ' Filter options could not load. Use Try again to reload them.';
        retry.hidden = false;
      }
    }
  } catch {
    loadingText.textContent =
      'Couldn’t load your account. Refresh the page to try again.';
  }
}
void start();