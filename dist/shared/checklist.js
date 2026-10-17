import {requireUser, loadAccount, siteUrl, onSessionChange} from './auth.js';
import {fetchTasks, fetchSavedSuppliers, writeTask, deleteTask, orderedTasks, todayKey, dateLabel, isOverdue} from './task-data.js';

const $ = id => document.getElementById(id);
const form = $('ct-form');
const dialog = $('ct-dialog');
const fields = form.elements;
let owner, tasks = [], suppliers = [], supplierReady = false;
let revoked = false, busy = false, loading = false, revision = 0, original = null, loaded = false;
let currentView = 'list', limit = 25;
let month = new Date(new Date().getFullYear(),new Date().getMonth(),1);
function el(tag,text,className) {
  const item = document.createElement(tag); item.textContent = text;
  if (className) item.className = className; return item;
}
function status(message,error = false) {
  $('ct-status').textContent = message;
  $('ct-status').dataset.error = String(error);
}
function filtered() {
  const search = $('ct-search').value.trim().toLocaleLowerCase();
  const state = $('ct-filter-status').value;
  const category = $('ct-filter-category').value;
  return orderedTasks(tasks.filter(task =>
    (!search || `${task.title} ${task.notes}`.toLocaleLowerCase().includes(search)) &&
    (!category || task.category === category) &&
    (state === 'all' || (state === 'pending' ? task.status !== 'completed'
      : state === 'overdue' ? isOverdue(task) : task.status === state))));
}
function taskRow(task) {
  const row = el('li','',`ct-row${task.status === 'completed' ? ' ct-done' : ''}`);
  const check = document.createElement('input');
  check.type = 'checkbox'; check.checked = task.status === 'completed';
  check.setAttribute('aria-label',`${check.checked ? 'Reopen' : 'Complete'} ${task.title}`);
  check.disabled = busy || loading;
  check.addEventListener('change', () => {
    const next = check.checked ? 'completed' : 'todo';
    check.checked = task.status === 'completed';
    void mutate(() => writeTask(owner,{status:next},task),'Task updated.');
  });
  const body = el('div','','ct-task-body');
  const title = el('strong',task.title);
  const meta = [task.category,dateLabel(task.due_date),
    task.status === 'in_progress' ? 'In progress' : '',
    task.priority === 'high' ? 'High priority' : '',
    task.supplier?.['Name of Wedding Vendor'] || ''].filter(Boolean).join(' · ');
  body.append(title,el('p',meta));
  if (isOverdue(task)) body.append(el('span','Overdue','ct-overdue-tag'));
  if (task.notes) {
    const details = document.createElement('details');
    details.append(el('summary','Notes'),el('p',task.notes,'ct-notes')); body.append(details);
  }
  const actions = el('div','','ct-actions');
  const edit = el('button','Edit'); edit.type = 'button'; edit.disabled = busy || loading;
  edit.setAttribute('aria-label',`Edit ${task.title}`);
  edit.addEventListener('click', () => openEditor(task));
  const remove = el('button','Delete'); remove.type = 'button'; remove.disabled = busy || loading;
  remove.setAttribute('aria-label',`Delete ${task.title}`);
  remove.addEventListener('click', () => {
    if (confirm(`Delete “${task.title}”? This cannot be undone.`))
      void mutate(() => deleteTask(owner,task),'Task deleted.');
  });
  actions.append(edit,remove); row.append(check,body,actions); return row;
}
function renderCalendar(rows) {
  $('ct-month').textContent = month.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
  const prefix = todayKey(month).slice(0,7);
  const monthly = rows.filter(task => task.due_date?.startsWith(prefix));
  const body = $('ct-days'); body.replaceChildren();
  const first = (month.getDay()+6)%7;
  const days = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  let tr;
  for (let cell = 0; cell < Math.ceil((first+days)/7)*7; cell++) {
    if (cell%7 === 0) { tr = document.createElement('tr'); body.append(tr); }
    const td = document.createElement('td'); tr.append(td);
    const day = cell-first+1;
    if (day < 1 || day > days) { td.className = 'ct-outside'; continue; }
    const key = `${prefix}-${String(day).padStart(2,'0')}`;
    const time = el('time',String(day)); time.dateTime = key;
    if (key === todayKey()) { td.classList.add('ct-today'); time.setAttribute('aria-current','date'); }
    td.append(time);
    for (const task of monthly.filter(item => item.due_date === key)) {
      const button = el('button',task.title,`ct-calendar-task${isOverdue(task) ? ' ct-late' : ''}`);
      button.type = 'button'; button.disabled = busy || loading;
      button.setAttribute('aria-label',`Edit ${task.title}, due ${dateLabel(key)}`);
      if (task.status === 'completed') button.classList.add('ct-finished');
      button.addEventListener('click',() => openEditor(task)); td.append(button);
    }
  }
  $('ct-agenda').replaceChildren(...monthly.map(taskRow));
  const undated = rows.filter(task => !task.due_date).length;
  $('ct-undated').textContent = `${monthly.length} matching ${monthly.length === 1 ? 'task' : 'tasks'} this month.${undated ? ` ${undated} without a due date appear in Checklist view.` : ''}`;
}
function render() {
  const completed = tasks.filter(task => task.status === 'completed').length;
  $('ct-pending').textContent = tasks.length-completed;
  $('ct-overdue').textContent = tasks.filter(isOverdue).length;
  $('ct-completed').textContent = completed;
  const percent = tasks.length ? Math.round(completed/tasks.length*100) : 0;
  $('ct-progress').value = percent;
  $('ct-progress-label').textContent = `${completed} of ${tasks.length} tasks complete${tasks.length ? ` · ${percent}%` : ''}`;
  const rows = filtered();
  $('ct-list').replaceChildren(...rows.slice(0,limit).map(taskRow));
  $('ct-more').hidden = rows.length <= limit;
  $('ct-list-panel').hidden = currentView !== 'list';
  $('ct-calendar-panel').hidden = currentView !== 'calendar';
  $('ct-list-view').setAttribute('aria-pressed',String(currentView === 'list'));
  $('ct-calendar-view').setAttribute('aria-pressed',String(currentView === 'calendar'));
  $('ct-empty').hidden = rows.length > 0;
  $('ct-empty-title').textContent = tasks.length ? 'No tasks match this view' : 'Your plans start here';
  $('ct-empty-copy').textContent = tasks.length ? 'Try another status or clear your filters to see all your tasks.' : 'Add your first task. Give it a due date to see it on your calendar too.';
  $('ct-empty-add').hidden = tasks.length > 0;
  $('ct-clear-filters').hidden = !tasks.length;
  renderCalendar(rows);
  if (!loaded) {
    for (const id of ['ct-pending','ct-overdue','ct-completed']) $(id).textContent = '—';
    $('ct-progress-label').textContent = loading ? 'Loading your progress…' : 'Task totals unavailable';
    $('ct-progress').removeAttribute('value');
    $('ct-empty').hidden = true;
    $('ct-undated').textContent = '';
  }
}
async function refresh() {
  if (!owner || revoked || loading) return false;
  loading = true;
  const request = ++revision;
  $('ct-refresh').disabled = true;
  status('Loading tasks…');
  render();
  try {
    const result = await fetchTasks(owner);
    if (revoked || request !== revision) return false;
    tasks = result; loaded = true;
    const select = $('ct-filter-category'), selected = select.value;
    select.replaceChildren(new Option('All categories',''));
    [...new Set(tasks.map(task => task.category))].sort().forEach(category => select.add(new Option(category,category)));
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
    status(`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} saved. Counts above include all tasks.`);
    return true;
  } catch {
    if (!revoked && request === revision)
      status('Couldn’t refresh tasks. Previously loaded tasks may be out of date. Use Refresh tasks to try again.',true);
    return false;
  } finally {
    if (request === revision && !revoked) {
      loading = false; $('ct-refresh').disabled = false; render();
    }
  }
}
async function loadSuppliers() {
  try {
    const result = await fetchSavedSuppliers(owner);
    if (revoked) return;
    suppliers = result; supplierReady = true;
  } catch { supplierReady = false; }
}
function openEditor(task = null) {
  if (busy || loading || revoked) return;
  original = task; form.reset();
  $('ct-editor-heading').textContent = task ? 'Edit task' : 'Add a task';
  for (const key of ['title','notes','category','due_date','status','priority'])
    if (task) fields.namedItem(key).value = task[key] || '';
  const select = fields.namedItem('linked_supplier_id');
  select.replaceChildren(new Option('No supplier linked',''));
  suppliers.forEach(row => select.add(new Option(row.supplier['Name of Wedding Vendor'],row.vendor_id)));
  if (task?.linked_supplier_id && ![...select.options].some(option => option.value === task.linked_supplier_id))
    select.add(new Option(task.supplier?.['Name of Wedding Vendor'] || 'Previously linked supplier',task.linked_supplier_id));
  select.value = task?.linked_supplier_id || '';
  select.disabled = !supplierReady;
  $('ct-supplier-help').textContent = supplierReady ? 'Choose from your saved suppliers.' : 'Supplier choices could not load. Existing links are preserved. Refresh tasks to retry.';
  $('ct-form-status').textContent = '';
  dialog.showModal(); fields.namedItem('title').focus();
}
async function mutate(operation, success, fromForm = false) {
  if (busy || loading || revoked) return;
  busy = true; $('ct-add').disabled = true;
  $('ct-fields').disabled = true; $('ct-save').disabled = $('ct-cancel').disabled = true;
  render();
  if (fromForm) $('ct-form-status').textContent = 'Saving…';
  try {
    await operation();
    if (revoked) return;
    if (fromForm) dialog.close();
    window.dispatchEvent(new Event('wedsparks:tasks-changed'));
    const refreshed = await refresh();
    if (refreshed) status(success);
  } catch (error) {
    if (!revoked) {
      if (fromForm) $('ct-form-status').textContent = error.message;
      else status(error.message,true);
    }
  } finally {
    busy = false;
    if (!revoked) {
      $('ct-add').disabled = false;
      $('ct-fields').disabled = false; $('ct-save').disabled = $('ct-cancel').disabled = false;
      render();
    }
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  const value = key => fields.namedItem(key).value.trim();
  if (!value('title') || !value('category')) {
    $('ct-form-status').textContent = 'Enter a task title and category.'; return;
  }
  const changes = Object.fromEntries(['title','notes','category','status','priority'].map(key => [key,value(key)]));
  changes.due_date = value('due_date') || null;
  changes.linked_supplier_id = supplierReady ? value('linked_supplier_id') || null : original?.linked_supplier_id || null;
  void mutate(() => writeTask(owner,changes,original),'Task saved.',true);
});
$('ct-cancel').addEventListener('click', () => { if (!busy) dialog.close(); });
dialog.addEventListener('cancel',event => { if (busy) event.preventDefault(); });
$('ct-add').addEventListener('click',() => openEditor());
$('ct-empty-add').addEventListener('click',() => openEditor());
$('ct-refresh').addEventListener('click',() => { if (!busy) { void refresh(); void loadSuppliers(); } });
for (const id of ['ct-search','ct-filter-status','ct-filter-category'])
  $(id).addEventListener(id === 'ct-search' ? 'input' : 'change',() => { limit = 25; render(); });
