import {refreshOverviewMessages} from './overview-messages.js';
import {refreshOverviewBudget} from './overview-budget.js';
import { refreshOverviewGuests } from './overview-guests.js';
import { refreshOverviewTasks } from './overview-tasks.js';
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
      siteUrl('wedding-suppliers/');

    if (!supplierPage) {
      renderWeddingOverview(account);
      void refreshOverviewMessages(user.id);
      void refreshOverviewTasks(user.id);
      void refreshOverviewGuests(user.id);
      void refreshOverviewBudget(user.id);
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


export { start as refreshDashboardPage };

function renderWeddingOverview(account) {
  const root = document.querySelector('#private-content');
  if (!root) return;

  root.querySelectorAll('[data-overview-link]').forEach(link => {
    link.href = siteUrl(link.dataset.overviewLink);
  });

  const wedding = account.couple || {};
  renderOverviewHighlights(wedding);
  root.querySelectorAll('[data-wedding-value]').forEach(element => {
    const key = element.dataset.weddingValue;
    const status = wedding[`${key}_status`];
    const value = wedding[key];
    let text = status === 'unknown' ? 'Not decided yet' : 'Add your details';

    if (status === 'provided' && value !== null &&
        value !== undefined && String(value).trim() !== '') {
      text = String(value);
      if (key === 'wedding_date') {
        const date = new Date(`${value}T12:00:00`);
        if (!Number.isNaN(date.getTime())) {
          text = date.toLocaleDateString('en-AU', {
            day:'numeric', month:'short', year:'numeric'
          });
        }
      } else if (key === 'wedding_budget') {
        const amount = Number(value);
        if (Number.isFinite(amount)) {
          text = amount.toLocaleString('en-AU', {
            style:'currency', currency:'AUD', maximumFractionDigits:0
          });
        }
      } else if (key === 'guest_count') {
        text = `${Number(value).toLocaleString('en-AU')} guests`;
      }
    }
    element.textContent = text;
  });
}
function renderOverviewHighlights(wedding) {
  const countdown = document.getElementById('wo-countdown');
  if (countdown) {
    countdown.textContent = 'Your day awaits';
    if (wedding.wedding_date_status === 'provided' && wedding.wedding_date) {
      const parts = String(wedding.wedding_date).split('-').map(Number);
      const target = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const days = Math.round((target - today) / 86400000);
      if (Number.isFinite(days)) {
        countdown.textContent = days > 0
          ? `${days.toLocaleString('en-AU')} ${days === 1 ? 'day' : 'days'} to go`
          : days === 0 ? 'Today is your day!' : 'Your wedding day, remembered';
      }
    }
  }

  const potential = document.getElementById('wo-potential');
  const note = document.getElementById('wo-estimate-note');
  if (!potential || !note) return;

  const budget = Number(wedding.wedding_budget);
  const hasBudget = wedding.wedding_budget_status === 'provided' &&
    wedding.wedding_budget !== null && wedding.wedding_budget !== undefined &&
    String(wedding.wedding_budget).trim() !== '' &&
    Number.isFinite(budget) && budget >= 0;

  if (!hasBudget) potential.textContent = 'Add your budget';
  if (!hasBudget) note.textContent = 'Set your budget in Profile & settings to see an illustration.';
  if (hasBudget) {
    const illustration = Math.floor(budget / 10000) * 1000;
    potential.textContent = illustration.toLocaleString('en-AU', {
      style:'currency', currency:'AUD', maximumFractionDigits:0
    });
    note.textContent =
      'Illustration if your entire budget qualifies through WedSparks: ' +
      '$1,000 per complete $10,000 milestone. Final eligibility and redemption rules apply; ' +
      'this is not an earned balance.';
  }
}