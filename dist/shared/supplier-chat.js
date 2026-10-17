import { supabase } from './supabase-client.js';
import { verifiedUser, loadAccount, siteUrl, onSessionChange } from './auth.js';

const results = document.querySelector('.supplier-results');
let eligible = new Set(), revision = 0, accountOwner = null;
let refreshTimer = null;

function paintSupplierChats() {
  if (!results) return;

  const vendors = new Map(
    (window.wedsparksSupplierPage?.getRows() || []).map(row => [
      String(row['Name of Wedding Vendor'] || '').trim(),row
    ])
  );

  for (const card of results.querySelectorAll(
    '.supplier-listing-card,.featured-supplier-card'
  )) {
    const name = card.querySelector('.supplier-card-titleline h2')
      ?.textContent.trim();
    const vendor = vendors.get(name);
    let link = card.querySelector('.ws-supplier-chat');

    if (!vendor?.vendor_id || !eligible.has(vendor.vendor_id)) {
      link?.remove();
      continue;
    }

    if (link && link.dataset.vendorId === vendor.vendor_id) continue;

    const target = new URL(siteUrl('dashboard/messages/'));
    target.searchParams.set('vendor',vendor.vendor_id);

    if (!link) {
      link = document.createElement('a');
      link.className = 'ws-supplier-chat';
      link.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 12h5"/></svg><span>Chat with supplier</span>';

      const featuredActions = card.querySelector(
        '.featured-supplier-actions'
      );
      const profile = card.querySelector('.supplier-profile-button');

      if (featuredActions) featuredActions.append(link);
      else if (profile) profile.after(link);
      else continue;
    }

    link.dataset.vendorId = vendor.vendor_id;
    link.href = target.href;
    link.setAttribute('aria-label','Chat with ' + name);
  }
}

async function loadChatSuppliers() {
  const current = ++revision;

  try {
    const user = await verifiedUser();
    if (current !== revision) return;

    if (!user) {
      accountOwner = null;
      eligible = new Set();
      paintSupplierChats();
      return;
    }

    accountOwner = user.id;
    const account = await loadAccount(user);
    if (current !== revision) return;

    if (!account.roles.includes('couple')) {
      eligible = new Set();
      paintSupplierChats();
      return;
    }

    const ids = new Set();

    for (let offset = 0; offset <= 10000; offset += 100) {
      const {data,error} = await supabase.rpc('get_message_suppliers',{
        p_search:'',p_limit:100,p_offset:offset
      });

      if (current !== revision) return;
      if (error || !Array.isArray(data)) throw new Error();

      data.forEach(row => ids.add(row.vendor_id));
      if (data.length < 100) break;
    }

    eligible = ids;
    paintSupplierChats();
  } catch {
    if (current === revision) {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void loadChatSuppliers(),10000);
    }
  }
}

if (results) {
  const style = document.createElement('style');
  style.textContent =
    'a.ws-supplier-chat{display:inline-flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 0;padding:11px 17px;background:#213e34;color:white;border-radius:8px;font:600 14px/1.4 Arial,sans-serif;text-decoration:none}' +
    'a.ws-supplier-chat:hover{background:#305547;color:white}' +
    'a.ws-supplier-chat:focus-visible{outline:3px solid #ad7542;outline-offset:3px}' +
    '.featured-supplier-actions a.ws-supplier-chat{margin:0;color:white;background:#213e34}';
  document.head.append(style);

  new MutationObserver(paintSupplierChats).observe(
    results,{childList:true,subtree:true}
  );

  onSessionChange(({user}) => {
    if (accountOwner !== (user?.id || null)) {
      revision++;
      accountOwner = user?.id || null;
      eligible = new Set();
      paintSupplierChats();
    }

    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void loadChatSuppliers(),0);
  });

  document.addEventListener('visibilitychange',() => {
    if (document.visibilityState === 'visible') {
      void loadChatSuppliers();
    }
  });

  void loadChatSuppliers();
}