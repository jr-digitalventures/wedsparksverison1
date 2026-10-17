import {supabase} from './supabase-client.js';
import {siteUrl,onSessionChange} from './auth.js';

let owner = null, revision = 0, inFlight = false, revoked = false;
const $ = id => document.getElementById(`overview-guests-${id}`);
const visible = () => {
  const list = $('status');
  return !!list && !list.closest('main').hidden &&
    !document.getElementById('private-content').hidden && !document.hidden;
};
const counter = userId => supabase.from('couple_guests')
  .select('id',{count:'exact',head:true}).eq('user_id',userId);

export async function refreshOverviewGuests(userId = owner) {
  if (!userId || revoked || !$('rate')) return;
  owner = userId;
  const request = ++revision;
  inFlight = true;
  $('status').textContent = 'Loading guest totals…';
  $('retry').hidden = true;
  $('retry').onclick = () => void refreshOverviewGuests();
  $('link').href = siteUrl('dashboard/guests/');

  try {
    const results = await Promise.all([
      counter(userId),
      counter(userId).eq('rsvp_status','attending'),
      counter(userId).eq('rsvp_status','declined'),
      counter(userId).eq('invitation_status','sent'),
      counter(userId).eq('invitation_status','sent').eq('rsvp_status','awaiting_reply')
    ]);

    if (revoked || request !== revision) return;
    if (results.some(result => result.error || result.count == null))
      throw new Error();

    const [total,attending,declined,invited,awaiting] =
      results.map(result => result.count);

    for (const [key,value] of Object.entries({total,attending,declined,awaiting}))
      $(key).textContent = value.toLocaleString('en-AU');

    $('rate').textContent = total
      ? `${Math.round(attending / total * 100)}%` : '—';
    $('rate').setAttribute('aria-label', total
      ? `${attending} of ${total} guests are attending`
      : 'No guests added yet');

    $('status').textContent = total
      ? `${attending} of ${total} guests are attending.`
      : 'Start your guest list by adding your first guest.';

  } catch {
    if (revoked || request !== revision) return;
    for (const key of ['rate','total','attending','declined','awaiting'])
      $(key).textContent = '—';
    $('rate').setAttribute('aria-label','Guest totals unavailable');
    $('status').textContent = 'Couldn’t load guest totals. Please try again.';
    $('retry').hidden = false;
  } finally {
    if (request === revision) inFlight = false;
  }
}

function refreshVisible() {
  if (owner && !inFlight && !revoked && visible())
    void refreshOverviewGuests();
}
window.addEventListener('wedsparks:guests-changed',refreshVisible);
window.addEventListener('focus',refreshVisible);
document.addEventListener('visibilitychange',refreshVisible);
setInterval(refreshVisible,60000);

onSessionChange(({user}) => {
  if (owner && user?.id !== owner) {
    revoked = true;
    revision++;
    owner = null;
    for (const key of ['rate','total','attending','declined','awaiting'])
      if ($(key)) $(key).textContent = '—';
    const content = document.getElementById('private-content');
    if (content) content.hidden = true;
    location.replace(siteUrl('login/'));
  }
});