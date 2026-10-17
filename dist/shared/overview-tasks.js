import { siteUrl, onSessionChange } from './auth.js';
import {fetchTasks, orderedTasks, isOverdue, dateLabel} from './task-data.js';

let owner = null;
let revision = 0;
let inFlight = false;
let revoked = false;
const visible = () => {
  const list = document.getElementById('overview-task-list');
  return !!list && !list.closest('main')?.hidden && !document.hidden;
};
function text(tag,value) {
  const node = document.createElement(tag); node.textContent = value; return node;
}
export async function refreshOverviewTasks(userId = owner) {
  const countNode = document.getElementById('overview-task-count');
  const list = document.getElementById('overview-task-list');
  const status = document.getElementById('overview-task-status');
  const retry = document.getElementById('overview-task-retry');
  if (!userId || revoked || !countNode || !list) return;
  owner = userId;
  const request = ++revision;
  inFlight = true;
  countNode.removeAttribute('aria-label');
  // Keep the current task count visible during refresh.
  if (!status.textContent) status.textContent = 'Loading tasks…';
  retry.hidden = true;
  retry.onclick = () => void refreshOverviewTasks();
  // Replace the list only after fresh tasks arrive.
  document.getElementById('overview-checklist-link').href = siteUrl('dashboard/checklist/');
  try {
    const all = await fetchTasks(userId);
    if (revoked || request !== revision) return;
    const pending = orderedTasks(all.filter(task => task.status !== 'completed'));
    const overdue = pending.filter(isOverdue).length;
    countNode.textContent = pending.length.toLocaleString('en-AU');
    status.textContent = !all.length ? 'Start with one small step. Add your first task.'
      : !pending.length ? 'You’re all caught up. Every task is complete.'
      : `${pending.length} pending${overdue ? ` · ${overdue} overdue` : ''}. Next up:`;
    list.replaceChildren();
    for (const task of pending.slice(0,3)) {
      const row = text('li','');
      const link = text('a',task.title);
      link.href = siteUrl('dashboard/checklist/');
      const detail = text('small', `${isOverdue(task) ? 'Overdue · ' : ''}${dateLabel(task.due_date)}`);
      row.append(link,detail); list.append(row);
    }
  } catch {
    if (revoked || request !== revision) return;
    countNode.textContent = '—';
    countNode.setAttribute('aria-label','Tasks unavailable');
    status.textContent = 'Couldn’t load tasks. Please try again.';
    retry.hidden = false;
  } finally { if (request === revision) inFlight = false; }
}
function refreshVisible() { if (visible() && owner && !inFlight) void refreshOverviewTasks(); }
window.addEventListener('wedsparks:tasks-changed',refreshVisible);
window.addEventListener('focus',refreshVisible);
document.addEventListener('visibilitychange',refreshVisible);
setInterval(refreshVisible,60000);
onSessionChange(({user}) => {
  if (owner && user?.id !== owner) {
    revoked = true; revision++; owner = null;
    document.getElementById('overview-task-list')?.replaceChildren();
    const content = document.getElementById('private-content');
    if (content) content.hidden = true;
    location.replace(siteUrl('login/'));
  }
});
