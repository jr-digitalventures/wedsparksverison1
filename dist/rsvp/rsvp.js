import {createClient} from '../shared/vendor/supabase.js';

// Public RSVP access is separate from the couple's login session.
const client = createClient(
  'https://vfdtyxcfrqnqdyuimtho.supabase.co',
  'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd',
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
);

const $ = id => document.getElementById(id);
const form = $('rsvp-form'), fields = $('rsvp-fields');
const status = $('status'), reload = $('reload');
// Twelve-character invitation codes
const invitationHash = location.hash;
const shortCode = /^[A-Za-z0-9_-]{12}$/.test(location.hash.slice(1))
  ? location.hash.slice(1) : '';
const token = readInvitationToken();
let replyToken = '';
let busy = false, ready = false, guests = [], controls = [];

function message(text,error=false) {
  status.textContent = text;
  status.dataset.error = String(error);
}
function lock(value) {
  busy = value;
  fields.disabled = value || !ready;
  reload.disabled = value;
}
function element(tag,text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function render() {
  $('guests').replaceChildren();
  controls = guests.map((guest,index) => {
    const group = document.createElement('fieldset');
    group.className = 'guest';
    group.append(element('legend',
      `${guest.first_name} ${guest.last_name || ''}`.trim()));

    const answerLabel = element('label','Will you be attending?');
    answerLabel.htmlFor = `answer-${index}`;
    const answer = document.createElement('select');
    answer.id = `answer-${index}`;

    answer.add(new Option('Yes, I’ll be there','attending'));
    answer.add(new Option('Sorry, I can’t attend','declined'));
    answer.value = ['attending','declined'].includes(guest.rsvp_status)
      ? guest.rsvp_status : 'attending';

    const dietaryLabel = element('label','Dietary requirements (optional)');
    dietaryLabel.htmlFor = `dietary-${index}`;
    const dietary = document.createElement('textarea');
    dietary.id = `dietary-${index}`;
    dietary.rows = 3;
    dietary.maxLength = 1000;
    dietary.value = guest.dietary_requirements || '';

    group.append(answerLabel,answer,dietaryLabel,dietary);
    $('guests').append(group);
    return {guest,answer,dietary,group,selected:guests.length === 1};
  });
  renderPersonSelection();
}

async function load() {
  if (busy) return false;
  ready = false;
  lock(true);
  form.hidden = true;
  clearInvitation();
  message('Loading the latest replies…');
  try {
    const {data,error} = await client.functions.invoke('guest-invitation',{body:shortCode ? {code:shortCode} : {token}});
    if (error || !Array.isArray(data?.guests) || !data.guests.length)
      throw new Error();
    if (!/^[0-9a-f]{64}$/.test(data.rsvp_token || '')) {
      throw new Error('Could not verify this invitation.');
    }
    replyToken = data.rsvp_token;
    renderInvitation(data.invitation);
    guests = data.guests;
    render();
    ready = true;
    form.hidden = false;
    message('Please review your details and submit your reply.');
    return true;
  } catch {
    guests = [];
    controls = [];
    $('guests').replaceChildren();
    message('We couldn’t open this invitation. The link may have expired or been cancelled. Try reloading, or ask the couple for a new link.',true);
    return false;
  } finally {
    reload.hidden = false;
    lock(false);
  }
}

form.addEventListener('submit',async event => {
  event.preventDefault();
  if (busy || !ready || !form.reportValidity()) return;

  if (!controls.some(control => control.selected)) {
    message('Choose who you are replying for. Select yourself, or the family members whose replies you can confirm.',true);
    document.querySelector('#rsvp-person-selection input')?.focus();
    return;
  }

  const responses = [];
  for (const {guest,answer,dietary,selected} of controls) {
    if (!selected) continue;
    const previous = ['attending','declined'].includes(guest.rsvp_status)
      ? guest.rsvp_status : '';
    const notes = dietary.value.trim();

    if (!answer.value) {
      if (previous || notes !== (guest.dietary_requirements || '').trim()) {
        message('Please choose Yes or No for the person whose details you changed.',true);
        answer.focus();
        return;
      }
      continue;
    }
    if (answer.value !== previous ||
        notes !== (guest.dietary_requirements || '').trim()) {
      responses.push({
        guest_id:guest.guest_id,
        rsvp_status:answer.value,
        dietary_requirements:notes,
        updated_at:guest.updated_at
      });
    }
  }

  if (!responses.length) {
    message('There are no new replies to save. Choose Yes or No, or update your dietary requirements.');
    return;
  }

  lock(true);
  message('Saving your reply…');
  let saved = false;
  try {
    const {data,error} = await client.rpc('submit_guest_rsvp',{
      p_token:replyToken,p_responses:responses
    });
    if (error || data?.saved !== true) throw new Error();
    saved = true;
  } catch {
    ready = false;
    message('We couldn’t confirm your reply. Reload the latest replies before trying again. Your details may have changed, or the link may no longer be active.',true);
  } finally {
    lock(false);
    reload.hidden = false;
  }

  if (saved) {
    const refreshed = await load();
    if (refreshed) {
      message('Thank you! Your reply has been saved. You can return using this link if your plans change.');
    } else {
      message('Your reply was saved, but we couldn’t reload the latest details. Please try reloading.');
    }
  }
});

reload.onclick = () => {
  if (ready && controls.some(({guest,answer,dietary,selected}) =>
    selected && (
      answer.value !== (['attending','declined'].includes(guest.rsvp_status) ? guest.rsvp_status : '') ||
      dietary.value.trim() !== (guest.dietary_requirements || '').trim()
    )
  ) && !confirm('Reload and discard your unsaved changes?')) return;
  void load();
};

if (shortCode || /^[0-9a-f]{64}$/.test(token)) {
  void load();
} else {
  fields.disabled = true;
  message('Please open the private RSVP link shared by the couple. This page needs the full invitation link.');
}

// RSVP person selection
function renderPersonSelection() {
  let section = $('rsvp-person-selection');
  if (!section) {
    section = document.createElement('fieldset');
    section.id = 'rsvp-person-selection';
    $('guests').before(section);
  }
  section.replaceChildren();
  section.hidden = controls.length === 1;

  const heading = element('legend','Who are you replying for?');
  heading.style.cssText = 'font:bold 20px Georgia,serif;margin:14px 0';
  section.append(heading,element('p',
    'Select just yourself, or select the family members whose replies you can confirm. Unselected guests stay unchanged.'));

  for (const control of controls) {
    const {guest,group} = control;
    const label = document.createElement('label');
    label.style.cssText =
      'display:flex;align-items:center;gap:12px;padding:12px;background:white;border:1px solid #dedbd6;border-radius:8px;margin:8px 0';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = control.selected;
    checkbox.style.cssText = 'width:20px;height:20px;flex:0 0 20px';

    const saved = guest.rsvp_status === 'attending' ? 'Attending'
      : guest.rsvp_status === 'declined' ? 'Declined' : 'Awaiting reply';
    label.append(checkbox,document.createTextNode(
      `${guest.first_name} ${guest.last_name || ''} · ${saved}`
    ));
    section.append(label);

    const update = () => {
      control.selected = checkbox.checked;
      group.hidden = !control.selected;
      group.disabled = !control.selected;
      updateRsvpSubmitLabel();
    };
    checkbox.onchange = update;
    update();
  }
}

function updateRsvpSubmitLabel() {
  form.querySelector('button[type="submit"]').textContent = 'Submit reply';
}

{
  const intro = form.querySelector('p');
  intro.textContent =
    'Unanswered replies start on “Yes, I’ll be there”. Please check each answer before submitting. Nothing is saved automatically.';
}
// Saved guest invitation display
function clearInvitation() {
  document.getElementById('saved-invitation')?.remove();
  const hero = document.querySelector('.hero');
  if (hero) hero.hidden = false;
}

function renderInvitation(invitation) {
  if (!invitation || typeof invitation !== 'object') {
    throw new Error('Invitation unavailable');
  }

  if (!document.getElementById('saved-invitation-style')) {
    const style = document.createElement('style');
    style.id = 'saved-invitation-style';
    style.textContent = `
      #saved-invitation {
        background:#fffdf8;border:1px solid #ddd5c5;
        border-radius:14px;overflow:hidden;margin-bottom:28px;
        color:#173e33;overflow-wrap:anywhere;
      }
      #saved-invitation .invite-heading {
        padding:30px 24px;text-align:center;
      }
      #saved-invitation h2 {
        font:normal 36px/1.2 Georgia,serif;margin:14px 0;
      }
      #saved-invitation .invite-eyebrow {
        font:12px Arial,sans-serif;letter-spacing:2px;
      }
      #saved-invitation .invite-body {
        padding:24px;text-align:center;
      }
      #saved-invitation .invite-wording {
        white-space:pre-wrap;margin-top:0;
      }
      #saved-invitation .invite-detail {font-weight:bold}
      #saved-invitation img {display:block;width:100%;height:auto}
      #saved-invitation .invite-floral {display:none}
      #saved-invitation[data-design="floral"] {
        background:#fffafa;border-color:#e4cbd0;
      }
      #saved-invitation[data-design="floral"] .invite-heading {
        background:#f9edf0;color:#653e4b;
      }
      #saved-invitation[data-design="floral"] .invite-floral {
        display:block;font:44px Georgia,serif;color:#936477;
      }
      #saved-invitation[data-design="modern"] {
        background:white;border-color:#bdcec5;border-radius:0;
      }
      #saved-invitation[data-design="modern"] .invite-heading {
        background:#103e33;color:white;text-align:left;
      }
      #saved-invitation[data-design="modern"] h2 {
        font:bold 34px/1.2 Arial,sans-serif;
      }
      #saved-invitation[data-design="modern"] .invite-body {
        text-align:left;
      }
      @media(max-width:500px) {
        #saved-invitation h2 {font-size:28px}
      }
    `;
    document.head.append(style);
  }

  const card = document.createElement('article');
  card.id = 'saved-invitation';
  card.setAttribute('aria-label','Your wedding invitation');
  card.dataset.design = ['classic','floral','modern'].includes(invitation.design)
    ? invitation.design : 'classic';

  const heading = document.createElement('div');
  heading.className = 'invite-heading';

  const floral = element('span','\u2767');
  floral.className = 'invite-floral';
  floral.setAttribute('aria-hidden','true');

  const eyebrow = element('p',"YOU'RE INVITED");
  eyebrow.className = 'invite-eyebrow';
  heading.append(
    floral,
    eyebrow,
    element('h2',invitation.couple_names || 'Our wedding'),
    element('p',"We'd love to celebrate with you")
  );
  card.append(heading);

  if (invitation.card_image_url) {
    const url = new URL(invitation.card_image_url);
    if (
      url.origin !== 'https://vfdtyxcfrqnqdyuimtho.supabase.co' ||
      !url.pathname.startsWith('/storage/v1/object/sign/wedding-invitation-cards/')
    ) {
      throw new Error('Unexpected invitation image');
    }

    const image = document.createElement('img');
    image.alt = 'Wedding invitation card';
    image.referrerPolicy = 'no-referrer';
    image.src = url.href;
    image.onerror = () => {
      image.replaceWith(element('p',
        'The invitation image could not load. Reload to try again.'));
    };
    card.append(image);
  }

  const body = document.createElement('div');
  body.className = 'invite-body';

  if (invitation.wording) {
    const wording = element('p',invitation.wording);
    wording.className = 'invite-wording';
    body.append(wording);
  }

  const date = invitation.wedding_date
    ? new Date(invitation.wedding_date + 'T12:00:00') : null;
  const details = [
    date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString('en-AU',{
          weekday:'long',day:'numeric',month:'long',year:'numeric'
        }) : '',
    invitation.wedding_location || ''
  ];

  for (const text of details.filter(Boolean)) {
    const detail = element('p',text);
    detail.className = 'invite-detail';
    body.append(detail);
  }

  card.append(body);
  document.getElementById('saved-invitation')?.remove();
  status.before(card);
  const hero = document.querySelector('.hero');
  if (hero) hero.hidden = true;
}
// Reload when the private invitation changes
window.addEventListener('hashchange', () => {

  if (location.hash !== invitationHash) location.reload();
});
// Support shorter invitations and previously shared links.
function readInvitationToken() {
  const hash = location.hash.slice(1);
  const legacy = new URLSearchParams(hash).get('token');
  if (legacy !== null) return legacy;

  if (!/^[A-Za-z0-9_-]{43}$/.test(hash)) return '';
  try {
    const bytes = atob(hash.replace(/-/g,'+').replace(/_/g,'/') + '=');
    if (bytes.length !== 32) return '';
    return Array.from(bytes,character =>
      character.charCodeAt(0).toString(16).padStart(2,'0')
    ).join('');
  } catch {
    return '';
  }
}