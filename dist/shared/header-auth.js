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

  function render(nextUser) {
    user = nextUser?.email_confirmed_at ? nextUser : null;

    controls.forEach(button => {
      const primary = button.dataset.authControl === 'login';
      button.textContent = user
        ? primary ? 'My account' : 'Log Out'
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
