import { supabase } from './supabase-client.js';
import { siteUrl } from './auth.js';

const heading = document.querySelector('h1');
const intro = document.querySelector('#reset-intro');
const form = document.querySelector('#reset-form');
const password = form.elements.password;
const toggle = document.querySelector('#show-new-password');
const button = form.querySelector('[type="submit"]');
const status = document.querySelector('#reset-status');
const action = document.querySelector('#reset-action');

const storageKey = 'wedsparks.passwordRecovery';

let permit = null;
let busy = false;
let finished = false;

async function fingerprint(token) {
  const digest = await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function clearPermit() {
  permit = null;
  try { sessionStorage.removeItem(storageKey); } catch {}
}

function invalidLink() {
  clearPermit();
  form.hidden = true;
  heading.textContent = 'This reset link is unavailable';
  intro.textContent =
    'The link may have expired or already been used. Request a new link to continue.';
  status.textContent = '';
  action.href = siteUrl('forgot-password/');
  action.textContent = 'Request a new reset link';
  action.hidden = false;
}

async function validRecoverySession() {
  if (!permit || permit.expiresAt <= Date.now()) return false;

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) return false;

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || userData.user?.id !== permit.userId) return false;

  return await fingerprint(sessionData.session.access_token) ===
    permit.fingerprint;
}

async function start() {
  try {
    const incoming = await window.wedsparksRecoveryLink;
    delete window.wedsparksRecoveryLink;

    const { data, error } = await supabase.auth.getSession();

    // Remove credentials and callback errors from the address bar.
    history.replaceState(null, '', location.pathname);

    if (error || incoming?.error) {
      invalidLink();
      return;
    }

    if (incoming?.recovery && incoming.fingerprint && data.session) {
      const currentFingerprint = await fingerprint(
        data.session.access_token
      );

      if (currentFingerprint !== incoming.fingerprint) {
        invalidLink();
        return;
      }

      permit = {
        userId: data.session.user.id,
        fingerprint: currentFingerprint,
        expiresAt: Date.now() + 15 * 60 * 1000
      };
    } else {
      try {
        permit = JSON.parse(sessionStorage.getItem(storageKey));
      } catch {
        permit = null;
      }
    }

    if (!await validRecoverySession()) {
      invalidLink();
      return;
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(permit));
    } catch {}

    intro.textContent = 'Choose a new password for your WedSparks account.';
    form.hidden = false;
  } catch {
    invalidLink();
  }
}

toggle.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  toggle.textContent = show ? 'Hide' : 'Show';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT' && !finished) invalidLink();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;

  if (password.value.length < 10) {
    status.textContent = 'Use a password with at least 10 characters.';
    return;
  }

  busy = true;
  button.disabled = true;
  button.textContent = 'Saving…';
  status.textContent = '';

  try {
    if (!await validRecoverySession()) {
      invalidLink();
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password.value
    });

    if (error) {
      if (error.code === 'same_password') {
        status.textContent = 'Choose a password different from your current one.';
      } else if (error.code === 'weak_password') {
        status.textContent = 'Please choose a stronger password.';
      } else if (error.status === 401 || error.status === 403) {
        invalidLink();
      } else {
        status.textContent = 'We couldn’t save your password. Please try again.';
      }
      return;
    }

    finished = true;
    clearPermit();
    password.value = '';
    form.hidden = true;

    heading.textContent = 'Your password has been updated';
    intro.textContent = 'You can now log in with your new password.';

    const { error: logoutError } = await supabase.auth.signOut({
      scope: 'local'
    });

    if (logoutError) {
      status.textContent =
        'Your password was saved, but we couldn’t log this browser out. Use Log Out before signing in again.';
    }

    action.href = siteUrl('login/');
    action.textContent = 'Go to login';
    action.hidden = false;
  } catch {
    if (finished) {
      status.textContent =
        'Your password was saved. Use Log Out before signing in again.';
      action.href = siteUrl('login/');
      action.textContent = 'Go to login';
      action.hidden = false;
    } else {
      status.textContent =
        'We couldn’t connect. Check your connection and try again.';
    }
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = 'Save new password';
  }
});

start();
