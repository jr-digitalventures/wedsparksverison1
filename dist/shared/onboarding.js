import { supabase } from './supabase-client.js';
import {
  requireUser, loadAccount, siteUrl, safeReturnPath,
  profileCompletion, onSessionChange
} from './auth.js';
import { fallbackLocations } from './location-data.js';

const loading = document.querySelector('#onboarding-loading');
const layout = document.querySelector('#onboarding-layout');
const content = document.querySelector('#onboarding-content');
const stepsList = document.querySelector('#onboarding-steps');

const returnTo = safeReturnPath(
  new URLSearchParams(location.search).get('returnTo')
);

const questions = [
  {
    key: 'wedding_date',
    label: 'Wedding date',
    title: 'When’s the big day?',
    copy: 'We’ll use your wedding date to personalise your planning timeline. You can change this later.',
    provided: 'We’ve set a date',
    unknown: 'We haven’t decided yet',
    input: `<label class="auth-field" for="wedding-answer">
      Wedding date
      <input id="wedding-answer" type="date">
    </label>`
  },
  {
    key: 'wedding_location',
    label: 'Wedding location',
    title: 'Where are you thinking of getting married?',
    copy: 'This helps us show you more relevant suppliers.',
    provided: 'We have a location in mind',
    unknown: 'We haven’t decided yet',
    input: `<label class="auth-field" for="wedding-answer">
      Suburb, city or region
      <input id="wedding-answer" type="text" maxlength="200"
        list="wedding-locations" autocomplete="off"
        placeholder="Start typing a location">
      <datalist id="wedding-locations"></datalist>
    </label>`
  },
  {
    key: 'wedding_budget',
    label: 'Wedding budget',
    title: 'Do you have a wedding budget in mind?',
    copy: 'An estimate is completely fine.',
    provided: 'We have an estimate',
    unknown: 'Not sure yet',
    input: `<label class="auth-field" for="wedding-answer">
      Estimated budget in AUD
      <span class="onboarding-currency">
        <span aria-hidden="true">$</span>
        <input id="wedding-answer" type="text" inputmode="decimal"
          placeholder="45,000" maxlength="24">
      </span>
    </label>`
  },
  {
    key: 'guest_count',
    label: 'Guest estimate',
    title: 'Roughly how many guests are you expecting?',
    copy: 'An estimate is completely fine. You can change this later.',
    provided: 'We have an estimate',
    unknown: 'Not sure yet',
    input: `<label class="auth-field" for="wedding-answer">
      Estimated guests
      <input id="wedding-answer" type="text" inputmode="numeric"
        placeholder="100" maxlength="5">
    </label>`
  }
];

let account;
let step = 1;
let saving = false;
let revoked = false;
let suggestions = [...fallbackLocations];
const drafts = new Map();

onSessionChange(({ user }) => {
  if (!user) {
    revoked = true;
    layout.hidden = true;
    loading.hidden = false;
    loading.textContent = 'Please log in to continue.';
  }
});

function renderSteps() {
  stepsList.replaceChildren();

  questions.forEach((question, index) => {
    const item = document.createElement('li');
    const answered = ['provided', 'unknown'].includes(
      account.couple[`${question.key}_status`]
    );

    item.textContent = `${answered ? '✓' : index + 1}  ${question.label}`;

    if (index + 1 === step) item.setAttribute('aria-current', 'step');
    stepsList.append(item);
  });
}

function populateLocations() {
  const list = document.querySelector('#wedding-locations');
  if (!list) return;

  list.replaceChildren();

  [...new Set(suggestions)]
    .filter(value => typeof value === 'string' &&
      value.trim() && value !== 'Anywhere')
    .forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      list.append(option);
    });
}

function rememberDraft() {
  const input = document.querySelector('#wedding-answer');
  const choice = content.querySelector('[name="answer-status"]:checked');

  drafts.set(step, {
    status: choice?.value || 'unanswered',
    value: input?.value || ''
  });
}