$('ct-clear-filters').addEventListener('click',() => {
  $('ct-search').value = ''; $('ct-filter-category').value = ''; $('ct-filter-status').value = 'all'; limit = 25; render();
});
$('ct-more').addEventListener('click',() => { limit += 25; render(); });
for (const view of ['list','calendar']) $( `ct-${view}-view`).addEventListener('click',() => { currentView = view; render(); });
function moveMonth(delta) { month = new Date(month.getFullYear(),month.getMonth()+delta,1); render(); }
$('ct-month-previous').addEventListener('click',() => moveMonth(-1));
$('ct-month-next').addEventListener('click',() => moveMonth(1));
$('ct-month-today').addEventListener('click',() => { month = new Date(new Date().getFullYear(),new Date().getMonth(),1); render(); });
function refreshVisible() {
  if (owner && !revoked && !busy && !loading && !dialog.open && !document.hidden && !form.closest('main').hidden) void refresh();
}
window.addEventListener('wedsparks:section-open',event => {
  if (event.detail === 'checklist') { refreshVisible(); if (!dialog.open && owner) void loadSuppliers(); }
});
window.addEventListener('focus',refreshVisible);
document.addEventListener('visibilitychange',refreshVisible);
setInterval(refreshVisible,60000);
onSessionChange(({user}) => {
  if (owner && user?.id !== owner) {
    revoked = true; revision++; tasks = []; suppliers = [];
    dialog.close(); form.reset(); $('ct-list').replaceChildren(); $('ct-days').replaceChildren();
    $('ct-content').hidden = true; location.replace(siteUrl('login/'));
  }
});
async function start() {
  try {
    const user = await requireUser(); if (!user || revoked) return;
    owner = user.id;
    const account = await loadAccount(user); if (revoked) return;
    if (!account.roles.includes('couple')) { location.replace(siteUrl('supplier-account/')); return; }
    $('ct-loading').hidden = true; $('ct-content').hidden = false;
    await Promise.all([refresh(),loadSuppliers()]);
  } catch { $('ct-loading').textContent = 'Couldn’t load your account. Refresh the page to try again.'; }
}
void start();
