import { supabase } from './supabase-client.js';
import { verifiedUser, loadAccount, siteUrl, safeReturnPath, accountDestination } from './auth.js';

const heading = document.querySelector('h1');
const status = document.querySelector('#callback-status');
const action = document.querySelector('#callback-action');
const retry = document.querySelector('#callback-retry');

const query = new URLSearchParams(location.search);
const fragment = new URLSearchParams(location.hash.slice(1));
const returnTo = safeReturnPath(query.get('returnTo'));
const linkError = query.has('error') || fragment.has('error');

let busy = false;

async function finishVerification() {
  if (busy) return;
  busy = true;
  retry.hidden = true;
  action.hidden = true;

  try {
    // Wait for the SDK to finish processing the email-return session.
    const { error } = await supabase.auth.getSession();

    // Remove callback credentials/errors from the address bar.
    const cleanUrl = new URL(location.href);
    cleanUrl.hash = '';
    cleanUrl.search = '';
    if (returnTo) cleanUrl.searchParams.set('returnTo', returnTo);
    history.replaceState(null, '', cleanUrl);

    if (error || linkError) {
      showInvalidLink();
      return;
    }

    const user = await verifiedUser();

    if (!user) {
      showInvalidLink();
      return;
    }

    heading.textContent = 'Preparing your account';
    status.textContent = 'Your email is verified. Please wait a moment.';

    const account = await loadAccount(user);
    const destination = new URL(accountDestination(account));

    if ((destination.pathname.endsWith('/onboarding/') || destination.pathname.endsWith('/supplier-onboarding/'))) {
      if (returnTo) destination.searchParams.set('returnTo', returnTo);
      location.replace(destination.href);
      return;
    }

    location.replace(returnTo || destination.href);
    return;

    heading.textContent = 'Email verified';
    status.textContent = 'Your WedSparks account is ready.';
    action.textContent = returnTo
      ? 'Continue exploring'
      : 'Explore wedding suppliers';

    action.href = returnTo || siteUrl('wedding-suppliers/');
    action.hidden = false;

    try {
      sessionStorage.removeItem('wedsparks.verificationEmail');
      sessionStorage.removeItem('wedsparks.verificationCooldown');
    } catch {}
  } catch {
    heading.textContent = 'We couldn’t finish setting up your account';
    status.textContent = 'Please check your connection and try again.';
    retry.hidden = false;
  } finally {
    busy = false;
  }
}

function showInvalidLink() {
  heading.textContent = 'This verification link is unavailable';
  status.textContent =
    'The link may have expired or already been used. Request a new email to continue.';

  const verification = new URL(siteUrl('verify-email/'));
  if (returnTo) verification.searchParams.set('returnTo', returnTo);

  action.href = verification.href;
  action.textContent = 'Request a new verification email';
  action.hidden = false;
}

retry.addEventListener('click', finishVerification);
finishVerification();

