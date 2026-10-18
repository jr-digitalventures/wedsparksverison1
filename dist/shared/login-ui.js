import { supabase } from './supabase-client.js';
import { siteUrl, safeReturnPath, verifiedUser, loadAccount, accountDestination } from './auth.js';

export function accountHome(account) {
  return siteUrl(
    account.profile.initial_experience === 'couple'
      ? 'dashboard/'
      : 'supplier-account/'
  );
}

export async function loginDestination(returnTo) {
  const user = await verifiedUser();
  if (!user) throw new Error('Please log in to continue.');

  const account = await loadAccount(user);
  const safeReturn = safeReturnPath(returnTo);
  const destination = new URL(accountDestination(account));

  if ((destination.pathname.endsWith('/onboarding/') || destination.pathname.endsWith('/supplier-onboarding/'))) {
    if (safeReturn) destination.searchParams.set('returnTo', safeReturn);
    return destination.href;
  }

  return safeReturn || destination.href;
}

export function createLoginForm({ modal = false, returnTo = null } = {}) {
  const container = document.createElement('section');
  const heading = modal ? 'h2' : 'h1';
  const id = modal ? 'modal-login' : 'page-login';

  container.innerHTML = `
    <p class="auth-eyebrow">WedSparks</p>
    <${heading} class="auth-login-heading" id="${id}-heading">
      Welcome back
    </${heading}>
    <p class="auth-intro">
      Continue planning your wedding or managing your business.
    </p>

    <form>
      <label class="auth-field" for="${id}-email">
        Email address
        <input id="${id}-email" name="email" type="email"
          autocomplete="username" maxlength="254" required>
      </label>

      <div class="auth-field">
        <label for="${id}-password">Password</label>
        <div class="auth-password">
          <input id="${id}-password" name="password" type="password"
            autocomplete="current-password" required>
          <button type="button" data-show-password
            aria-controls="${id}-password"
            aria-label="Show password" aria-pressed="false">
            Show
          </button>
        </div>
      </div>

      <p class="auth-login-footer" style="margin:0 0 20px">
  <a data-forgot-password href="${siteUrl('forgot-password/')}">
    Forgot password?
  </a>
</p>
<p class="auth-status" role="status" aria-live="polite"></p>
      <button class="auth-primary" type="submit">Log in</button>
    </form>

    <p class="auth-login-footer">
      New to WedSparks? <a data-signup>Create an account</a>
    </p>
  `;

  const form = container.querySelector('form');
  const email = form.elements.email;
  const password = form.elements.password;
  const toggle = container.querySelector('[data-show-password]');
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('[role="status"]');

  const signup = new URL(siteUrl('signup/'));
  const safeReturn = safeReturnPath(returnTo);
  if (safeReturn) signup.searchParams.set('returnTo', safeReturn);
  container.querySelector('[data-signup]').href = signup.href;

  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    toggle.setAttribute('aria-pressed', String(show));
  });

  let busy = false;

  form.addEventListener('input', () => {
    status.textContent = '';
    email.removeAttribute('aria-invalid');
    password.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;

    busy = true;
    button.disabled = true;
    button.textContent = 'Logging in…';
    status.textContent = '';

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });

      if (error) {
        if (error.code === 'email_not_confirmed') {
          status.textContent = 'Please verify your email before logging in. ';

          const link = document.createElement('a');
          link.href = siteUrl('verify-email/');
          link.textContent = 'Resend verification email';

          if (safeReturn) {
            const url = new URL(link.href);
            url.searchParams.set('returnTo', safeReturn);
            link.href = url.href;
          }

          try {
            sessionStorage.setItem(
              'wedsparks.verificationEmail', email.value.trim()
            );
          } catch {}

          status.append(link);
        } else if (error.code === 'invalid_credentials') {
          status.textContent = 'Your email or password is incorrect.';
          email.setAttribute('aria-invalid', 'true');
          password.setAttribute('aria-invalid', 'true');
        } else if (error.status === 429) {
          status.textContent = 'Please wait a few minutes before trying again.';
        } else {
          status.textContent = 'We couldn’t log you in. Please try again.';
        }

        return;
      }

      location.assign(await loginDestination(safeReturn));
    } catch {
      status.textContent =
        'We couldn’t finish logging you in. Check your connection and try again.';
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = 'Log in';
    }
  });

  return container;
}

export function openLoginDialog(trigger, returnTo) {
  const dialog = document.createElement('dialog');
  dialog.className = 'auth-dialog';
  dialog.setAttribute('aria-labelledby', 'modal-login-heading');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'auth-dialog-close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close login');

  const form = createLoginForm({ modal: true, returnTo });
  dialog.append(close, form);
  document.body.append(dialog);

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  close.addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;

    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    ) dialog.close();
  });

  const desktop = matchMedia('(min-width: 1051px)');

  function handleResize() {
    if (desktop.matches || !dialog.open) return;

    dialog.close();
    const login = new URL(siteUrl('login/'));
    const safeReturn = safeReturnPath(returnTo);
    if (safeReturn) login.searchParams.set('returnTo', safeReturn);
    location.assign(login.href);
  }

  desktop.addEventListener('change', handleResize);

  dialog.addEventListener('close', () => {
    desktop.removeEventListener('change', handleResize);
    document.body.style.overflow = previousOverflow;
    dialog.remove();
    if (trigger?.isConnected) trigger.focus();
  }, { once: true });

  // Native modal dialog provides focus containment and Escape handling.
  dialog.showModal();
  form.querySelector('[name="email"]').focus();
}


