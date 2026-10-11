import { supabase } from './supabase-client.js';
import { siteUrl } from './auth.js';

const form = document.querySelector('#forgot-form');
const button = form.querySelector('[type="submit"]');
const status = document.querySelector('#forgot-status');

let busy = false;

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;

  busy = true;
  button.disabled = true;
  button.textContent = 'Sending…';
  status.textContent = '';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      form.elements.email.value.trim(),
      { redirectTo: siteUrl('reset-password/') }
    );

    if (error) {
      status.textContent = error.status === 429
        ? 'Please wait a few minutes before trying again.'
        : 'We couldn’t send the request. Please try again.';
      return;
    }

    form.hidden = true;
    status.textContent =
      'If an account exists for that email address, we’ve sent password reset instructions.';
  } catch {
    status.textContent =
      'We couldn’t connect. Check your connection and try again.';
  } finally {
    busy = false;
    button.disabled = false;
    button.textContent = 'Send reset link';
  }
});
