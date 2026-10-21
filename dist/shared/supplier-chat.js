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

    if (!vendor?.vendor_id || (accountOwner && !eligible.has(vendor.vendor_id))) {
      link?.remove();
      continue;
    }



    const target = new URL(siteUrl('dashboard/messages/'));
    target.searchParams.set('vendor',vendor.vendor_id);

    if (!link) {
      link = document.createElement('a');
      link.className = 'ws-supplier-chat';
      link.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H9l-5 4z"/><path d="M8 8h8M8 12h5"/></svg><span>Start a chat</span>';

      const featuredActions = card.querySelector(
        '.featured-supplier-actions'
      );
      const profile = card.querySelector('.supplier-profile-button');

      let row=card.querySelector('.supplier-card-buttons');
      const profileButton=profile||featuredActions?.querySelector('a:not(.ws-supplier-chat)');
      if(!row&&profileButton){row=document.createElement('div');row.className='supplier-card-buttons';profileButton.before(row);row.append(profileButton);}
      if(row)row.append(link);else continue;
    }

    link.dataset.vendorId = vendor.vendor_id;
    const profile=card.querySelector('.supplier-profile-button')||card.querySelector('.featured-supplier-actions a:not(.ws-supplier-chat)')||card.querySelector('.supplier-card-buttons a:not(.ws-supplier-chat)');
    if(profile&&!profile.dataset.originalProfile)profile.dataset.originalProfile=profile.href;
    const signup=new URL(siteUrl('signup/'));signup.searchParams.set('experience','couple');
    const chatSignup=new URL(signup);chatSignup.searchParams.set('returnTo',target.pathname+target.search);
    link.href=accountOwner?target.href:chatSignup.href;
    if(profile){if(accountOwner)profile.href=profile.dataset.originalProfile;else{const profileSignup=new URL(signup),destination=new URL(profile.dataset.originalProfile);if(destination.origin===new URL(siteUrl()).origin)profileSignup.searchParams.set('returnTo',destination.pathname+destination.search);profile.href=profileSignup.href;}}
    link.setAttribute('aria-label','Start a chat with ' + name);
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
    '.featured-supplier-actions a.ws-supplier-chat{margin:0;color:white;background:#213e34}' +
    '.supplier-listing-content,.featured-supplier-content{min-width:0}.supplier-card-price-block{position:absolute!important;top:30px!important;right:30px!important;align-items:flex-end!important;text-align:right!important}.supplier-card-buttons a.supplier-profile-button{position:static!important;inset:auto!important;grid-column:auto!important;grid-row:auto!important;flex:auto!important;width:100%!important;height:auto!important;margin:0!important}.supplier-card-buttons{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;margin:0;grid-column:1/-1}.supplier-listing-content>.supplier-card-buttons{grid-row:6;align-self:end}.featured-supplier-actions .supplier-card-buttons{width:100%;margin:0}' +
    '.supplier-card-buttons a,.supplier-card-buttons a.ws-supplier-chat,.supplier-card-buttons a.supplier-profile-button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:0;min-height:53px;padding:12px 15px;border-radius:8px;background:#213e34;color:white;text-decoration:none;font:600 14px/1.4 Arial,sans-serif;box-sizing:border-box}' +
    '.supplier-card-buttons a.supplier-profile-button{background:white;border:1px solid #213e34;color:#213e34}' +
    '@media(max-width:700px){.supplier-card-price-block{position:static!important;margin-top:12px}.supplier-listing-content>.supplier-card-buttons,.featured-supplier-actions .supplier-card-buttons{margin-top:20px}.supplier-card-buttons{gap:8px}.supplier-card-buttons a,.supplier-card-buttons a.ws-supplier-chat{font-size:12px;padding:11px 7px}}';
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
