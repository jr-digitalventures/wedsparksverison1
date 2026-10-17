import { supabase } from './supabase-client.js';
import {
  requireUser, loadAccount, siteUrl, onSessionChange
} from './auth.js';

const loading = document.querySelector('#profile-loading');
const content = document.querySelector('#profile-content');
const form = document.querySelector('#wedding-profile-form');
const message = document.querySelector('#profile-save-status');
const saveButton = document.querySelector('#save-wedding-details');
const cancelButton = document.querySelector('#cancel-wedding-changes');

const fields = [
  ['wedding_date', 'Wedding date', 'date', '', 'We’ve set a date'],
  ['wedding_location', 'Wedding location', 'text',
    'Suburb, city or region', 'We have a location in mind'],
  ['wedding_budget', 'Wedding budget · AUD', 'text',
    'For example, 45,000', 'We have an estimate'],
  ['guest_count', 'Guest estimate', 'text',
    'Number of guests', 'We have an estimate']
];

let account;
let saving = false;
let revoked = false;

function setMessage(text, error = false) {
  message.textContent = text;
  message.dataset.error = String(error);
}

function syncField(key) {
  const status = document.getElementById(`${key}-status`);
  const input = document.getElementById(key);
  input.disabled = status.value !== 'provided';
  input.required = status.value === 'provided';
}

function populate() {
  for (const [key] of fields) {
    document.getElementById(`${key}-status`).value =
      account.couple[`${key}_status`] || 'unanswered';
    document.getElementById(key).value = account.couple[key] ?? '';
    syncField(key);
  }
}

function renderFields() {
  const grid = document.querySelector('#wedding-profile-fields');
  grid.replaceChildren();

  for (const [key, label, type, placeholder, provided] of fields) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ws-profile-field';

    const labelElement = document.createElement('label');
    labelElement.htmlFor = `${key}-status`;
    labelElement.textContent = label;

    const select = document.createElement('select');
    select.id = `${key}-status`;
    select.name = `${key}_status`;

    for (const [value, text] of [
      ['unanswered', 'Not answered yet'],
      ['unknown', 'Not decided yet'],
      ['provided', provided]
    ]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    }

    const inputLabel = document.createElement('label');
    inputLabel.className = 'sr-only';
    inputLabel.htmlFor = key;
    inputLabel.textContent = `${label} value`;

    const input = document.createElement('input');
    input.id = key;
    input.name = key;
    input.type = type;
    input.placeholder = placeholder;

    if (key === 'wedding_location') input.maxLength = 200;
    if (key === 'wedding_budget') {
      input.inputMode = 'decimal';
      input.maxLength = 24;
    }
    if (key === 'guest_count') {
      input.inputMode = 'numeric';
      input.maxLength = 5;
    }

    select.addEventListener('change', () => syncField(key));
    wrapper.append(labelElement, select, inputLabel, input);
    grid.append(wrapper);
  }

  populate();
}

function validate(key, raw) {
  const value = raw.trim();

  if (key === 'wedding_date') {
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value) {
      throw new Error('Enter a valid wedding date.');
    }
    return value;
  }

  if (key === 'wedding_location') {
    if (!value || value.length > 200) {
      throw new Error('Enter a location of up to 200 characters.');
    }
    return value;
  }

  if (key === 'wedding_budget') {
    const amount = value.replace(/^\$\s*/, '');
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(amount)) {
      throw new Error('Enter a budget such as 45000 or 45,000.50.');
    }
    const clean = amount.replaceAll(',', '');
    const number = Number(clean);
    if (!Number.isFinite(number) || number <= 0 || number > 10000000) {
      throw new Error('Budget must be between $0.01 and $10,000,000.');
    }
    return clean;
  }

  if (!/^\d+$/.test(value) ||
      Number(value) < 1 || Number(value) > 10000) {
    throw new Error('Guest estimate must be between 1 and 10,000.');
  }
  return Number(value);
}

function changesFromForm() {
  const changes = {};

  for (const [key] of fields) {
    const status = document.getElementById(`${key}-status`).value;
    if (!['provided', 'unknown', 'unanswered'].includes(status)) {
      throw new Error('Choose a valid answer status.');
    }

    const value = status === 'provided'
      ? validate(key, document.getElementById(key).value)
      : null;

    const existing = account.couple[key];
    const sameValue = value === null
      ? existing == null
      : ['wedding_budget', 'guest_count'].includes(key)
        ? existing != null && Number(existing) === Number(value)
        : existing === value;

    if (status !== account.couple[`${key}_status`] || !sameValue) {
      changes[key] = value;
      changes[`${key}_status`] = status;
    }
  }

  return changes;
}

function lockForm(locked) {
  form.querySelectorAll('input,select,button').forEach(control => {
    control.disabled = locked;
  });

  if (!locked) {
    fields.forEach(([key]) => syncField(key));
  }

  saveButton.textContent = locked ? 'Saving…' : 'Save wedding details';
}

form.addEventListener('input', () => {
  if (!saving) setMessage('You have unsaved changes.');
});

form.addEventListener('change', () => {
  if (!saving) setMessage('You have unsaved changes.');
});

cancelButton.addEventListener('click', () => {
  if (saving || revoked || !account) return;
  populate();
  setMessage('Changes cancelled.');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving || revoked || !account || !form.reportValidity()) return;

  let changes;
  try {
    changes = changesFromForm();
  } catch (error) {
    setMessage(error.message, true);
    return;
  }

  if (!Object.keys(changes).length) {
    setMessage('Your wedding details are already up to date.');
    return;
  }

  saving = true;
  lockForm(true);
  setMessage('Saving your wedding details…');

  try {
    const { data, error } = await supabase
      .from('couple_profiles')
      .update(changes)
      .eq('user_id', account.user.id)
      .select()
      .single();

    if (error || !data) throw new Error();
    if (revoked) return;

    account.couple = data;
    populate();
    setMessage('Your wedding details have been saved.');
  } catch {
    if (!revoked) {
      setMessage(
        'We couldn’t save your changes. Your entries are still here. Please try again.',
        true
      );
    }
  } finally {
    saving = false;
    if (!revoked) lockForm(false);
  }
});

onSessionChange(({ user }) => {
  if (!user) {
    revoked = true;
    content.hidden = true;
    loading.hidden = false;
    loading.textContent = 'Please log in to continue.';
    location.replace(siteUrl('login/'));
  }
});

async function start() {
  try {
    const user = await requireUser();
    if (!user || revoked) return;

    account = await loadAccount(user);
    if (revoked) return;

    if (!account.roles.includes('couple') || !account.couple) {
      location.replace(siteUrl('supplier-account/'));
      return;
    }

    renderFields();
    document.querySelector('#profile-back').href = siteUrl('dashboard/');
    document.querySelector('#profile-password-reset').href =
      siteUrl('forgot-password/');

    loading.hidden = true;
    content.hidden = false;
  } catch {
    loading.textContent =
      'We couldn’t load your wedding details. Refresh the page to try again.';
  }
}

start();