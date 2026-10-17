import { supabase } from './supabase-client.js';
import {
  verifiedUser, loadAccount, onSessionChange, siteUrl
} from './auth.js';

const container = document.querySelector('#private-content');
const panel = document.createElement('section');
panel.className = 'ws-saved-panel';
panel.innerHTML = `
  <h2>Your saved suppliers</h2><p><a data-shortlist>View full shortlist</a></p>
  <p>Keep your favourites together while you decide.</p>
  <p class="ws-saved-status" role="status" aria-live="polite"></p>
  <button class="text-button" data-retry type="button" hidden>Try again</button>
  <ul class="ws-saved-grid"></ul>
  <button class="text-button" data-more type="button" hidden>Show more</button>
  <p><a data-browse>Find wedding suppliers</a></p>
`;
container?.append(panel);

const list = panel.querySelector('ul');
const status = panel.querySelector('[role=status]');
const more = panel.querySelector('[data-more]');
const retry = panel.querySelector('[data-retry]');
panel.querySelector('[data-browse]').href = siteUrl('marketplace-search/');
panel.querySelector('[data-shortlist]').href = siteUrl('dashboard/shortlist/');

let revision = 0;
let owner = null;
let offset = 0;
let loading = false;

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, siteUrl());
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function card(record, vendor, version) {
  const item = document.createElement('li');
  item.className = 'ws-saved-card';

  const imageUrl = safeUrl(vendor?.['Image #1']);
  const placeholder = document.createElement('div');
  placeholder.className = 'ws-saved-placeholder';
  placeholder.textContent = 'WedSparks';

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(placeholder));
    item.append(image);
  } else {
    item.append(placeholder);
  }

  const body = document.createElement('div');
  body.className = 'ws-saved-body';
  const heading = document.createElement('h3');
  heading.textContent =
    vendor?.['Name of Wedding Vendor'] || 'Supplier no longer available';
  body.append(heading);

  const active = vendor?.['Profile Active'] === true;

  for (const value of [
    vendor?.['Wedding Vendor Type'],
    [
      vendor?.['Location - Suburb/City'],
      vendor?.['Location - State']
    ].filter(Boolean).join(', '),
    vendor?.['Starting Price']
      ? `Starting price: ${vendor['Starting Price']}` : '',
    active ? '' : 'This supplier is currently unavailable.'
  ]) {
    if (!value) continue;
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    body.append(paragraph);
  }

  const actions = document.createElement('div');
  actions.className = 'ws-saved-actions';
  const destination = safeUrl(vendor?.['Destination URL']);

  if (active && destination) {
    const link = document.createElement('a');
    link.href = destination;
    link.textContent = 'View profile';
    actions.append(link);
  }

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'text-button';
  remove.textContent = 'Remove';
  remove.setAttribute('aria-label', `Remove ${heading.textContent}`);

  remove.addEventListener('click', async () => {
    if (remove.disabled || version !== revision) return;
    if (!confirm(`Remove ${heading.textContent} from your saved suppliers?`)) {
      return;
    }

    remove.disabled = true;
    try {
      const { data, error } = await supabase.from('saved_suppliers')
        .delete()
        .eq('user_id', owner)
        .eq('vendor_id', record.vendor_id)
        .select('vendor_id');

      if (version !== revision) return;
      if (error || data?.length !== 1) throw new Error();

      item.remove();
      offset = Math.max(0, offset - 1);
      status.textContent = list.children.length
        ? 'Supplier removed.'
        : 'No saved suppliers shown. Browse suppliers to find your favourites.';
    } catch {
      if (version === revision) {
        status.textContent = 'Couldn’t confirm removal. Please try again.';
      }
    } finally {
      remove.disabled = false;
    }
  });

  actions.append(remove);
  body.append(actions);
  item.append(body);
  return item;
}

async function load(reset = false) {
  if (!container || (loading && !reset)) return;
  const version = reset ? ++revision : revision;

  if (reset) {
    offset = 0;
    owner = null;
    list.replaceChildren();
    more.hidden = true;
  }

  loading = true;
  more.disabled = true;
  retry.hidden = true;
  status.textContent = 'Loading your saved suppliers…';

  try {
    const user = await verifiedUser();
    if (version !== revision) return;
    if (!user) {
      status.textContent = 'Log in to see your saved suppliers.';
      return;
    }

    const account = await loadAccount(user);
    if (version !== revision) return;
    if (!account.roles.includes('couple')) {
      status.textContent = 'Saved suppliers are available for couples.';
      return;
    }
    owner = user.id;

    const { data: saved, error } = await supabase.from('saved_suppliers')
      .select('vendor_id,created_at')
      .eq('user_id', owner)
      .order('created_at', { ascending: false })
      .order('vendor_id')
      .range(offset, offset + 5);

    if (version !== revision) return;
    if (error) throw new Error();

    let vendors = [];
    if (saved.length) {
      const result = await supabase.from('Vendor Public Profiles')
        .select('vendor_id,"Name of Wedding Vendor","Wedding Vendor Type","Image #1","Starting Price","Location - Suburb/City","Location - State","Destination URL","Profile Active"')
        .in('vendor_id', saved.map(row => row.vendor_id));
      if (version !== revision) return;
      if (result.error) throw new Error();
      vendors = result.data;
    }

    const byId = new Map(vendors.map(vendor => [vendor.vendor_id, vendor]));
    saved.forEach(record => list.append(
      card(record, byId.get(record.vendor_id), version)
    ));

    offset += saved.length;
    more.hidden = true;
    status.textContent = list.children.length
      ? `${list.children.length} saved suppliers shown.`
      : 'No saved suppliers yet. Save favourites while browsing the marketplace.';
  } catch {
    if (version === revision) {
      status.textContent = 'Couldn’t load your saved suppliers. Please try again.';
      retry.hidden = false;
    }
  } finally {
    if (version === revision) {
      loading = false;
      more.disabled = false;
    }
  }
}

more.addEventListener('click', () => load());
retry.addEventListener('click', () => load(true));
window.addEventListener('wedsparks:overview-open', () => load(true));

onSessionChange(({ event, user }) => {
  if (event === 'TOKEN_REFRESHED') return;
  if (!user) {
    revision++;
    owner = null;
    loading = false;
    list.replaceChildren();
    more.hidden = true;
    status.textContent = 'Log in to see your saved suppliers.';
  } else if (user.id !== owner) {
    setTimeout(() => load(true), 0);
  }
});

if (container) void load(true);