import { supabase } from './supabase-client.js';
import {
  verifiedUser, loadAccount, siteUrl, safeReturnPath,
  onSessionChange, logout
} from './auth.js';
import { openLoginDialog, accountHome } from './login-ui.js';

const header = document.querySelector('.site-header');

if (header) {
  const controls = [...header.querySelectorAll(
    '.header-action, .mobile-account-actions button'
  )].filter(button => /^(log in|sign up)$/i.test(button.textContent.trim()));

  const announcement = document.createElement('p');
  announcement.className = 'auth-header-status';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.hidden = true;
  header.after(announcement);

  let user = null;
  let busy = false;
  let revision = 0;

  function announce(message) {
    announcement.textContent = message;
    announcement.hidden = !message;
  }

  let labelUserId = null;
  let accountLabel = 'Dashboard';
  let labelRevision = 0;

  function render(nextUser) {
    user = nextUser?.email_confirmed_at ? nextUser : null;

    if (!user) {
      labelUserId = null;
      accountLabel = 'Dashboard';
      labelRevision++;
    } else if (labelUserId !== user.id) {
      labelUserId = user.id;
      accountLabel = 'Dashboard';
      const owner = user.id;
      const version = ++labelRevision;

      // Database work runs outside the auth callback.
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', owner);

          if (version !== labelRevision || user?.id !== owner) return;

          accountLabel = !error && data?.some(row => row.role === 'couple')
            ? 'Your Wedding'
            : !error && data?.some(row => row.role === 'supplier')
              ? 'Supplier Dashboard'
              : 'Dashboard';

          render(user);
        } catch {
          // Keep the neutral dashboard link available.
        }
      }, 0);
    }

    controls.forEach(button => {
      const primary = button.dataset.authControl === 'login';
      button.textContent = user
        ? primary ? accountLabel : 'Log Out'
        : primary ? 'Log In' : 'Sign Up';
      button.disabled = busy;
    });
  }

  controls.forEach(button => {
    button.dataset.authControl =
      /^log in$/i.test(button.textContent.trim()) ? 'login' : 'signup';

    button.addEventListener('click', async () => {
      if (busy) return;
      announce('');

      const primary = button.dataset.authControl === 'login';
      const returnTo = safeReturnPath(
        location.pathname + location.search + location.hash
      );

      if (!user) {
        if (!primary) {
          const signup = new URL(siteUrl('signup/'));
          if (returnTo) signup.searchParams.set('returnTo', returnTo);
          location.assign(signup.href);
          return;
        }

        if (matchMedia('(min-width: 1051px)').matches) {
          openLoginDialog(button, returnTo);
        } else {
          const login = new URL(siteUrl('login/'));
          if (returnTo) login.searchParams.set('returnTo', returnTo);
          location.assign(login.href);
        }

        return;
      }

      busy = true;
      const previousUser = user;
      render(primary ? user : null);

      try {
        if (primary) {
          const checkedUser = await verifiedUser();

          if (!checkedUser) {
            location.assign(siteUrl('login/'));
            return;
          }

          const account = await loadAccount(checkedUser);
          location.assign(accountHome(account));
        } else {
          await logout();
        }
      } catch {
        announce(primary
          ? 'We couldn’t open your account. Please try again.'
          : 'We couldn’t log you out. Please try again.'
        );
        render(previousUser);
      } finally {
        busy = false;
        render(user);
      }
    });
  });

  onSessionChange(({ user: nextUser }) => {
    revision++;
    render(nextUser);
  });

  const initialRevision = revision;

  verifiedUser().then(nextUser => {
    if (revision === initialRevision) render(nextUser);
  }).catch(() => {
    if (revision === initialRevision) render(null);
  });

  // Mobile navigation on account pages.
  // Existing public pages retain their own menu handlers.
  if (document.body.classList.contains('auth-page') &&
      !document.querySelector('#signup-form')) {
    const toggle = header.querySelector('.mobile-menu-toggle');
    const menu = header.querySelector('.mobile-nav-panel');

    function closeMenu() {
      if (!toggle || !menu) return;
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    }

    toggle?.addEventListener('click', () => {
      if (!menu) return;
      const opening = menu.hidden;
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.setAttribute(
        'aria-label', opening ? 'Close navigation' : 'Open navigation'
      );
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu && !menu.hidden) {
        closeMenu();
        toggle.focus();
      }
    });

    document.addEventListener('click', event => {
      if (!menu?.contains(event.target) && !toggle?.contains(event.target)) {
        closeMenu();
      }
    });
  }
}

