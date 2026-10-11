import { supabase } from './supabase-client.js';
import { siteUrl, safeReturnPath } from './auth.js';

const form = document.querySelector('#resend-form');
const email = document.querySelector('#verification-email');
const button = document.querySelector('#resend-button');
const status = document.querySelector('#verification-status');
const different = document.querySelector('#different-email');

const returnTo = safeReturnPath(
  new URLSearchParams(location.search).get('returnTo')
);

const callback = new URL(siteUrl('auth/callback/'));
const signup = new URL(siteUrl('signup/'));

if (returnTo) {
  callback.searchParams.set('returnTo', returnTo);
  signup.searchParams.set('returnTo', returnTo);
}

different.href = signup.href;

let nextSendAt = 0;
let sending = false;

try {
  email.value = sessionStorage.getItem('wedsparks.verificationEmail') || '';
  nextSendAt = Number(
    sessionStorage.getItem('wedsparks.verificationCooldown')
  ) || 0;
} catch {}

if (email.value) {
  document.querySelector('#verification-copy').textContent =
    `Check ${email.value} for your verification link.`;
}

function updateButton() {
  const seconds = Math.max(0, Math.ceil((nextSendAt - Date.now()) / 1000));

  button.disabled = sending || seconds > 0;
  button.textContent = sending
    ? 'Sending…'
    : seconds > 0
      ? `Resend in ${seconds}s`
      : 'Resend email';
}

updateButton();
const timer = setInterval(updateButton, 1000);
window.addEventListener('pagehide', () => clearInterval(timer));

different.addEventListener('click', () => {
  try {
    sessionStorage.removeItem('wedsparks.verificationEmail');
  } catch {}
});

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (sending || Date.now() < nextSendAt || !form.reportValidity()) return;

  sending = true;
  status.textContent = '';
  updateButton();

  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.value.trim(),
      options: { emailRedirectTo: callback.href }
    });

    if (error) {
      status.textContent =
        'We couldn’t resend the email. Please wait a few minutes and try again.';
      return;
    }

    status.textContent =
      'If this email address is awaiting verification, a new link is on its way.';

    nextSendAt = Date.now() + 60000;

    try {
      sessionStorage.setItem(
        'wedsparks.verificationEmail', email.value.trim()
      );
      sessionStorage.setItem(
        'wedsparks.verificationCooldown', String(nextSendAt)
      );
    } catch {}
  } catch {
    status.textContent =
      'We couldn’t connect. Check your connection and try again.';
  } finally {
    sending = false;
    updateButton();
  }
});
