import './supplier-chat.js?v=3';
import { supabase } from './supabase-client.js';
import { verifiedUser, loadAccount, siteUrl, onSessionChange } from './auth.js';

const message = document.createElement('p');
message.setAttribute('role', 'status');
message.setAttribute('aria-live', 'polite');
message.style.cssText = 'padding:12px 0;font:14px Arial,sans-serif';
const results = document.querySelector('.supplier-results-list');
results?.before(message);

let user = null;
let canSave = false;
let saved = new Set();
let revision = 0;
let ready = false;
const busy = new Set();

function controls() {
  return document.querySelectorAll(
    '.supplier-favourite, .featured-supplier-actions button'
  );
}

function vendorFor(button) {
  const card = button.closest(
    '.supplier-listing-card, .featured-supplier-card'
  );
  const name = card?.querySelector('.supplier-card-titleline h2')
    ?.textContent.trim();
  return window.wedsparksSupplierPage?.getRows()
    .find(row => row['Name of Wedding Vendor']?.trim() === name);
}

function paint() {
  for (const button of controls()) {
    const vendor = vendorFor(button);
    const selected = Boolean(vendor && saved.has(vendor.vendor_id));
    const pressed = String(selected);

    if (button.getAttribute('aria-pressed') !== pressed) {
      button.setAttribute('aria-pressed', pressed);
    }
    if (button.classList.contains('is-saved') !== selected) {
      button.classList.toggle('is-saved', selected);
    }

    const span = button.querySelector('span');
    const label = selected ? 'Saved - remove' : 'Save to Favourites';
    if (span && span.textContent !== label) span.textContent = label;

    const disabled = !ready || Boolean(vendor && busy.has(vendor.vendor_id));
    if (button.disabled !== disabled) button.disabled = disabled;
  }
}

async function refreshAccount() {
  const version = ++revision;
  ready = false;
  user = null;
  canSave = false;
  saved = new Set();
  paint();

  try {
    const current = await verifiedUser();
    if (version !== revision) return;

    if (current) {
      const account = await loadAccount(current);
      if (version !== revision) return;

      const result = await supabase.from('saved_suppliers')
        .select('vendor_id')
        .eq('user_id', current.id);

      if (version !== revision) return;
      if (result.error) throw new Error();

      user = current;
      canSave = account.roles.includes('couple');
      saved = new Set(result.data.map(row => row.vendor_id));
    }

    ready = true;
    paint();
  } catch {
    if (version === revision) {
      message.textContent =
        'Could not load favourites. Refresh to try again.';
    }
  }
}

// Capture clicks before the old visual-only save handlers.
document.addEventListener('click', async event => {
  const button = event.target.closest(
    '.supplier-favourite, .featured-supplier-actions button'
  );
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (!ready) return;

  const vendor = vendorFor(button);
  if (!vendor?.vendor_id) {
    message.textContent = 'This supplier could not be identified.';
    return;
  }

  if (!user) {
    const login = new URL(siteUrl('login/'));
    login.searchParams.set('returnTo', location.pathname + location.search);
    location.assign(login.href);
    return;
  }

  if (!canSave) {
    message.textContent =
      'Saving suppliers requires a wedding planning account.';
    return;
  }

  const id = vendor.vendor_id;
  if (busy.has(id)) return;

  const version = revision;
  const owner = user.id;
  const removing = saved.has(id);
  busy.add(id);
  paint();
  message.textContent = '';

  try {
    const result = removing
      ? await supabase.from('saved_suppliers')
          .delete().eq('user_id', owner).eq('vendor_id', id)
          .select('vendor_id')
      : await supabase.from('saved_suppliers')
          .insert({ user_id: owner, vendor_id: id })
          .select('vendor_id');

    if (version !== revision) return;
    if (result.error || result.data?.length !== 1) throw new Error();

    if (removing) saved.delete(id);
    else saved.add(id);

    message.textContent = removing
      ? 'Supplier removed from favourites.'
      : 'Supplier saved to favourites.';
  } catch {
    if (version === revision) {
      message.textContent =
        'Could not confirm the change. Refresh and try again.';
    }
  } finally {
    busy.delete(id);
    paint();
  }
}, true);

const observer = new MutationObserver(paint);
const section = results?.closest('.supplier-results');
if (section) {
  observer.observe(section, { childList: true, subtree: true });
}

onSessionChange(() => {
  revision++;
  ready = false;
  user = null;
  saved.clear();
  paint();
  setTimeout(refreshAccount, 0);
});

refreshAccount();