// Shared popup close crosses
{
  const style = document.createElement('style');
  style.textContent = `
    dialog.ws-cross-dialog {
      padding-top:52px!important;
    }
    dialog .ws-popup-cross {
      position:absolute!important;
      top:8px!important;
      right:8px!important;
      bottom:auto!important;
      left:auto!important;
      display:grid!important;
      place-items:center!important;
      width:44px!important;
      height:44px!important;
      min-width:44px!important;
      min-height:44px!important;
      padding:0!important;
      margin:0!important;
      border:0!important;
      border-radius:50%!important;
      background:transparent!important;
      color:#214c3e!important;
      box-shadow:none!important;
      font:normal 30px/1 Arial,sans-serif!important;
      cursor:pointer;
      z-index:2;
    }
    dialog .ws-popup-cross:hover {
      background:#f1efeb!important;
    }
    dialog .ws-popup-cross:focus-visible {
      outline:3px solid #ad7542!important;
      outline-offset:2px;
    }
    dialog .ws-popup-cross:disabled {
      opacity:.4;
      cursor:wait;
    }
  `;
  document.head.append(style);

  function updatePopupCloseButtons() {
    for (const modal of document.querySelectorAll('dialog')) {
      const existing = modal.querySelector('.ws-popup-cross');
      if (existing) continue;

      const buttons = [...modal.querySelectorAll('button')]
        .filter(button => button.closest('dialog') === modal);
      const close = buttons.find(button =>
        /^close$/i.test(button.textContent.trim())
      ) || buttons.find(button =>
        /^close\b/i.test(button.getAttribute('aria-label') || '')
      ) || buttons.find(button =>
        /^cancel$/i.test(button.textContent.trim())
      );

      if (!close) continue;
      modal.classList.add('ws-cross-dialog');
      close.classList.add('ws-popup-cross');
      close.setAttribute('aria-label','Close dialog');
      close.title = 'Close';
      close.textContent = '×';
    }
  }

  updatePopupCloseButtons();
  new MutationObserver(updatePopupCloseButtons).observe(document.body,{
    childList:true,
    subtree:true
  });
}

// Shared delete bin icons
(() => {
  const icon=`<svg aria-hidden="true" focusable="false" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>
  </svg>`;
  const style=document.createElement('style');
  style.textContent=`
    button.ws-delete-bin,a.ws-delete-bin{
      display:inline-flex!important;align-items:center;justify-content:center;
      width:44px!important;min-width:44px!important;height:44px!important;
      padding:0!important
    }
    .ws-delete-bin:focus-visible{outline:3px solid #ad7542;outline-offset:2px}
    .ws-delete-bin svg{pointer-events:none}
  `;
  document.head.append(style);
  function update(){
    for(const button of document.querySelectorAll('button,a[role="button"]')){
      const text=button.textContent.trim();
      if(/^Delete$/i.test(text)){
        const label=button.getAttribute('aria-label')||'Delete';
        button.dataset.wsDeleteLabel=label;
        button.setAttribute('aria-label',label);
        button.title=label;
        button.classList.add('ws-delete-bin');
        button.innerHTML=icon;
      }else if(button.classList.contains('ws-delete-bin')&&text){
        // Preserve visible confirmation and progress messages.
        button.classList.remove('ws-delete-bin');
        const label=/^Confirm delete$/i.test(text)
          ?'Confirm: '+(button.dataset.wsDeleteLabel||'Delete')
          :text;
        button.setAttribute('aria-label',label);
        button.title=label;
      }
    }
  }
  update();
  new MutationObserver(update).observe(document.body,{
    childList:true,subtree:true,characterData:true
  });
})();

// Borderless edit and delete icons
(() => {
  const style=document.createElement('style');
  style.textContent=`
    button.ws-delete-bin,a.ws-delete-bin,
    .ws-dashboard-shell button.ws-edit-icon,
    .ws-dashboard-shell a.ws-edit-icon{
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      color:#214c3e!important;
    }
    button.ws-delete-bin:hover,a.ws-delete-bin:hover,
    .ws-dashboard-shell .ws-edit-icon:hover{
      color:#98632f!important;
      background:transparent!important;
    }
    button.ws-delete-bin:focus-visible,a.ws-delete-bin:focus-visible,
    .ws-dashboard-shell .ws-edit-icon:focus-visible{
      outline:2px solid #ad7542!important;
      outline-offset:2px!important;
    }
  `;
  document.head.append(style);
})();