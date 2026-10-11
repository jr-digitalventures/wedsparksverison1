import { supabase } from '../shared/supabase-client.js';
import { siteUrl, safeReturnPath } from '../shared/auth.js';

const form = document.querySelector('#signup-form');
const button = document.querySelector('#signup-submit');
const status = document.querySelector('#signup-status');

const returnTo = safeReturnPath(
  new URLSearchParams(location.search).get('returnTo')
);

const callback = new URL(siteUrl('auth/callback/'));
if (returnTo) callback.searchParams.set('returnTo', returnTo);

button.disabled = false;
let submitting = false;

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !form.reportValidity()) return;

  const fields = new FormData(form);
  const firstName = String(fields.get('first_name')).trim();
  const lastName = String(fields.get('last_name')).trim();
  const email = String(fields.get('email')).trim();
  const password = String(fields.get('password'));
  const experience = String(fields.get('initial_experience'));

  status.textContent = '';

  if (!firstName || !lastName) {
    status.textContent = 'Please enter your first and last name.';
    return;
  }

  if (password.length < 8) {
    status.textContent = 'Use a password with at least 8 characters.';
    return;
  }

  submitting = true;
  button.disabled = true;
  button.textContent = 'Creating account…';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callback.href,
        data: {
          first_name: firstName,
          last_name: lastName,
          initial_experience: experience
        }
      }
    });

    if (error) {
      status.textContent = error.code === 'over_email_send_rate_limit' ||
        error.status === 429
        ? 'Please wait a few minutes before trying again.'
        : 'We couldn’t create your account. Please try again.';
      return;
    }

    // Confirmation must be enabled in Supabase.
    if (data.session) {
      await supabase.auth.signOut({ scope: 'local' });
      status.textContent =
        'Registration is temporarily unavailable. Please try again later.';
      return;
    }

    try {
      sessionStorage.setItem('wedsparks.verificationEmail', email);
      sessionStorage.setItem(
        'wedsparks.verificationCooldown',
        String(Date.now() + 60000)
      );
    } catch {}

    const verification = new URL(siteUrl('verify-email/'));
    if (returnTo) verification.searchParams.set('returnTo', returnTo);
    location.assign(verification.href);
  } catch {
    status.textContent =
      'We couldn’t connect. Check your connection and try again.';
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = 'Create my account';
  }
});
