import {
  requireUser, loadAccount, siteUrl, onSessionChange, profileCompletion
} from './auth.js';

const content = document.querySelector('#private-content');
const status = document.querySelector('#account-status');
const supplierPage = document.body.dataset.account === 'supplier';

onSessionChange(({ user }) => {
  if (!user) {
    content.hidden = true;
    status.textContent = 'Please log in to continue.';
    location.replace(siteUrl('login/'));
  }
});

async function start() {
  try {
    const user = await requireUser();
    if (!user) return;

    const account = await loadAccount(user);
    const requiredRole = supplierPage ? 'supplier' : 'couple';

    if (!account.roles.includes(requiredRole)) {
      location.replace(siteUrl(
        supplierPage ? 'dashboard/' : 'supplier-account/'
      ));
      return;
    }

    document.querySelector('#explore-suppliers').href =
      siteUrl('marketplace-search/');

    if (!supplierPage) {
      const completion = profileCompletion(account);
      const progress = document.querySelector('#profile-completion');
      const completeLink = document.querySelector('#complete-profile');

      if (progress) {
        progress.textContent =
          `Your wedding profile is ${completion.percentage}% complete.`;
      }

      const questionKeys = [
        'wedding_date', 'wedding_location',
        'wedding_budget', 'guest_count'
      ];

      const missing = completion.missing.find(
        item => questionKeys.includes(item.key)
      );

      if (completeLink && missing) {
        const url = new URL(siteUrl('onboarding/'));
        url.searchParams.set(
          'step', String(questionKeys.indexOf(missing.key) + 1)
        );
        completeLink.href = url.href;
        completeLink.hidden = false;
      }
    }

    status.hidden = true;
    content.hidden = false;
  } catch {
    content.hidden = true;
    status.textContent =
      'We couldn’t load your account. Refresh the page to try again.';
  }
}

start();