function render() {
  if (revoked) return;
  renderSteps();

  if (step === 5) {
    const destination = returnTo || siteUrl('dashboard/');

    content.innerHTML = `
      <p class="onboarding-progress">Your wedding details</p>
      <h1 tabindex="-1">You’re ready to start planning</h1>
      <p class="auth-intro">
        Your answers are saved. You can update your wedding details later.
      </p>
      <a class="auth-primary onboarding-complete-link" id="finish-onboarding">
      </a>
      <p class="auth-login-footer">
        <a id="explore-after-onboarding">Explore wedding suppliers</a>
      </p>
    `;

    const finish = document.querySelector('#finish-onboarding');
    finish.href = destination;
    finish.textContent = returnTo
      ? 'Continue where you left off'
      : 'Go to my dashboard';

    document.querySelector('#explore-after-onboarding').href =
      siteUrl('wedding-suppliers/');

    content.querySelector('h1').focus();
    return;
  }

  const question = questions[step - 1];
  const storedStatus = account.couple[`${question.key}_status`];
  const draft = drafts.get(step) || {
    status: storedStatus,
    value: account.couple[question.key] ?? ''
  };

  content.innerHTML = `
    <p class="onboarding-progress">Step ${step} of 4</p>
    <h1 tabindex="-1"></h1>
    <p class="auth-intro" id="question-copy"></p>

    <form id="onboarding-form">
      <fieldset class="onboarding-options">
        <legend class="sr-only">Choose your answer</legend>

        <label class="auth-choice">
          <input type="radio" name="answer-status"
            value="provided" required>
          <strong id="provided-label"></strong>
        </label>

        <label class="auth-choice">
          <input type="radio" name="answer-status"
            value="unknown" required>
          <strong id="unknown-label"></strong>
        </label>
      </fieldset>

      <div id="answer-field" hidden>${question.input}</div>

      <p class="auth-status" id="onboarding-error"
        role="status" aria-live="polite"></p>

      <div class="onboarding-actions">
        <button class="text-button" id="previous-step"
          type="button" ${step === 1 ? 'hidden' : ''}>Back</button>

        <button class="auth-primary" type="submit">
          ${step === 4 ? 'Finish' : 'Continue'}
        </button>
      </div>

      <button class="text-button onboarding-skip"
        id="skip-step" type="button">Skip for now</button>
    </form>
  `;

  content.querySelector('h1').textContent = question.title;
  document.querySelector('#question-copy').textContent = question.copy;
  document.querySelector('#provided-label').textContent = question.provided;
  document.querySelector('#unknown-label').textContent = question.unknown;

  const form = document.querySelector('#onboarding-form');
  const input = document.querySelector('#wedding-answer');
  input.value = String(draft.value);

  if (['provided', 'unknown'].includes(draft.status)) {
    form.querySelector(
      `[name="answer-status"][value="${draft.status}"]`
    ).checked = true;
  }

  function updateInput() {
    const provided = form.elements['answer-status'].value === 'provided';
    document.querySelector('#answer-field').hidden = !provided;
    input.disabled = !provided;
    input.required = provided;
  }

  updateInput();
  populateLocations();

  form.addEventListener('change', updateInput);

  document.querySelector('#previous-step').addEventListener('click', () => {
    if (saving) return;
    rememberDraft();
    step--;
    render();
  });

  document.querySelector('#skip-step').addEventListener('click', () => {
    if (!saving) saveStep(true);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!saving && form.reportValidity()) saveStep(false);
  });

  content.querySelector('h1').focus();
}

function validatedValue(key, raw) {
  const value = raw.trim();

  if (key === 'wedding_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error('Please enter a valid wedding date.');
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value) {
      throw new Error('Please enter a valid wedding date.');
    }

    return value;
  }

  if (key === 'wedding_location') {
    if (!value || value.length > 200) {
      throw new Error('Enter a suburb, city or region.');
    }

    return value;
  }

  if (key === 'wedding_budget') {
    const amount = value.replace(/^\$\s*/, '');

    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(amount)) {
      throw new Error('Enter an amount such as 45000 or 45,000.50.');
    }

    const clean = amount.replaceAll(',', '');
    const number = Number(clean);

    if (!Number.isFinite(number) || number <= 0 || number > 10000000) {
      throw new Error('Enter a budget greater than $0 and no more than $10,000,000.');
    }

    return clean;
  }

  if (!/^\d+$/.test(value) ||
      Number(value) < 1 || Number(value) > 10000) {
    throw new Error('Enter a whole guest count between 1 and 10,000.');
  }

  return Number(value);
}

async function saveStep(skip) {
  if (saving || revoked) return;

  const question = questions[step - 1];
  const form = document.querySelector('#onboarding-form');
  const error = document.querySelector('#onboarding-error');
  const nextStep = step + 1;
  const changes = { onboarding_step: nextStep };

  error.textContent = '';

  try {
    if (!skip) {
      const status = form.elements['answer-status'].value;

      if (!['provided', 'unknown'].includes(status)) {
        throw new Error('Choose an answer or select Skip for now.');
      }

      changes[`${question.key}_status`] = status;
      changes[question.key] = status === 'unknown'
        ? null
        : validatedValue(
            question.key, document.querySelector('#wedding-answer').value
          );
    }

    // Skipping preserves any previously saved answer.
    // Fresh unanswered questions remain unanswered.
    if (nextStep === 5) {
      const resultingProfile = { ...account.couple, ...changes };

      changes.onboarding_finished_at = new Date().toISOString();
      changes.onboarding_skipped_at = questions.some(
        item => resultingProfile[`${item.key}_status`] === 'unanswered'
      ) ? new Date().toISOString() : null;
    }
  } catch (validationError) {
    error.textContent = validationError.message;
    return;
  }

  saving = true;
  form.querySelectorAll('button').forEach(button => {
    button.disabled = true;
  });

  const submit = form.querySelector('[type="submit"]');
  submit.textContent = 'Saving…';

  try {
    const { data, error: saveError } = await supabase
      .from('couple_profiles')
      .update(changes)
      .eq('user_id', account.user.id)
      .select()
      .single();

    if (saveError) {
      throw new Error('We couldn’t save your answer. Please try again.');
    }

    if (revoked) return;

    account.couple = data;
    drafts.delete(step);
    step = nextStep;
    render();
  } catch {
    error.textContent =
      'We couldn’t save your answer. Check your connection and try again.';
  } finally {
    saving = false;

    if (form.isConnected) {
      form.querySelectorAll('button').forEach(button => {
        button.disabled = false;
      });
      submit.textContent = step === 4 ? 'Finish' : 'Continue';
    }
  }
}

async function start() {
  try {
    const user = await requireUser();
    if (!user) return;
    revoked = false;

    account = await loadAccount(user);

    if (!account.roles.includes('couple') || !account.couple) {
      location.replace(siteUrl('supplier-account/'));
      return;
    }

    const requestedStep = Number(
      new URLSearchParams(location.search).get('step')
    );

    step = Number.isInteger(requestedStep) &&
      requestedStep >= 1 && requestedStep <= 4
      ? requestedStep
      : account.couple.onboarding_step;

    loading.hidden = true;
    layout.hidden = false;
    render();

    // Reuse existing public location data and homepage suggestions.
    supabase.from('Locations')
      .select('Location_name')
      .eq('Is_active', true)
      .then(({ data }) => {
        if (data) {
          suggestions = [
            ...suggestions,
            ...data.map(row => row.Location_name)
          ];
          populateLocations();
        }
      }).catch(() => {});
  } catch {
    loading.textContent =
      'We couldn’t load your wedding details. Refresh the page to try again.';
  }
}

start();
