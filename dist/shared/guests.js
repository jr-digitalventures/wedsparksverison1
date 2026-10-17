import {supabase} from './supabase-client.js';
import {requireUser,loadAccount,siteUrl,onSessionChange} from './auth.js';

const $ = id => document.getElementById(id);
const content = $('gu-content'), form = $('gu-form'), dialog = $('gu-dialog');
let owner, guests = [], original = null;
let busy = false, loading = false, revoked = false, loaded = false, limit = 25;
const labels = {awaiting_reply:'Awaiting reply',attending:'Attending',declined:'Declined'};
const fields = [
  ['first_name','First name','text',100,true],
  ['last_name','Last name (optional)','text',100],
  ['email','Email (optional)','email',254],
  ['invitation_group','Invitation group (optional)','text',120],
  ['seating_assignment','Table / seating (optional)','text',120],
  ['dietary_requirements','Dietary requirements (optional)','textarea',1000],
  ['notes','Private notes (optional)','textarea',5000]
];
const keys = [...fields.map(f=>f[0]),'invitation_status','rsvp_status'];

content.innerHTML = `
  <div class="ct-heading">
    <div><h2>The people who make your day</h2><p>Your guests, replies and table assignments.</p></div>
    <button id="gu-add" type="button" class="ct-primary">+ Add a guest</button>
  </div>
  <dl class="ct-stats">
    <div><dt>Guests added</dt><dd id="gu-total">—</dd></div>
    <div><dt>Attending</dt><dd id="gu-attending">—</dd></div>
    <div><dt>Invited · awaiting reply</dt><dd id="gu-awaiting">—</dd></div>
  </dl>

  <div class="ct-filters">
    <label>Search name or invitation group<input id="gu-search" type="search" maxlength="200"></label>
    <label>RSVP<select id="gu-rsvp">
      <option value="">All responses</option><option value="awaiting_reply">Awaiting reply</option>
      <option value="attending">Attending</option><option value="declined">Declined</option>
    </select></label>
    <label>Table / seating<select id="gu-seating">
      <option value="">All tables</option><option value="unassigned">Not assigned</option>
    </select></label>
  </div>
  <button id="gu-refresh" type="button">Refresh guests</button>
  <p id="gu-status" class="ct-status" role="status" aria-live="polite"></p>
  <ul id="gu-list" class="ct-list"></ul>
  <button id="gu-more" type="button" hidden>Show more guests</button>
  <div id="gu-empty" class="ct-empty" hidden>
    <h2 id="gu-empty-title"></h2><p id="gu-empty-copy"></p>
    <button id="gu-empty-add" type="button" class="ct-primary">Add your first guest</button>
    <button id="gu-clear" type="button" hidden>Clear filters</button>
  </div>`;

$('gu-fields').innerHTML = `<div class="ct-form-grid">` +
  fields.map(([key,label,type,max,required])=>`<label>${label}${
    type==='textarea'
      ? `<textarea name="${key}" rows="3" maxlength="${max}"></textarea>`
      : `<input name="${key}" type="${type}" maxlength="${max}" ${required?'required':''} autocomplete="off">`
  }</label>`).join('') + `
  <label>Invitation status<select name="invitation_status">
    <option value="not_sent">Not sent</option><option value="sent">Sent</option>
  </select></label>
  <label>RSVP status<select name="rsvp_status">
    <option value="awaiting_reply">Awaiting reply</option>
    <option value="attending">Attending</option><option value="declined">Declined</option>
  </select></label></div>`;

function node(tag,text,css) {
  const n=document.createElement(tag); n.textContent=text;
  if(css)n.className=css; return n;
}
function message(text,error=false) {
  $('gu-status').textContent=text;
  $('gu-status').dataset.error=String(error);
}
function render() {
  $('gu-total').textContent=loaded?guests.length:'—';
  $('gu-attending').textContent=loaded?guests.filter(g=>g.rsvp_status==='attending').length:'—';
  $('gu-awaiting').textContent=loaded?guests.filter(g=>g.invitation_status==='sent'&&g.rsvp_status==='awaiting_reply').length:'—';
  const search=$('gu-search').value.trim().toLocaleLowerCase();
  const rsvp=$('gu-rsvp').value, seating=$('gu-seating').value;
  const rows=guests.filter(g=>
    (!search||`${g.first_name} ${g.last_name} ${g.invitation_group}`.toLocaleLowerCase().includes(search))&&
    (!rsvp||g.rsvp_status===rsvp)&&
    (!seating||(seating==='unassigned'?!g.seating_assignment:g.seating_assignment===seating.slice(6)))
  ).sort((a,b)=>a.last_name.localeCompare(b.last_name)||a.first_name.localeCompare(b.first_name)||a.id.localeCompare(b.id));

  $('gu-list').replaceChildren();
  for(const guest of rows.slice(0,limit)) {
    const name=[guest.first_name,guest.last_name].filter(Boolean).join(' ');
    const row=node('li','','ct-row'), body=node('div','','ct-task-body');
    body.append(node('strong',name),node('p',
      `${labels[guest.rsvp_status]} · Invitation ${guest.invitation_status==='sent'?'sent':'not sent'} · ${guest.seating_assignment||'Table not assigned'}`));
    if(guest.invitation_group) {
      const groupLabel = node('p','');
      groupLabel.style.cssText = 'display:flex;align-items:center;gap:7px';
      groupLabel.setAttribute('aria-label',`Invitation group: ${guest.invitation_group}`);
      groupLabel.title = 'Invitation group';
      groupLabel.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/></svg>';
      groupLabel.append(document.createTextNode(guest.invitation_group));
      body.append(groupLabel);
    }
    if(guest.email||guest.dietary_requirements||guest.notes) {
      const details=node('details',''); details.append(node('summary','Guest details'));
      if(guest.email)details.append(node('p',guest.email));
      if(guest.dietary_requirements)details.append(node('p',`Dietary requirements: ${guest.dietary_requirements}`));
      if(guest.notes)details.append(node('p',guest.notes,'ct-notes'));
      body.append(details);
    }
    const actions=node('div','','ct-actions');
    for(const action of ['Edit','Delete']) {
      const button=node('button',action); button.type='button';
      button.disabled=busy||loading;
      button.setAttribute('aria-label',`${action} ${name}`);
      button.onclick=()=>{
        if(action==='Edit')openEditor(guest);
        else if(confirm(`Delete ${name} from your guest list?`))
          void commit(supabase.from('couple_guests').delete()
            .eq('user_id',owner).eq('id',guest.id).eq('updated_at',guest.updated_at),'Guest deleted.');
      };
      actions.append(button);
    }
    const invitationAccess = node('button','Share invitation');
    invitationAccess.type = 'button';
    invitationAccess.disabled = busy || loading;
    invitationAccess.onclick = () => void openGuestInvitationAccess(guest);
    actions.append(invitationAccess);
    row.append(body,actions); $('gu-list').append(row);
  }
  $('gu-more').hidden=rows.length<=limit;
  $('gu-empty').hidden=!loaded||rows.length>0;
  $('gu-empty-title').textContent=guests.length?'No guests match these filters':'Who will share your day?';
  $('gu-empty-copy').textContent=guests.length?'Clear the filters or try another name.':'Add your first guest to start organising invitations, replies and seating.';
  $('gu-empty-add').hidden=guests.length>0;
  $('gu-clear').hidden=!guests.length;
}

async function refresh() {
  if(!owner||loading||revoked)return false;
  loading=true; $('gu-refresh').disabled=true;
  message('Loading your guests…'); render();
  try {
    const result=[];
    for(;;) {
      const {data,count,error}=await supabase.from('couple_guests')
        .select('*',{count:'exact'}).eq('user_id',owner)
        .order('id').range(result.length,result.length+499);
      if(revoked)return false;
      if(error||!Array.isArray(data)||count==null)throw new Error();
      result.push(...data);
      if(result.length>=count)break;
      if(!data.length)throw new Error();
    }
    guests=result; loaded=true;
    const select=$('gu-seating'), selected=select.value;
    select.replaceChildren(new Option('All tables',''),new Option('Not assigned','unassigned'));
    [...new Set(guests.map(g=>g.seating_assignment).filter(Boolean))].sort()
      .forEach(value=>select.add(new Option(value,`table:${value}`)));
    if([...select.options].some(o=>o.value===selected))select.value=selected;
    message(`${guests.length} ${guests.length===1?'guest':'guests'} saved. Totals include all guests.`);
    return true;
  }catch {
    if(!revoked)message(loaded
      ? 'Couldn’t refresh. Previously loaded guests may be out of date. Try Refresh guests.'
      : 'Couldn’t load guests. Use Refresh guests to try again.',true);
    return false;
  }finally {
    loading=false;
    if(!revoked){$('gu-refresh').disabled=false;render();}
  }
}
function openEditor(guest=null) {
  if(busy||loading||revoked)return;
  original=guest; form.reset();
  syncGuestSuggestions();
  if(guest)keys.forEach(key=>form.elements.namedItem(key).value=guest[key]||'');
  $('gu-editor-title').textContent=guest?'Edit guest':'Add a guest';
  $('gu-form-status').textContent='';
  dialog.showModal(); form.elements.namedItem('first_name').focus();
}
function lock(value) {
  busy=value; $('gu-fields').disabled=value;
  $('gu-save').disabled=value; $('gu-cancel').disabled=value;
  $('gu-add').disabled=value; render();
}
async function commit(query,success,close=false) {
  if(busy||loading||revoked)return;
  lock(true);
  if(close)$('gu-form-status').textContent='Saving…';
  try {
    const {data,error}=await query.select('id');
    if(revoked)return;
    if(error)throw new Error('Could not confirm the change. Close this form and refresh guests before trying again.');
    if(data?.length!==1)throw new Error('This guest changed elsewhere or was removed. Close this form and refresh before trying again.');
    if(close)dialog.close();
    window.dispatchEvent(new Event('wedsparks:guests-changed'));
    if(await refresh())message(success);
  }catch(error) {
    if(!revoked) {
      if(close)$('gu-form-status').textContent=error.message;
      else message(error.message,true);
    }
  }finally {if(!revoked)lock(false);}
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  if(busy||revoked||!form.reportValidity())return;
  const values=Object.fromEntries(keys.map(key=>[key,form.elements.namedItem(key).value.trim()]));
  for (const key of ['seating_assignment','invitation_group']) {
    const entered = values[key].toLocaleLowerCase('en-AU');
    const existing = guests.find(guest =>
      (guest[key] || '').trim().toLocaleLowerCase('en-AU') === entered
    );
    if (existing && entered) values[key] = existing[key].trim();
  }
  if(!values.first_name){$('gu-form-status').textContent='Enter a first name.';return;}
  const query=original
    ? supabase.from('couple_guests').update(values).eq('user_id',owner)
      .eq('id',original.id).eq('updated_at',original.updated_at)
    : supabase.from('couple_guests').insert({...values,user_id:owner});
  void commit(query,'Guest saved.',true);
});
$('gu-add').onclick=()=>openEditor();
$('gu-empty-add').onclick=()=>openEditor();
$('gu-cancel').onclick=()=>{if(!busy)dialog.close();};
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
$('gu-refresh').onclick=()=>{if(!busy)void refresh();};
for(const id of ['gu-search','gu-rsvp','gu-seating'])
  $(id).addEventListener(id==='gu-search'?'input':'change',()=>{limit=25;render();});
$('gu-clear').onclick=()=>{
  $('gu-search').value='';$('gu-rsvp').value='';$('gu-seating').value='';
  limit=25;render();
};
$('gu-more').onclick=()=>{limit+=25;render();};
function refreshVisible(){
  if(owner&&!busy&&!loading&&!revoked&&!dialog.open&&!document.hidden&&!form.closest('main').hidden)
    void refresh();
}
window.addEventListener('wedsparks:section-open',event=>{if(event.detail==='guests')refreshVisible();});
window.addEventListener('focus',refreshVisible);
document.addEventListener('visibilitychange',refreshVisible);
onSessionChange(({user})=>{
  if(owner&&user?.id!==owner){
    revoked=true;guests=[];dialog.close();form.reset();
    $('gu-list').replaceChildren();content.hidden=true;
    location.replace(siteUrl('login/'));
  }
});
async function start(){
  try {
    const user=await requireUser();if(!user||revoked)return;owner=user.id;
    const account=await loadAccount(user);if(revoked)return;
    if(!account.roles.includes('couple')){
      location.replace(siteUrl('supplier-account/'));return;
    }
    $('gu-loading').hidden=true;content.hidden=false;await refresh();
  }catch {
    $('gu-loading').textContent='Couldn’t load your account. Refresh the page to try again.';
  }
}
void start();
function syncGuestSuggestions() {
  if (!document.getElementById('gu-choice-style')) {
    const style = document.createElement('style');
    style.id = 'gu-choice-style';
    style.textContent = `
      .gu-choice-wrap { position:relative; min-width:0; }
      .gu-choice-wrap > input { padding-right:36px; }
      .gu-choice-arrow {
        position:absolute; right:14px; top:12px;
        color:var(--green); pointer-events:none;
      }
      .gu-choice-menu {
        position:absolute; top:calc(100% + 5px); left:0; right:0;
        z-index:30; max-height:190px; overflow-y:auto;
        padding:5px; border:1px solid #aebdb3; border-radius:9px;
        background:var(--paper,#faf8f5);
        box-shadow:0 8px 24px rgba(16,62,51,.14);
      }
      .gu-choice-option {
        padding:11px 12px; border-radius:6px;
        color:var(--green); cursor:pointer;
        font:14px/1.5 var(--sans);
        overflow-wrap:anywhere;
      }
      .gu-choice-option[aria-selected="true"],
      .gu-choice-option:hover {
        background:var(--green); color:white;
      }
      .gu-choice-new {
        border-top:1px solid var(--line); margin-top:4px;
      }
      .gu-choice-empty {
        padding:11px 12px; color:#536158;
        font:12px/1.5 var(--sans);
      }
      .gu-choice-help {
        display:block; margin-top:5px;
        color:#536158; font:11px/1.5 var(--sans);
      }
    `;
    document.head.append(style);
  }

  for (const key of ['seating_assignment','invitation_group']) {
    const input = form.elements.namedItem(key);
    input.removeAttribute('list');
    document.getElementById(`gu-suggestions-${key}`)?.remove();

    const menuId = `gu-choice-${key}`;
    const existingMenu = document.getElementById(menuId);
    if (existingMenu) {
      existingMenu.hidden = true;
      input.setAttribute('aria-expanded','false');
      input.removeAttribute('aria-activedescendant');
      continue;
    }

    const wrap = document.createElement('div');
    wrap.className = 'gu-choice-wrap';
    input.before(wrap);
    wrap.append(input);

    const arrow = document.createElement('span');
    arrow.className = 'gu-choice-arrow';
    arrow.textContent = '⌄';
    arrow.setAttribute('aria-hidden','true');

    const menu = document.createElement('div');
    menu.id = menuId;
    menu.className = 'gu-choice-menu';
    menu.setAttribute('role','listbox');
    menu.setAttribute('aria-label',
      key === 'seating_assignment' ? 'Table suggestions' : 'Invitation group suggestions');
    menu.hidden = true;

    wrap.append(arrow,menu);

    const help = document.createElement('small');
    help.id = `${menuId}-help`;
    help.className = 'gu-choice-help';
    help.textContent = 'Choose an existing value or type a new one.';
    wrap.after(help);

    input.setAttribute('role','combobox');
    input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-controls',menuId);
    input.setAttribute('aria-expanded','false');
    input.setAttribute('aria-describedby',help.id);
    input.setAttribute('autocomplete','off');

    let choices = [];
    let selected = -1;

    function close() {
      menu.hidden = true;
      selected = -1;
      input.setAttribute('aria-expanded','false');
      input.removeAttribute('aria-activedescendant');
    }

    function highlight(index) {
      selected = index;
      [...menu.querySelectorAll('[role="option"]')].forEach((option,i) => {
        option.setAttribute('aria-selected',String(i === index));
      });
      const active = menu.querySelectorAll('[role="option"]')[index];
      if (active) {
        input.setAttribute('aria-activedescendant',active.id);
        active.scrollIntoView({block:'nearest'});
      } else input.removeAttribute('aria-activedescendant');
    }

    function choose(index) {
      if (!choices[index]) return;
      input.value = choices[index].value;
      close();
    }

    function show() {
      const typed = input.value.trim();
      const search = typed.toLocaleLowerCase('en-AU');
      const names = new Map();

      for (const guest of guests) {
        const name = (guest[key] || '').trim();
        const match = name.toLocaleLowerCase('en-AU');
        if (name && !names.has(match)) names.set(match,name);
      }

      choices = [...names.values()]
        .sort((a,b) => a.localeCompare(b,'en-AU',{numeric:true}))
        .filter(name => name.toLocaleLowerCase('en-AU').includes(search))
        .map(value => ({value,label:value}));

      if (typed && !names.has(search)) {
        choices.push({value:typed,label:`Use “${typed}” — new`,isNew:true});
      }

      menu.replaceChildren();
      selected = -1;
      input.removeAttribute('aria-activedescendant');

      choices.forEach((choice,index) => {
        const option = document.createElement('div');
        option.id = `${menuId}-${index}`;
        option.className = 'gu-choice-option' + (choice.isNew ? ' gu-choice-new' : '');
        option.setAttribute('role','option');
        option.setAttribute('aria-selected','false');
        option.textContent = choice.label;
        option.addEventListener('pointerdown',event => event.preventDefault());
        option.addEventListener('click',() => choose(index));
        menu.append(option);
      });

      if (!choices.length) {
        const empty = document.createElement('div');
        empty.className = 'gu-choice-empty';
        empty.textContent = 'No saved values yet. Type one to get started.';
        menu.append(empty);
      }

      menu.hidden = false;
      input.setAttribute('aria-expanded','true');
    }

    input.addEventListener('focus',show);
    input.addEventListener('click',show);
    input.addEventListener('input',show);
    input.addEventListener('blur',close);

    input.addEventListener('keydown',event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (menu.hidden) show();
        if (!choices.length) return;
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const next = selected < 0
          ? (direction > 0 ? 0 : choices.length-1)
          : (selected + direction + choices.length) % choices.length;
        highlight(next);
      } else if (event.key === 'Enter' && !menu.hidden) {
        event.preventDefault();
        if (selected >= 0) choose(selected);
        else close();
      } else if (event.key === 'Escape' && !menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close();
      } else if (event.key === 'Tab') {
        close();
      }
    });
  }
}

// Guest spreadsheet template
{
  const style = document.createElement('style');
  style.textContent = `
    .gu-template-layout {
      display:grid; grid-template-columns:minmax(0,1fr) 240px;
      gap:28px; align-items:start; margin-top:20px;
    }
    .gu-template-main {min-width:0}
    .ct-page .gu-template-card {
      box-sizing:border-box; min-height:390px; padding:26px 22px;
      border-radius:14px; overflow:hidden; color:white;
      display:flex; flex-direction:column; justify-content:flex-end;
      background-color:#103e33;
      background-size:cover; background-position:65% center;
    }
    .ct-page .gu-template-card h3 {
      color:white; font:normal 29px/1.15 Georgia,serif;
      margin:0 0 14px;
    }
    .ct-page .gu-template-card p {
      color:white; font-size:14px; line-height:1.6; margin:0 0 22px;
    }
    .ct-page .gu-template-card button {
      background:#fff; color:#103e33; border:0;
      padding:13px 12px; width:100%; font-weight:700;
    }
    .gu-template-rules {
      background:#edf2ec; border-left:4px solid #103e33;
      padding:16px 18px; border-radius:6px; margin:18px 0;
      line-height:1.65;
    }
    .gu-template-rules p {margin:0 0 12px}
    .gu-template-rules ul {padding-left:20px;margin:0}
    .gu-template-rules li {margin:8px 0}
    .gu-template-rules code {overflow-wrap:anywhere}
    @media(max-width:1100px) {
      .gu-template-layout {grid-template-columns:minmax(0,1fr)}
      .ct-page .gu-template-card {min-height:240px;max-width:100%}
      .ct-page .gu-template-card button {width:auto;align-self:flex-start}
    }
  `;
  document.head.append(style);

  const heading = content.querySelector('.ct-heading');
  const layout = node('div', '', 'gu-template-layout');
  const main = node('div', '', 'gu-template-main');

  while (heading.nextElementSibling) main.append(heading.nextElementSibling);

  const card = node('aside', '', 'gu-template-card');
  card.setAttribute('aria-labelledby','gu-import-heading');
  card.style.backgroundImage =
    `linear-gradient(180deg,rgba(10,35,26,.15),rgba(10,35,26,.96)),url("${siteUrl('assets/background.jpg')}")`;

  const title = node('h3','Bring your guest list together');
  title.id = 'gu-import-heading';
  const copy = node('p','Start with our spreadsheet template and organise your guests in one place.');
  const button = node('button','Download guest template');
  button.id = 'gu-download-template';
  button.type = 'button';
  card.append(title,copy,button);
  layout.append(main,card);
  heading.after(layout);

  const modal = document.createElement('dialog');
  modal.id = 'gu-template-dialog';
  modal.setAttribute('aria-labelledby','gu-template-title');
  modal.innerHTML = `
    <h2 id="gu-template-title">Prepare your guest spreadsheet</h2>
    <p>Open the template in Excel or Google Sheets and add one guest per row.</p>
    <div class="gu-template-rules">
      <p><strong>Keep the column headings unchanged and save as CSV UTF-8.</strong></p>
      <ul>
        <li><strong>Only <code>first_name</code> is required.</strong>
          Leave other details blank if unknown.</li>
        <li>For <code>rsvp_status</code>, use <code>awaiting_reply</code>,
          <code>attending</code> or <code>declined</code>.</li>
        <li>For <code>invitation_status</code>, use
          <code>not_sent</code> or <code>sent</code>.</li>
        <li>Repeat the same invitation group or table name for guests who belong together.</li>
      </ul>
    </div>
    <div class="ct-actions">
      <button type="button" class="ct-primary" id="gu-template-confirm">Download CSV template</button>
      <button type="button" id="gu-template-close">Cancel</button>
    </div>`;
  content.closest('main').append(modal);

  button.onclick = () => modal.showModal();
  $('gu-template-close').onclick = () => modal.close();
  $('gu-template-confirm').onclick = () => {
    const columns = [
      'first_name','last_name','email','invitation_group',
      'seating_assignment','dietary_requirements','notes',
      'invitation_status','rsvp_status'
    ];
    const csv = '\uFEFF' + columns.join(',') + '\r\n';
    const url = URL.createObjectURL(
      new Blob([csv],{type:'text/csv;charset=utf-8;'})
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'WedSparks-guest-template.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    modal.close();
  };
}

// Guest CSV import
{
  const upload = node('button','Upload guest spreadsheet');
  upload.type = 'button';
  upload.style.marginTop = '10px';
  $('gu-download-template').after(upload);

  const modal = document.createElement('dialog');
  modal.setAttribute('aria-labelledby','gu-import-title');
  modal.style.width = 'min(860px,calc(100% - 32px))';
  modal.innerHTML = `
    <h2 id="gu-import-title">Import your guests</h2>
    <div id="gu-import-rules"></div>
    <p>Excel (.xlsx) or CSV, up to 500 guests and 2 MB per upload.
       Blank statuses become “Not sent” and “Awaiting reply”.
       Importing adds guests; it does not send invitations or update existing guests.</p>
    <label>Choose your completed spreadsheet
      <input id="gu-import-file" type="file" accept=".xlsx,.csv">
    </label>
    <p id="gu-import-status" role="status" aria-live="polite"></p>
    <div id="gu-import-preview" style="max-height:45vh;overflow:auto;margin:16px 0"></div>
    <div class="ct-actions">
      <button id="gu-import-save" type="button" class="ct-primary" disabled>Import selected guests</button>
      <button id="gu-import-close" type="button">Close</button>
    </div>`;
  content.closest('main').append(modal);
  $('gu-import-rules').append(
    $('gu-template-dialog').querySelector('.gu-template-rules').cloneNode(true)
  );

  const fileInput = $('gu-import-file');
  const status = $('gu-import-status');
  const preview = $('gu-import-preview');
  const save = $('gu-import-save');
  const close = $('gu-import-close');
  let entries = [], working = false, uncertain = false;
  const normal = value => (value || '').trim().toLocaleLowerCase('en-AU');

  function setWorking(value) {
    working = value;
    lock(value);
    fileInput.disabled = value;
    close.disabled = value;
    preview.querySelectorAll('input,select').forEach(input => {
      input.disabled = value || input.dataset.invalid === 'true';
    });
    updateCount();
  }

  function updateCount() {
    const count = entries.filter(entry => entry.selected && !entry.errors.length).length;
    save.textContent = `Import ${count} selected ${count === 1 ? 'guest' : 'guests'}`;
    save.disabled = working || uncertain || !count;
  }

  function parseCSV(text) {
    text = text.replace(/^\uFEFF/,'');
    const rows = [];
    let row = [], value = '', quoted = false, closed = false;
    const field = () => { row.push(value.trim()); value = ''; closed = false; };
    const finish = () => { field(); rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i+1] === '"') { value += '"'; i++; }
          else { quoted = false; closed = true; }
        } else value += c;
      } else if (c === ',') {
        field();
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i+1] === '\n') i++;
        finish();
      } else if (closed) {
        if (c !== ' ' && c !== '\t')
          throw new Error('Invalid CSV quoting. Save the spreadsheet again as CSV UTF-8.');
      } else if (c === '"') {
        if (value.length) throw new Error('Invalid CSV quoting. Save again as CSV UTF-8.');
        quoted = true;
      } else value += c;
    }
    if (quoted) throw new Error('A quoted field is unfinished. Save again as CSV UTF-8.');
    if (value.length || row.length || closed) finish();
    return rows;
  }

  function canonicalise(values, existing) {
    for (const key of ['invitation_group','seating_assignment']) {
      const match = existing.find(guest =>
        normal(guest[key]) && normal(guest[key]) === normal(values[key]));
      if (match) values[key] = match[key].trim();
    }
  }

  function duplicate(values, existing) {
    return existing.some(guest =>
      (normal(guest.first_name) === normal(values.first_name) &&
       normal(guest.last_name) === normal(values.last_name)) ||
      (normal(values.email) && normal(guest.email) === normal(values.email))
    );
  }

  function warningsFor(entry, index) {
    const warnings = [];
    if (duplicate(entry.values,guests))
      warnings.push('Possible existing guest: matching name or email.');
    if (entries.some((other,i) => i !== index && duplicate(entry.values,[other.values])))
      warnings.push('Matching name or email elsewhere in this file.');
    return warnings.join(' ');
  }

  function drawPreview() {
    preview.replaceChildren();
    entries.forEach(entry => {
      const item = node('div','','ct-row');
      item.style.display = 'block';
      item.style.marginBottom = '10px';
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:12px';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.style.cssText = 'width:18px;min-height:18px;flex:0 0 18px';
      checkbox.checked = entry.selected;
      checkbox.disabled = !!entry.errors.length;
      checkbox.dataset.invalid = String(!!entry.errors.length);
      checkbox.onchange = () => {
        entry.selected = checkbox.checked;
        updateCount();
      };
      label.append(checkbox,node('strong',
        `Row ${entry.row}: ${entry.values.first_name || '(missing first name)'} ${entry.values.last_name}`));
      item.append(label);

      const problems = entry.errors.length
        ? entry.errors.join(' ')
        : entry.warning;
      if (problems) {
        const note = node('p',problems);
        note.style.color = entry.errors.length ? '#9b2727' : '#75500b';
        item.append(note);
      }
      const details = node('details','');
      details.append(node('summary','Review guest details'));
      for (const key of keys) {
        details.append(node('p',
          `${key.replaceAll('_',' ')}: ${entry.values[key] || '—'}`));
      }
      item.append(details);
      preview.append(item);
    });
    updateCount();
  }

  upload.onclick = () => {
    if (!owner || busy || loading || revoked) return;
    entries = [];
    uncertain = false;
    fileInput.disabled = false;
    fileInput.value = '';
    preview.replaceChildren();
    status.textContent = 'Choose a file to preview. Nothing is saved until you confirm.';
    updateCount();
    modal.showModal();
  };
  close.onclick = () => { if (!working) modal.close(); };
  modal.addEventListener('cancel',event => {
    if (working) event.preventDefault();
  });
  modal.addEventListener('close',() => {
    entries = [];
    fileInput.value = '';
    preview.replaceChildren();
  });
  onSessionChange(({user}) => {
    if (owner && user?.id !== owner) modal.close();
  });

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file || working || revoked) return;
    entries = [];
    uncertain = false;
    preview.replaceChildren();
    setWorking(true);
    status.textContent = 'Checking your spreadsheet…';
    try {
      const rows = await readGuestSpreadsheet(file,parseCSV);
      if (revoked) return;
      const headers = rows.shift() || [];
      if (headers.length !== keys.length ||
          new Set(headers).size !== keys.length ||
          headers.some(header => !keys.includes(header))) {
        throw new Error('Column headings do not match. Use the downloaded template and keep all nine headings unchanged.');
      }
      const records = rows.map((cells,i) => ({cells,row:i+2}))
        .filter(record => record.cells.some(value => value !== ''));
      if (!records.length) throw new Error('This file contains no guests.');
      if (records.length > 500) throw new Error('Use up to 500 guests per file. Split larger lists into separate files.');
      if (!await refresh()) throw new Error('Could not check existing guests. Close and try again.');
      if (revoked) return;

      const emailCheck = document.createElement('input');
      emailCheck.type = 'email';
      const existing = [...guests];
      entries = records.map(({cells,row}) => {
        const values = Object.fromEntries(headers.map((key,i) => [key,cells[i] || '']));
        const errors = [];
        if (cells.length !== headers.length) errors.push('Wrong number of columns.');
        if (!values.first_name) errors.push('First name is required.');
        for (const [key,, ,max] of fields) {
          if (values[key].length > max) errors.push(`${key}: maximum ${max} characters.`);
        }
        emailCheck.value = values.email;
        if (values.email && (!emailCheck.checkValidity() || /[\r\n]/.test(values.email)))
          errors.push('Email address is invalid.');
        values.invitation_status = normal(values.invitation_status).replace(/\s+/g,'_') || 'not_sent';
        values.rsvp_status = normal(values.rsvp_status).replace(/\s+/g,'_') || 'awaiting_reply';
        if (!['not_sent','sent'].includes(values.invitation_status))
          errors.push('Invitation status must be not_sent or sent.');
        if (!['awaiting_reply','attending','declined'].includes(values.rsvp_status))
          errors.push('RSVP must be awaiting_reply, attending or declined.');
        if (Object.values(values).some(value => value.includes('\0')))
          errors.push('Contains an unsupported character.');
        canonicalise(values,existing);
        if (!errors.length) existing.push(values);
        return {values,row,errors,selected:false,warning:''};
      });
      entries.forEach((entry,index) => {
        entry.warning = warningsFor(entry,index);
        entry.selected = !entry.errors.length && !entry.warning;
      });
      drawPreview();
      status.textContent =
        `${entries.length} rows reviewed. Invalid rows cannot be imported. Possible duplicates are unchecked; select them only if they are different people. Expand a row to review all details.`;
    } catch (error) {
      entries = [];
      status.textContent = error instanceof TypeError
        ? 'Could not read this spreadsheet. Save it as an Excel (.xlsx) file and try again.'
        : error.message;
    } finally {
      if (!revoked) setWorking(false);
    }
  };

  save.onclick = async () => {
    if (working || busy || loading || revoked || uncertain) return;
    const selected = entries.filter(entry => entry.selected && !entry.errors.length);
    if (!selected.length) return;
    setWorking(true);
    status.textContent = 'Rechecking your guest list…';
    let attempted = false;
    try {
      if (!await refresh()) throw new Error('Could not refresh guests. Nothing was imported. Try again.');
      if (revoked) return;
      let changed = false;
      entries.forEach((entry,index) => {
        const warning = warningsFor(entry,index);
        if (warning !== entry.warning) {
          entry.warning = warning;
          if (warning) entry.selected = false;
          changed = true;
        }
      });
      if (changed) {
        drawPreview();
        status.textContent = 'Your guest list changed. Review the updated duplicate warnings, then confirm again.';
        return;
      }
      const payload = selected.map(entry => {
        const values = {...entry.values};
        canonicalise(values,guests);
        return {...values,user_id:owner};
      });
      status.textContent = `Importing ${payload.length} guests…`;
      attempted = true;
      const {error} = await supabase.from('couple_guests').insert(payload);
      if (revoked) return;
      if (error) throw error;

      modal.close();
      window.dispatchEvent(new Event('wedsparks:guests-changed'));
      const refreshed = await refresh();
      if (!revoked) message(refreshed
        ? `${payload.length} guests imported. No invitations were sent.`
        : `${payload.length} guests imported. Use Refresh guests to reload the list.`);
    } catch (error) {
      if (!revoked) {
        uncertain = attempted;
        status.textContent = attempted
          ? 'Could not confirm the import. Close this window and refresh your guest list before uploading again, to avoid adding guests twice.'
          : error.message;
        if (attempted) fileInput.disabled = true;
      }
    } finally {
      if (!revoked) {
        setWorking(false);
        if (uncertain) fileInput.disabled = true;
      }
    }
  };
}

// Excel guest spreadsheets
const guestExcelColumns = [
  ['first_name','First name *',22],
  ['last_name','Last name',22],
  ['email','Email',34],
  ['invitation_group','Invitation group',26],
  ['seating_assignment','Table / seating',24],
  ['dietary_requirements','Dietary requirements',34],
  ['notes','Private notes',40],
  ['invitation_status','Invitation status',22],
  ['rsvp_status','RSVP status',22]
];

let guestExcelLoading;
function loadGuestExcel() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (!guestExcelLoading) {
    guestExcelLoading = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = siteUrl('shared/vendor/exceljs-4.4.0.min.js');
      script.onload = () => window.ExcelJS
        ? resolve(window.ExcelJS)
        : reject(new Error('Excel tools could not load. Refresh and try again.'));
      script.onerror = () => {
        script.remove();
        reject(new Error('Excel tools could not load. Refresh and try again.'));
      };
      document.head.append(script);
    }).catch(error => { guestExcelLoading = null; throw error; });
  }
  return guestExcelLoading;
}

async function readGuestSpreadsheet(file,parseCSV) {
  if (!/\.(xlsx|csv)$/i.test(file.name))
    throw new Error('Choose an Excel (.xlsx) file or CSV.');
  if (file.size > 2 * 1024 * 1024)
    throw new Error('Please use a file smaller than 2 MB.');

  const buffer = await file.arrayBuffer();
  let rows;
  if (/\.csv$/i.test(file.name)) {
    rows = parseCSV(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
  } else {
    const Excel = await loadGuestExcel();
    const workbook = new Excel.Workbook();
    try { await workbook.xlsx.load(buffer); }
    catch { throw new Error('Cannot open this workbook. Save an unencrypted .xlsx copy and try again.'); }
    const sheet = workbook.getWorksheet('Guests');
    if (!sheet) throw new Error('The workbook needs the Guests sheet from our template.');
    if (sheet.rowCount > 501)
      throw new Error('Keep guests within rows 2–501. Use another file for additional guests.');

    rows = [];
    for (let r = 1; r <= Math.max(1,sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      row.eachCell(cell => {
        if (cell.col > 9 && cell.value !== null)
          throw new Error(`Row ${r}: unexpected data beyond the nine template columns.`);
      });
      const values = [];
      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c), value = cell.value;
        if (value && typeof value === 'object' &&
            ('formula' in value || 'sharedFormula' in value || 'error' in value))
          throw new Error(`Cell ${cell.address}: use a plain value, not a formula or spreadsheet error.`);
        if (value instanceof Date)
          throw new Error(`Cell ${cell.address}: use text rather than a date.`);
        values.push(cell.text.trim());
      }
      rows.push(values);
    }
  }
  if (rows.length) {
    const mapping = new Map(guestExcelColumns.flatMap(([key,label]) => [
      [key,key],[label.toLowerCase(),key]
    ]));
    rows[0] = rows[0].map(value =>
      mapping.get(value.trim().toLowerCase()) || value.trim());
  }
  return rows;
}

{
  const rules = `
    <p><strong>Fill in the Guests sheet, keep its headings unchanged,
    and save as Excel (.xlsx). No CSV conversion needed.</strong></p>
    <ul>
      <li><strong>Only First name is required.</strong> Add one person per row.</li>
      <li>Choose RSVP and invitation statuses from the dropdowns.
          Blank values mean Awaiting reply and Not sent.</li>
      <li>Choose an existing table or invitation group, or type a new name.
          Repeat the name for people who belong together.</li>
      <li>Names, email, dietary requirements and notes are free text.
          Use up to 500 guests per workbook.</li>
    </ul>`;
  document.querySelectorAll(
    '#gu-template-dialog .gu-template-rules, #gu-import-rules .gu-template-rules'
  ).forEach(element => { element.innerHTML = rules; });

  const modal = $('gu-template-dialog');
  modal.querySelector('h2 + p').textContent =
    'Use the dropdowns in Excel, then upload the completed workbook here.';
  const download = $('gu-template-confirm');
  download.textContent = 'Download Excel template';

  const feedback = node('p','');
  feedback.setAttribute('role','status');
  download.closest('.ct-actions').before(feedback);

  download.onclick = async () => {
    if (busy || loading || revoked || !owner) return;
    download.disabled = true;
    feedback.textContent = 'Preparing your Excel template…';
    try {
      if (!await refresh()) throw new Error('Could not load your table and group suggestions. Please try again.');
      const Excel = await loadGuestExcel();
      if (revoked) return;

      const workbook = new Excel.Workbook();
      workbook.creator = 'WedSparks';
      const sheet = workbook.addWorksheet('Guests');
      const instructions = workbook.addWorksheet('Instructions');
      const choices = workbook.addWorksheet('Choices');
      sheet.views = [{state:'frozen',ySplit:1}];
      sheet.columns = guestExcelColumns.map(([,header,width]) => ({header,width}));
      sheet.autoFilter = 'A1:I501';
      sheet.getRow(1).height = 32;
      sheet.getRow(1).eachCell(cell => {
        cell.font = {name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};
        cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF103E33'}};
        cell.alignment = {vertical:'middle',wrapText:true};
      });
      sheet.getCell('A1').note = 'Required. Enter one guest per row.';

      const unique = key => {
        const values = new Map();
        guests.forEach(guest => {
          const value = (guest[key] || '').trim();
          if (value) values.set(value.toLocaleLowerCase('en-AU'),value);
        });
        return [...values.values()].sort((a,b)=>a.localeCompare(b,'en-AU',{numeric:true}));
      };
      const lists = [
        ['InvitationOptions',['Not sent','Sent']],
        ['RSVPOptions',['Awaiting reply','Attending','Declined']],
        ['GroupOptions',unique('invitation_group')],
        ['TableOptions',unique('seating_assignment')]
      ];
      lists.forEach(([name,values],index) => {
        values.forEach((value,i) => { choices.getCell(i+1,index+1).value = value; });
        if (values.length) {
          const letter = String.fromCharCode(65+index);
          workbook.definedNames.add(
            `Choices!$${letter}$1:$${letter}$${values.length}`,name
          );
        }
      });
      choices.state = 'veryHidden';

      for (let r = 2; r <= 501; r++) {
        sheet.getRow(r).height = 24;
        for (let c = 1; c <= 9; c++) {
          const cell = sheet.getCell(r,c);
          cell.numFmt = '@';
          cell.font = {name:'Calibri',size:11,color:{argb:'FF173E33'}};
          cell.alignment = {vertical:'top',wrapText:true};
          cell.fill = {
            type:'pattern',pattern:'solid',
            fgColor:{argb:c === 1 ? 'FFFFF3D6' : r % 2 ? 'FFF3F6F2' : 'FFFFFFFF'}
          };
        }
        for (const [column,name,strict,available] of [
          [8,'InvitationOptions',true,true],
          [9,'RSVPOptions',true,true],
          [4,'GroupOptions',false,lists[2][1].length],
          [5,'TableOptions',false,lists[3][1].length]
        ]) {
          if (!available) continue;
          sheet.getCell(r,column).dataValidation = {
            type:'list',allowBlank:true,formulae:[name],
            showErrorMessage:strict,errorStyle:'stop',
            errorTitle:'Choose a listed status',
            error:'Please choose a value from the dropdown.',
            showInputMessage:true,promptTitle:strict ? 'Choose a status' : 'Choose or type',
            prompt:strict ? 'Use the dropdown or leave blank.' : 'Select a saved value or type a new name.'
          };
        }
      }

      instructions.getColumn(1).width = 100;
      const guidance = [
        'WEDSPARKS · YOUR GUEST LIST',
        'Complete the Guests sheet. First name is the only required field.',
        'Enter one person per row, using rows 2–501. Keep the nine headings unchanged.',
        'RSVP status: use the dropdown. Blank means Awaiting reply.',
        'Invitation status: use the dropdown. Blank means Not sent.',
        'Groups and tables: choose a saved suggestion or type a new name.',
        'Suggestions reflect your guest list when this template was downloaded.',
        'Repeat a group or table name for guests who belong together.',
        'Names, email, dietary requirements and private notes accept free text.',
        'Save this file as Excel (.xlsx), then upload it to WedSparks.',
        'Review the preview and duplicate warnings before confirming import.',
        'Importing adds guests. It does not send invitations or replace existing guests.'
      ];
      guidance.forEach((text,i) => {
        const cell = instructions.getCell(i+1,1);
        cell.value = text;
        cell.font = {name:'Calibri',size:i ? 12 : 18,bold:!i,color:{argb:'FF103E33'}};
        cell.alignment = {wrapText:true,vertical:'middle'};
        instructions.getRow(i+1).height = i ? 36 : 46;
      });

      const data = await workbook.xlsx.writeBuffer();
      if (revoked) return;
      const url = URL.createObjectURL(new Blob([data],{
        type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'WedSparks-guest-template.xlsx';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      feedback.textContent = '';
      modal.close();
    } catch (error) {
      feedback.textContent = error.message || 'Could not create the template. Please try again.';
    } finally {
      download.disabled = false;
    }
  };
}

// Simple invitation flow
{
  const launch = node('button','Send invitations');
  launch.type = 'button';
  launch.className = 'ct-primary';
  launch.style.marginLeft = '10px';
  $('gu-refresh').after(launch);

  const modal = document.createElement('dialog');
  modal.setAttribute('aria-labelledby','gi-title');
  modal.style.width = 'min(760px,calc(100% - 32px))';
  modal.innerHTML = `
    <h2 id="gi-title">Send invitations</h2>
    <p>Choose who should receive an email, then decide how they can reply.</p>
    <fieldset id="gi-fields">
      <div class="ct-form-grid">
        <label>Show guests
          <select id="gi-status">
            <option value="not_sent">Not sent</option>
            <option value="sent">Sent</option>
            <option value="">All guests</option>
          </select>
        </label>
        <label>Find someone
          <input id="gi-search" type="search" placeholder="Name, email or family">
        </label>
      </div>
      <div id="gi-people" style="max-height:280px;overflow:auto"></div>
      <p id="gi-count" aria-live="polite"></p>
      <label>How can they reply?
        <select id="gi-mode">
          <option value="individual">Only for themselves</option>
          <option value="family">For themselves or their family/group</option>
        </select>
      </label>
      <p id="gi-mode-help" class="ct-help"></p>
      <button id="gi-preview" type="button">Preview RSVP page</button>
      <section id="gi-example" hidden style="margin:20px 0;padding:20px;background:#edf2ec;border-radius:12px">
        <h3>Example RSVP page</h3>
        <label>Preview as <select id="gi-preview-person"></select></label>
        <p class="ct-help">Example only — this does not save a response.</p>
        <div id="gi-example-content"></div>
      </section>
    </fieldset>
    <p id="gi-message" role="status" aria-live="polite"></p>
    <p class="ct-help">Email sending is being connected. You can review recipients and the RSVP example now.</p>
    <div class="ct-actions">
      <button type="button" class="ct-primary" disabled>Send invitations — coming soon</button>
      <button id="gi-close" type="button">Close</button>
    </div>`;
  content.closest('main').append(modal);
  const selected = new Set();
  let opening = false;

  function updateSelection() {
    $('gi-count').textContent = `${selected.size} email ${selected.size === 1 ? 'recipient' : 'recipients'} selected`;
    $('gi-preview').disabled = !selected.size;
    $('gi-example').hidden = true;
    $('gi-mode-help').textContent = $('gi-mode').value === 'family'
      ? 'Each recipient can reply for people in their invitation group only. Guests without a group reply only for themselves.'
      : 'Each recipient sees and answers only their own RSVP.';
  }

  function renderRecipients() {
    const list = $('gi-people');
    list.replaceChildren();
    const query = $('gi-search').value.trim().toLocaleLowerCase();
    const invitationStatus = $('gi-status').value;
    const matches = guests.filter(guest =>
      (!invitationStatus || guest.invitation_status === invitationStatus) &&
      (!query || `${guest.first_name} ${guest.last_name} ${guest.email} ${guest.invitation_group}`
        .toLocaleLowerCase().includes(query))
    ).sort((a,b)=>a.first_name.localeCompare(b.first_name)||a.last_name.localeCompare(b.last_name));

    for (const guest of matches) {
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid #dedbd6';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.style.cssText = 'width:18px;min-height:18px;flex:0 0 18px;margin-top:4px';
      checkbox.checked = selected.has(guest.id);
      checkbox.disabled = !guest.email?.trim();
      checkbox.onchange = () => {
        if (checkbox.checked) selected.add(guest.id);
        else selected.delete(guest.id);
        updateSelection();
      };
      const text = node('span','');
      text.append(node('strong',`${guest.first_name} ${guest.last_name}`));
      const detail = node('span',
        `${guest.email || 'Add an email address to send directly'}${guest.invitation_group ? ' · '+guest.invitation_group : ''} · ${guest.invitation_status === 'sent' ? 'Sent' : 'Not sent'}`);
      detail.style.cssText = 'display:block;font-weight:normal;font-size:13px;overflow-wrap:anywhere';
      text.append(detail);
      label.append(checkbox,text);
      list.append(label);
    }
    if (!matches.length) list.append(node('p','No guests match these filters.'));
    updateSelection();
  }

  function renderExample() {
    const guest = guests.find(person=>person.id === $('gi-preview-person').value);
    const box = $('gi-example-content');
    box.replaceChildren();
    if (!guest) return;
    const group = (guest.invitation_group || '').trim().toLocaleLowerCase();
    const people = $('gi-mode').value === 'family' && group
      ? guests.filter(person=>(person.invitation_group || '').trim().toLocaleLowerCase() === group)
      : [guest];
    box.append(node('h3','We’d love to celebrate with you'));
    if (people.length > 1) {
      box.append(node('p','Who are you replying for? Select yourself or family members.'));
      for (const person of people) {
        box.append(node('p',`☐ ${person.first_name} ${person.last_name}`));
      }
    } else box.append(node('p',`${guest.first_name} ${guest.last_name}`));
    box.append(node('p','Will you be attending?'));
    box.append(node('strong','Yes, I’ll be there'));
    box.append(node('p','Dietary requirements (optional)'));
    const submit = node('button','Submit reply');
    submit.type = 'button';
    submit.disabled = true;
    submit.className = 'ct-primary';
    box.append(submit,node('p','Existing replies are preserved. Nothing changes until the guest submits.'));
  }

  launch.onclick = async () => {
    if (busy || loading || revoked || !owner) return;
    if (!await ensureInvitationReady(() => launch.onclick())) return;
    selected.clear();
    $('gi-status').value = 'not_sent';
    $('gi-search').value = '';
    $('gi-mode').value = 'individual';
    $('gi-example').hidden = true;
    $('gi-people').replaceChildren();
    $('gi-preview-person').replaceChildren();
    opening = true;
    lock(true);
    $('gi-fields').disabled = true;
    $('gi-close').disabled = true;
    $('gi-message').textContent = 'Loading guests…';
    modal.showModal();
    try {
      const success = await refresh();
      if (revoked) return;
      if (!success) throw new Error('Could not load guests. Close and try again.');
      renderRecipients();
      $('gi-fields').disabled = false;
      $('gi-message').textContent = 'Guests without their own email can reply through their family’s invitation.';
    } catch (error) {
      if (!revoked) $('gi-message').textContent = error.message;
    } finally {
      opening = false;
      if (!revoked) { lock(false); $('gi-close').disabled = false; }
    }
  };
  $('gi-status').onchange = renderRecipients;
  $('gi-search').oninput = renderRecipients;
  $('gi-mode').onchange = updateSelection;
  $('gi-preview').onclick = () => {
    const select = $('gi-preview-person');
    select.replaceChildren();
    guests.filter(guest=>selected.has(guest.id)).forEach(guest =>
      select.add(new Option(`${guest.first_name} ${guest.last_name}`,guest.id)));
    $('gi-example').hidden = false;
    renderExample();
  };
  $('gi-preview-person').onchange = renderExample;
  $('gi-close').onclick = () => modal.close();
  modal.addEventListener('cancel',event=>{if(opening)event.preventDefault();});
  onSessionChange(({user})=>{
    if (owner && user?.id !== owner) {
      modal.close();
      selected.clear();
      $('gi-people').replaceChildren();
      $('gi-preview-person').replaceChildren();
      $('gi-example-content').replaceChildren();
    }
  });
}

async function openGuestInvitationAccess(guest) {
  if (busy || loading || revoked || !owner) return;
  if (!await ensureInvitationReady(() => openGuestInvitationAccess(guest))) return;
  const shareOwner = owner;
  let working = false, activeLink = null, confirming = false;

  const modal = document.createElement('dialog');
  const title = node('h2',`Share invitation · ${guest.first_name} ${guest.last_name || ''}`);
  title.id = 'gi-access-title';
  modal.setAttribute('aria-labelledby',title.id);

  const fields = document.createElement('fieldset');
  fields.style.cssText = 'border:0;padding:0;margin:0;min-width:0';
  const label = node('label','Who can this guest reply for?');
  const mode = document.createElement('select');
  mode.style.cssText =
    'display:block;width:100%;padding:12px;margin:8px 0 14px;border:1px solid #bdc8be;border-radius:8px;background:white;color:#173e33;font:inherit';
  mode.add(new Option('Only themselves','individual'));
  if (guest.invitation_group?.trim()) {
    mode.add(new Option(`Their invitation group: ${guest.invitation_group}`,'family'));
  }
  label.append(mode);

  const members = node('p','');
  const copy = node('button','Copy invitation link','ct-primary');
  copy.type = 'button';
  const address = document.createElement('input');
  address.type = 'text';
  address.readOnly = true;
  address.hidden = true;
  address.setAttribute('aria-label','Private invitation link');
  address.style.cssText = 'width:100%;padding:10px;margin:14px 0';
  address.onclick = () => address.select();

  const feedback = node('p','');
  feedback.setAttribute('role','status');
  const disable = node('button','Disable invitation access');
  disable.type = 'button';
  disable.hidden = true;
  disable.style.cssText = 'display:block;margin:18px 0';
  const close = node('button','Close');
  close.type = 'button';

  // Invitation sharing channels
  const shareRow = node('div','');
  shareRow.hidden = true;
  shareRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin:14px 0';

  const whatsapp = node('button','WhatsApp');
  const sms = node('button','Text message');
  const deviceShare = node('button','Share…');
  for (const button of [whatsapp,sms,deviceShare]) button.type = 'button';
  deviceShare.hidden = typeof navigator.share !== 'function';
  // Invitation channel icons
  const messenger = node('button','Messenger');
  const telegram = node('button','Telegram');
  const email = node('button','Email');
  for (const button of [messenger,telegram,email]) button.type = 'button';

  function channelIcon(button,label,colour,drawing) {
    button.replaceChildren();
    button.setAttribute('aria-label',label);
    button.title = label;
    button.classList.add('gi-channel');
    button.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:7px;min-width:72px;padding:8px;border:0!important;background:transparent!important;box-shadow:none!important;color:#173e33';
    const circle = document.createElement('span');
    circle.style.cssText =
      `display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:${colour};color:white`;
    circle.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        width="26" height="26" aria-hidden="true" focusable="false">${drawing}</svg>`;
    const caption = node('span',label);
    caption.style.cssText = 'font:600 12px/1.3 Arial,sans-serif';
    button.append(circle,caption);
  }

  channelIcon(whatsapp,'WhatsApp','#128c4a',
    '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.3-4.1A8 8 0 1 1 20 11.5Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m8.4 7.1 1.4 2.7-1 1.1c.9 1.7 2 2.8 3.8 3.6l1-1.2 2.8 1.3c-.2 1.9-1.6 2.5-3.2 2-3.4-1.1-6-3.7-7-6.5-.5-1.4.2-2.8 2.2-3Z" fill="currentColor"/>');

  channelIcon(messenger,'Messenger','#0866ff',
    '<path d="M12 3C6.5 3 2 6.8 2 11.6c0 2.6 1.3 4.8 3.5 6.4v3l3.1-1.7c1.1.3 2.2.5 3.4.5 5.5 0 10-3.7 10-8.2S17.5 3 12 3Z" fill="currentColor"/><path d="m5.8 14 5-5.3 3.1 2.4 4.4-2.4-4.9 5.3-3.1-2.4Z" fill="#0866ff"/>');
  messenger.title = 'Copy invitation and open Messenger to paste it into a chat';

  channelIcon(telegram,'Telegram','#1689b9',
    '<path d="M21.3 4.2 18 20c-.2 1-1 1.2-1.8.7l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.2L17.7 6c.4-.4-.1-.6-.6-.3L5.3 13.1 1.2 11.8c-.9-.3-.9-.9.2-1.3L20 3.3c.9-.3 1.6.2 1.3.9Z" fill="currentColor"/>');

  channelIcon(email,'Email','#214c3e',
    '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m3 6 9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.8"/>');

  channelIcon(sms,'Text','#214c3e',
    '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 3-2Z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 9h10M7 13h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>');

  channelIcon(deviceShare,'Share','#214c3e',
    '<path d="m12 15 0-12m-4 4 4-4 4 4M6 10H4v11h16V10h-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');

  if (!document.getElementById('gi-channel-style')) {
    const style = document.createElement('style');
    style.id = 'gi-channel-style';
    style.textContent = `
      #gu-content button.gi-channel {
        display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:7px;min-width:78px;
        padding:10px 8px;background:transparent;color:#173e33;
        border:0;border-radius:10px;box-shadow:none;
      }
      #gu-content button.gi-channel:hover {
        background:transparent;color:#173e33;opacity:.8;
      }
      #gu-content button.gi-channel:focus-visible {
        outline:3px solid #b78b32;outline-offset:3px;
      }
      #gu-content button.gi-channel[hidden] {display:none!important}
    `;
    document.head.append(style);
  }

  shareRow.append(whatsapp,messenger,telegram,email,sms,deviceShare);

  messenger.onclick = async () => {
    const payload = sharePayload();
    if (!payload) return;
    const message = `${payload.text}\n\n${payload.url}`;
    // Start copying during the click, before opening another window.
    const copying = navigator.clipboard?.writeText(message);
    window.open('https://www.messenger.com/','_blank','noopener,noreferrer');
    try {
      if (!copying) throw new Error();
      await copying;
      if (valid()) feedback.textContent =
        'Invitation copied. Choose a chat in Messenger, paste it and send.';
    } catch {
      if (!valid()) return;
      address.hidden = false;
      address.focus();
      address.select();
      feedback.textContent =
        'Copy this link, then paste it into your Messenger conversation.';
    }
  };

  telegram.onclick = () => {
    const payload = sharePayload();
    if (!payload) return;
    const url = new URL('https://t.me/share/url');
    url.searchParams.set('url',payload.url);
    url.searchParams.set('text',payload.text);
    window.open(url.href,'_blank','noopener,noreferrer');
    feedback.textContent = 'Choose the recipient and send in Telegram.';
  };

  email.onclick = () => {
    const payload = sharePayload();
    if (!payload) return;
    location.href = 'mailto:?subject=' +
      encodeURIComponent(payload.title) +
      '&body=' + encodeURIComponent(`${payload.text}\n\n${payload.url}`);
    feedback.textContent =
      'Choose the recipient in your email app. If it does not open, copy the invitation link.';
  };

  function sharePayload() {
    if (working || !valid() || !activeLink || !address.value) return null;
    return {
      title:'Our wedding invitation',
      text:"We'd love to celebrate with you! Open your invitation and let us know if you can join us.",
      url:address.value
    };
  }

  whatsapp.onclick = () => {
    const payload = sharePayload();
    if (!payload) return;
    const text = `${payload.text}\n\n${payload.url}`;
    window.open(
      'https://wa.me/?text=' + encodeURIComponent(text),
      '_blank',
      'noopener,noreferrer'
    );
    feedback.textContent = 'Choose the recipient and send your invitation in WhatsApp.';
  };

  sms.onclick = () => {
    const payload = sharePayload();
    if (!payload) return;
    const text = `${payload.text}\n\n${payload.url}`;
    const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    location.href = 'sms:' + (apple ? '&' : '?') +
      'body=' + encodeURIComponent(text);
    feedback.textContent =
      'Choose the recipient in your messaging app. If it does not open, use Copy invitation link.';
  };

  deviceShare.onclick = async () => {
    const payload = sharePayload();
    if (!payload) return;
    deviceShare.disabled = true;
    try {
      await navigator.share(payload);
      if (valid()) feedback.textContent = 'Finish sharing in your chosen app.';
    } catch (error) {
      if (valid()) feedback.textContent = error.name === 'AbortError'
        ? 'Sharing cancelled.'
        : 'Sharing is unavailable here. Use Copy invitation link instead.';
    } finally {
      deviceShare.disabled = false;
    }
  };

  // Visual invitation sent confirmation
  let sentGuestIds = [];
  const sentCard = node('section','');
  sentCard.hidden = true;
  sentCard.style.cssText =
    'padding:0;margin:12px 0;border:0;background:transparent';

  const sentHeading = node('div','');
  sentHeading.style.cssText = 'display:flex;align-items:center;gap:12px';
  const envelope = node('span','');
  envelope.style.cssText =
    'display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#214c3e;color:white;flex-shrink:0';
  envelope.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>';
  const sentTitle = node('strong','Invitation sent?');
  sentHeading.append(envelope,sentTitle);

  const sentNames = node('p','');
  sentNames.style.cssText = 'margin:12px 0;overflow-wrap:anywhere';
  const sentHelp = node('p','Mark these guests as invited once you have sent their invitation.');
  sentHelp.style.cssText = 'font-size:14px;margin:8px 0 12px';
  const markSent = node('button','✓ Mark as sent','ct-primary');
  markSent.type = 'button';
  const sentFeedback = node('p','');
  sentFeedback.setAttribute('role','status');
  sentFeedback.style.cssText = 'font-size:14px;margin:8px 0 0';
  sentCard.append(sentHeading,markSent,sentFeedback);

  async function loadSentCard() {
    sentCard.hidden = true;
    sentGuestIds = [];
    sentFeedback.textContent = '';
    const linkId = activeLink?.id;
    if (!linkId || !valid()) return;

    try {
      const mapping = await supabase.from('couple_rsvp_link_guests')
        .select('guest_id')
        .eq('user_id',shareOwner).eq('link_id',linkId);
      if (mapping.error || !mapping.data?.length) throw new Error();

      const ids = mapping.data.map(row => row.guest_id);
      const result = await supabase.from('couple_guests')
        .select('id,first_name,last_name,invitation_status')
        .eq('user_id',shareOwner).in('id',ids).order('first_name');
      if (result.error || result.data?.length !== ids.length) throw new Error();
      if (!valid() || activeLink?.id !== linkId) return;

      sentGuestIds = ids;
      sentNames.textContent = result.data.map(person =>
        `${person.first_name} ${person.last_name || ''}`.trim()
      ).join(', ');
      const allSent = result.data.every(person => person.invitation_status === 'sent');
      sentTitle.textContent = allSent ? '✓ Already invited' : 'Invitation sent?';
      sentHelp.hidden = allSent;
      markSent.hidden = allSent;
      sentCard.hidden = false;
    } catch {
      if (!valid() || activeLink?.id !== linkId) return;
      sentCard.hidden = false;
      sentTitle.textContent = 'Invitation status unavailable';
      sentNames.textContent = '';
      sentHelp.hidden = true;
      markSent.hidden = true;
      sentFeedback.textContent = 'Prepare the invitation link again to retry.';
    }
  }

  markSent.onclick = async () => {
    if (working || !valid() || !activeLink || !sentGuestIds.length) return;
    setWorking(true);
    sentFeedback.textContent = 'Updating…';
    try {
      const {data,error} = await supabase.from('couple_guests')
        .update({invitation_status:'sent'})
        .eq('user_id',shareOwner).in('id',sentGuestIds)
        .select('id');
      if (!valid()) return;
      if (error || data?.length !== sentGuestIds.length) {
        throw new Error('Could not confirm every update. Refresh the guest list before trying again.');
      }

      sentTitle.textContent = '✓ Already invited';
      sentHelp.hidden = true;
      markSent.hidden = true;
      sentFeedback.textContent = '';
      window.dispatchEvent(new Event('wedsparks:guests-changed'));
      const refreshed = await refresh();
      if (valid() && !refreshed) {
        sentFeedback.textContent = 'Saved. Refresh the guest list to see the updated totals.';
      }
    } catch (error) {
      if (valid()) sentFeedback.textContent = error.message;
    } finally {
      if (valid()) setWorking(false);
    }
  };

  const copyRow = node('div','');
  copyRow.style.cssText = 'display:flex;align-items:center;gap:16px;flex-wrap:wrap';
  sentCard.style.cssText = 'border:0;padding:0;margin:0;background:transparent';
  sentHeading.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px';
  envelope.hidden = true;
  sentFeedback.style.margin = '0';
  copyRow.append(copy,sentCard);
  fields.append(label,members,copyRow,address,shareRow,disable);
  modal.append(title,fields,feedback,close);
  content.closest('main').append(modal);

  const valid = () =>
    modal.isConnected && owner === shareOwner && !revoked;

  function setWorking(value) {
    working = value;
    fields.disabled = value;
    close.disabled = value;
    lock(value);
  }

  mode.onchange = () => {
    activeLink = null;
    sentCard.hidden = true;
    sentGuestIds = [];
    confirming = false;
    disable.hidden = true;
    disable.textContent = 'Disable invitation access';
    address.hidden = true;
    address.value = ''; shareRow.hidden = true;
    feedback.textContent = '';

    const group = (guest.invitation_group || '').trim().toLowerCase();
    const people = mode.value === 'family'
      ? guests.filter(person =>
          (person.invitation_group || '').trim().toLowerCase() === group)
      : [guest];
    members.textContent = 'Replies for: ' + people.map(person =>
      `${person.first_name} ${person.last_name || ''}`.trim()
    ).join(', ') + '.';
  };

  copy.onclick = async () => {
    if (working || !valid()) return;
    setWorking(true);
    feedback.textContent = 'Preparing invitation…';
    try {
      const {data,error} = await supabase.rpc('get_or_create_couple_invitation',{
        p_guest_id:guest.id,
        p_scope:mode.value
      });
      if (!valid()) return;
      if (error) throw new Error(error.message);
      if (!data?.token || !data?.link_id) {
        throw new Error('Could not prepare this invitation.');
      }

      activeLink = {id:data.link_id,count:data.guest_count};
      const url = new URL(siteUrl('rsvp/'),location.href);
      if (!/^[A-Za-z0-9_-]{12}$/.test(data.short_code || '')) {
        throw new Error('Could not prepare the short invitation link.');
      }
      url.hash = data.short_code;
      await loadSentCard();
      if (!valid()) return;
      address.value = url.href;
      address.hidden = false;
      shareRow.hidden = false;
      disable.hidden = false;
      confirming = false;
      disable.textContent = 'Disable invitation access';

      try {
        await navigator.clipboard.writeText(url.href);
        if (!valid()) return;
        feedback.textContent = `Copied! This invitation covers ${data.guest_count} guest(s).`;
      } catch {
        if (!valid()) return;
        address.focus();
        address.select();
        feedback.textContent = 'Link ready. Select it and copy with Ctrl+C or your device’s copy menu.';
      }

      feedback.textContent += ' No invitation has been marked as sent.';
      if (['127.0.0.1','localhost'].includes(location.hostname)) {
        feedback.textContent += ' This local preview link works only on this computer.';
      }
    } catch (error) {
      if (valid()) feedback.textContent = error.message;
    } finally {
      if (valid()) setWorking(false);
    }
  };

  disable.onclick = async () => {
    if (working || !valid() || !activeLink) return;
    if (!confirming) {
      confirming = true;
      disable.textContent = 'Confirm disable access';
      feedback.textContent =
        `This stops replies through this invitation for ${activeLink.count} guest(s). Existing replies stay saved. Click again to confirm, or close this window to cancel.`;
      return;
    }
    setWorking(true);
    try {
      const {data,error} = await supabase.rpc('revoke_couple_rsvp_link',{
        p_link_id:activeLink.id
      });
      if (!valid()) return;
      if (error || data !== true) throw new Error('Could not confirm that access was disabled.');
      address.value = ''; shareRow.hidden = true;
      address.hidden = true;
      disable.hidden = true;
      activeLink = null;
    sentCard.hidden = true;
    sentGuestIds = [];
      feedback.textContent = 'Invitation access disabled. Existing replies have been kept.';
    } catch (error) {
      if (valid()) feedback.textContent = error.message;
    } finally {
      if (valid()) setWorking(false);
    }
  };

  close.onclick = () => modal.close();
  modal.addEventListener('cancel',event => {
    if (working) event.preventDefault();
  });
  const unsubscribe = onSessionChange(({user}) => {
    if (user?.id !== shareOwner) modal.close();
  });
  modal.addEventListener('close',() => {
    unsubscribe();
    address.value = ''; shareRow.hidden = true;
    modal.remove();
  },{once:true});

  mode.onchange();
  modal.showModal();
}
// Compact guest list layout
{
  const filters = content.querySelector('.ct-filters');
  const refreshButton = $('gu-refresh');
  const sendButton = refreshButton.nextElementSibling;

  if (sendButton?.tagName === 'BUTTON' &&
      sendButton.textContent === 'Send invitations') {
    const actions = node('div','','gu-filter-actions');
    sendButton.style.marginLeft = '0';
    actions.append(refreshButton,sendButton);
    filters.append(actions);
  }

  const style = document.createElement('style');
  style.textContent = `
    #gu-content .ct-filters {
      grid-template-columns:2fr 1fr 1fr;
      gap:14px 18px;
      align-items:end;
      margin:16px 0 10px;
    }
    #gu-content .ct-filters > label:first-child {
      grid-column:auto;
    }
    #gu-content .gu-filter-actions {
      grid-column:2 / -1;
      display:flex;
      justify-content:flex-end;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }
    #gu-content #gu-status {
      margin:8px 0 12px;
      font-size:13px;
    }
    #gu-content #gu-list > .ct-row {
      padding:11px 14px;
      margin-bottom:7px;
      gap:14px;
      border-radius:8px;
      align-items:center;
      flex-wrap:nowrap;
    }
    #gu-content #gu-list .ct-task-body > strong {
      font-size:14px;
      line-height:1.4;
    }
    #gu-content #gu-list .ct-task-body p {
      margin:3px 0 0;
      font-size:12px;
      line-height:1.4;
    }
    #gu-content #gu-list .ct-task-body details {
      margin-top:4px;
      font-size:12px;
      line-height:1.4;
    }
    #gu-content #gu-list .ct-task-body summary {
      cursor:pointer;
    }
    #gu-content #gu-list .ct-actions {
      gap:6px;
      flex-shrink:0;
      flex-wrap:nowrap;
    }
    #gu-content #gu-list .ct-actions button {
      min-height:34px;
      padding:6px 10px;
      font-size:12px;
      white-space:nowrap;
    }
    #gu-content #gu-list .gu-review-badge {
      font-size:11px;
      padding:2px 7px;
      margin-top:4px;
    }
    @media(max-width:1000px) {
      #gu-content .ct-filters {
        grid-template-columns:1fr 1fr;
      }
      #gu-content .ct-filters > label:first-child {
        grid-column:1 / -1;
      }
      #gu-content .gu-filter-actions {
        grid-column:auto;
      }
      #gu-content #gu-list > .ct-row {
        flex-wrap:wrap;
      }
    }
    @media(max-width:600px) {
      #gu-content .ct-filters {
        grid-template-columns:1fr;
      }
      #gu-content .gu-filter-actions {
        grid-column:1;
        justify-content:flex-start;
      }
      #gu-content #gu-list .ct-actions {
        flex-wrap:wrap;
      }
      #gu-content #gu-list .ct-actions button {
        min-height:44px;
      }
    }
  `;
  document.head.append(style);
}

// Invitation design preview
{
  const editor = document.createElement('section');
  editor.id = 'gi-designer';
  editor.innerHTML = `
    <h3>Your invitation</h3>
    <label>Design
      <select id="gi-design">
        <option value="classic">Classic</option>
        <option value="floral">Floral</option>
        <option value="modern">Modern</option>
      </select>
    </label>
    <div class="ct-form-grid">
      <label>Email subject
        <input id="gi-subject" maxlength="150" value="You're invited to our wedding">
      </label>
      <label>Your names
        <input id="gi-names" maxlength="160" placeholder="For example: Alex & Jamie">
      </label>
      <label>Wedding date
        <input id="gi-date" type="date">
      </label>
      <label>Venue / location
        <input id="gi-location" maxlength="250" placeholder="Venue and location">
      </label>
    </div>
    <label>Invitation wording
      <textarea id="gi-wording" rows="4" maxlength="3000">We'd love you to join us as we celebrate our wedding.

Please let us know whether you can make it using the RSVP button below.</textarea>
    </label>
    <label>Wedding-card image (optional)
      <input id="gi-card-file" type="file" accept="image/jpeg,image/png,image/webp">
    </label>
    <p class="ct-help">JPG, PNG or WebP, up to 5 MB. Your full image will appear above the invitation wording.</p>
    <button id="gi-card-remove" type="button" hidden>Remove image</button>
    <p id="gi-design-status" role="status" aria-live="polite"></p>

    <details id="gi-email-preview" open>
      <summary>Preview invitation email</summary>
      <p class="gi-email-subject"><strong>Subject:</strong> <span id="gi-preview-subject"></span></p>
      <article id="gi-email-card" data-design="classic" aria-label="Example invitation email">
        <div class="gi-email-brand">WedSparks</div>
        <div class="gi-email-heading">
          <span class="gi-floral-mark" aria-hidden="true">❧</span>
          <p class="gi-email-eyebrow">YOU’RE INVITED</p>
          <h3 id="gi-preview-names"></h3>
          <p>We’re getting married</p>
        </div>
        <img id="gi-preview-image" alt="Wedding invitation card" hidden>
        <div class="gi-email-body">
          <p id="gi-preview-wording"></p>
          <p id="gi-preview-date"></p>
          <p id="gi-preview-location"></p>
          <span class="gi-email-cta">Reply to invitation</span>
          <p id="gi-preview-permission" class="gi-email-small"></p>
        </div>
      </article>
      <p class="ct-help">Illustrative preview. The RSVP button will work in sent invitations. Email apps may display small styling differences.</p>
    </details>
    <p class="ct-help">This draft stays here while you browse the dashboard, but is not yet saved and will reset when you refresh.</p>`;
  $('gi-fields').append(editor);

  const style = document.createElement('style');
  style.textContent = `
    #gi-designer {margin-top:26px;padding-top:22px;border-top:1px solid #dedbd6}
    #gi-designer > h3 {font:normal 28px Georgia,serif;color:#103e33;margin:0 0 18px}
    #gi-designer > label {margin-top:16px}
    #gi-email-preview {margin-top:22px}
    #gi-email-preview > summary {font-weight:700;cursor:pointer;padding:12px 0}
    .gi-email-subject {font-size:14px;overflow-wrap:anywhere}
    #gi-email-card {
      max-width:580px;margin:16px auto;background:#fffdf8;
      border:1px solid #ddd5c5;border-radius:10px;overflow:hidden;color:#173e33;
    }
    #gi-email-card .gi-email-brand {
      padding:12px;text-align:center;background:#103e33;color:white;
      font:bold 23px Georgia,serif;
    }
    #gi-email-card .gi-email-heading {padding:30px 22px 24px;text-align:center}
    #gi-email-card .gi-email-eyebrow {font:11px Arial,sans-serif;letter-spacing:2px}
    #gi-email-card h3 {
      font:normal 34px/1.2 Georgia,serif;margin:16px 0;color:inherit;overflow-wrap:anywhere;
    }
    #gi-email-card .gi-email-heading > p:last-child {font:16px Georgia,serif;color:inherit}
    #gi-preview-image {display:block;width:100%;height:auto}
    #gi-preview-image[hidden] {display:none}
    #gi-email-card .gi-email-body {padding:24px;text-align:center}
    #gi-preview-wording {white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}
    #gi-preview-date,#gi-preview-location {font-weight:700;overflow-wrap:anywhere}
    #gi-email-card .gi-email-cta {
      display:inline-block;margin:18px 0 10px;padding:13px 24px;
      border-radius:6px;background:#103e33;color:white;font:bold 14px Arial,sans-serif;
    }
    #gi-email-card .gi-email-small {font-size:12px;line-height:1.6;color:#536158}
    #gi-email-card .gi-floral-mark {display:none}
    #gi-email-card[data-design="floral"] {background:#fffafa;border-color:#e4cbd0}
    #gi-email-card[data-design="floral"] .gi-email-heading {
      background:#f9edf0;color:#653e4b;border-bottom:1px solid #e4cbd0;
    }
    #gi-email-card[data-design="floral"] .gi-floral-mark {
      display:block;font:44px Georgia,serif;color:#936477;
    }
    #gi-email-card[data-design="floral"] .gi-email-cta {background:#75475a}
    #gi-email-card[data-design="modern"] {background:white;border-color:#bdcec5;border-radius:0}
    #gi-email-card[data-design="modern"] .gi-email-heading {background:#103e33;color:white;text-align:left}
    #gi-email-card[data-design="modern"] h3 {font:bold 34px/1.15 Arial,sans-serif}
    #gi-email-card[data-design="modern"] .gi-email-body {text-align:left}
    #gi-email-card[data-design="modern"] .gi-email-cta {border-radius:0}
  `;
  document.head.append(style);

  let imageUrl = '', imageVersion = 0;

  function updatePreview() {
    $('gi-email-card').dataset.design = $('gi-design').value;
    $('gi-preview-subject').textContent = $('gi-subject').value.trim() || 'Your wedding invitation';
    $('gi-preview-names').textContent = $('gi-names').value.trim() || 'Your names';
    $('gi-preview-wording').textContent = $('gi-wording').value;
    const value = $('gi-date').value;
    const date = value ? new Date(value+'T12:00:00') : null;
    $('gi-preview-date').textContent = date && Number.isFinite(date.getTime())
      ? date.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
      : '';
    $('gi-preview-location').textContent = $('gi-location').value.trim();
    $('gi-preview-permission').textContent = $('gi-mode').value === 'family'
      ? 'You can reply for yourself or the family members listed in your invitation.'
      : 'Please confirm your own attendance using your personal invitation.';
  }

  function removeImage() {
    imageVersion++;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = '';
    $('gi-preview-image').removeAttribute('src');
    $('gi-preview-image').hidden = true;
    $('gi-card-file').value = '';
    $('gi-card-remove').hidden = true;
    $('gi-design-status').textContent = '';
  }

  $('gi-card-file').onchange = async () => {
    const file = $('gi-card-file').files[0];
    if (!file) return;
    const version = ++imageVersion;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024) {
      $('gi-design-status').textContent = 'Choose a JPG, PNG or WebP image no larger than 5 MB.';
      $('gi-card-file').value = '';
      return;
    }
    const candidate = URL.createObjectURL(file);
    try {
      const testImage = new Image();
      testImage.src = candidate;
      await testImage.decode();
      if (version !== imageVersion || revoked) {
        URL.revokeObjectURL(candidate);
        return;
      }
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      imageUrl = candidate;
      $('gi-preview-image').src = imageUrl;
      $('gi-preview-image').hidden = false;
      $('gi-card-remove').hidden = false;
      $('gi-design-status').textContent = 'Image added to the preview. It has not been uploaded or saved.';
    } catch {
      URL.revokeObjectURL(candidate);
      if (version === imageVersion) {
        $('gi-design-status').textContent = 'That image could not be opened. Please try another file.';
        $('gi-card-file').value = '';
      }
    }
  };
  $('gi-card-remove').onclick = removeImage;
  for (const id of ['gi-design','gi-subject','gi-names','gi-date','gi-location','gi-wording','gi-mode'])
    $(id).addEventListener('input',updatePreview);

  // The recipient picker resets its reply mode whenever it opens.
  const modal = getInvitationDesignerDialog();
  new MutationObserver(() => {
    if (modal.open) updatePreview();
  }).observe(modal,{attributes:true,attributeFilter:['open']});

  onSessionChange(({user}) => {
    if (owner && user?.id !== owner) {
      removeImage();
      for (const id of ['gi-subject','gi-names','gi-date','gi-location','gi-wording'])
        $(id).value = '';
      updatePreview();
    }
  });
  updatePreview();
}

// Saved invitation card images
{
  const editor = $('gi-designer');
  const modal = getInvitationDesignerDialog();
  const storage = supabase.storage.from('wedding-invitation-cards');
  const mapping = {
    design:'gi-design',subject:'gi-subject',couple_names:'gi-names',
    wedding_date:'gi-date',wedding_location:'gi-location',wording:'gi-wording'
  };
  const columns = 'user_id,design,subject,couple_names,wedding_date,wedding_location,wording,card_image_path';
  let loaded=false, exists=false, working=false;
  let savedPath=null, pendingFile=null, imageRemoved=false, previewUrl='';

  const actions = node('div','','ct-actions');
  actions.style.marginTop = '18px';
  const save = node('button','Save invitation');
  save.type='button'; save.className='ct-primary';
  const retry = node('button','Reload saved invitation');
  retry.type='button'; retry.hidden=true;
  const feedback = node('p','');
  feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  actions.append(save,retry);
  $('gi-email-preview').before(actions,feedback);

  const oldNote = [...editor.querySelectorAll(':scope > p.ct-help')]
    .find(p=>p.textContent.includes('not yet saved'));
  if(oldNote) oldNote.textContent =
    'Save invitation to keep your design, wording and card image. Removing an image takes effect when you save.';

  // Clear invitation draft status
  const draftNotice = node('p','');
  draftNotice.setAttribute('role','status');
  draftNotice.setAttribute('aria-live','polite');
  draftNotice.hidden = true;
  draftNotice.style.cssText =
    'padding:14px 16px;margin:16px 0;border:1px solid #b99158;border-left:4px solid #b99158;border-radius:8px;background:#fff8ec;color:#65451e;font-weight:600';
  editor.before(draftNotice);

  function markInvitationDraft(unsaved) {
    draftNotice.hidden = !unsaved;
    draftNotice.textContent = unsaved
      ? 'Unsaved draft — these changes have not been saved. Click Save invitation to confirm them before sharing.'
      : '';
    save.textContent = unsaved ? 'Save invitation — unsaved changes' : 'Save invitation';
  }

  function setControls() {
    for(const id of [...Object.values(mapping),'gi-card-file','gi-card-remove'])
      $(id).disabled = working || !loaded;
    save.disabled = working || !loaded;
    retry.disabled = working;
    modal.lastElementChild.disabled = working;
  }
  modal.addEventListener('cancel',event=>{
    if(working)event.preventDefault();
  });

  function showImage(blob) {
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    previewUrl = blob ? URL.createObjectURL(blob) : '';
    const image=$('gi-preview-image');
    image.hidden=!blob;
    if(blob)image.src=previewUrl;
    else image.removeAttribute('src');
    $('gi-card-remove').hidden=!blob;
  }

  async function loadDesign() {
    if(working || loaded || revoked || !owner)return;
    working=true; setControls(); retry.hidden=true;
    feedback.textContent='Loading your saved invitation…';
    $('gi-design-status').textContent='';
    try {
      const {data,error}=await supabase.from('couple_invitation_designs')
        .select(columns).eq('user_id',owner).maybeSingle();
      if(revoked)return;
      if(error)throw new Error();
      exists=!!data;
      savedPath=data?.card_image_path || null;
      let image=null;
      if(savedPath) {
        const result=await storage.download(savedPath);
        if(revoked)return;
        if(result.error)throw new Error();
        image=result.data;
      }
      if(data) {
        for(const [key,id] of Object.entries(mapping))
          $(id).value=data[key] ?? '';
      }
      pendingFile=null; imageRemoved=false;
      $('gi-card-file').value='';
      showImage(image);
      loaded=true;
      markInvitationDraft(false);
      $('gi-design').dispatchEvent(new Event('input',{bubbles:true}));
      feedback.textContent=data
        ? 'Saved invitation loaded.'
        : 'Customise your invitation, then save.';
    } catch {
      if(!revoked) {
        loaded=false;
        feedback.textContent='Could not load the saved invitation or image. Reload before editing.';
        retry.hidden=false;
      }
    } finally {
      working=false;
      if(!revoked)setControls();
    }
  }

  $('gi-card-file').onchange=async()=>{
    if(working || !loaded || revoked)return;
    const file=$('gi-card-file').files[0];
    if(!file)return;
    const types=['image/jpeg','image/png','image/webp'];
    if(!types.includes(file.type) || file.size>5*1024*1024) {
      $('gi-design-status').textContent='Choose JPG, PNG or WebP, up to 5 MB.';
      $('gi-card-file').value='';
      return;
    }
    working=true; setControls();
    const url=URL.createObjectURL(file);
    try {
      const test=new Image();
      test.src=url;
      await test.decode();
      if(revoked)return;
      pendingFile=file;
      imageRemoved=false;
      showImage(file);
      $('gi-design-status').textContent='Image ready. Click Save invitation to keep it.';
      markInvitationDraft(true); feedback.textContent='Changes are saved only when you click Save invitation.';
    } catch {
      if(!revoked) {
        $('gi-design-status').textContent='Could not open this image. Try another file.';
        $('gi-card-file').value='';
      }
    } finally {
      URL.revokeObjectURL(url);
      working=false;
      if(!revoked)setControls();
    }
  };

  $('gi-card-remove').onclick=()=>{
    if(working || !loaded || revoked)return;
    pendingFile=null; imageRemoved=true;
    $('gi-card-file').value='';
    showImage(null);
    $('gi-design-status').textContent='Image removed from the draft. Save to confirm.';
    markInvitationDraft(true); feedback.textContent='Changes are saved only when you click Save invitation.';
  };

  for(const id of Object.values(mapping)) {
    $(id).addEventListener('input',()=>{
      if(loaded && !working) { markInvitationDraft(true); feedback.textContent='Changes are saved only when you click Save invitation.'; }
    });
  }

  save.onclick=async()=>{
    if(working || !loaded || revoked || !owner)return;
    if (pendingInvitationAction && !validateInvitationFields()) return;
    for(const id of Object.values(mapping))
      if(!$(id).reportValidity())return;

    const values=Object.fromEntries(Object.entries(mapping).map(([key,id])=>[
      key,key==='wedding_date' ? ($(id).value || null) : $(id).value.trim()
    ]));
    if(!values.subject) {
      feedback.textContent='Please enter an email subject.';
      $('gi-subject').focus();
      return;
    }

    working=true; setControls(); retry.hidden=true;
    feedback.textContent='Saving invitation…';
    let invitationSaved=false;
    const previousPath=savedPath;
    let nextPath=imageRemoved ? null : savedPath;

    try {
      if(pendingFile) {
        const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[pendingFile.type];
        nextPath=`${owner}/${crypto.randomUUID()}.${ext}`;
        const {error}=await storage.upload(nextPath,pendingFile,{
          contentType:pendingFile.type,upsert:false
        });
        if(revoked)return;
        if(error)throw new Error();
      }
      values.card_image_path=nextPath;

      let query;
      if(exists) {
        query=supabase.from('couple_invitation_designs')
          .update(values).eq('user_id',owner);
        // Avoid overwriting an image replaced in another tab.
        query=previousPath
          ? query.eq('card_image_path',previousPath)
          : query.is('card_image_path',null);
      } else {
        query=supabase.from('couple_invitation_designs')
          .insert({...values,user_id:owner});
      }

      const {data,error}=await query.select('user_id');
      if(revoked)return;
      if(error || data?.length!==1)throw new Error();

      invitationSaved=true;
      exists=true;
      savedPath=nextPath;
      pendingFile=null; imageRemoved=false;
      $('gi-card-file').value='';
      $('gi-design-status').textContent='';
      markInvitationDraft(false);
      feedback.textContent='Invitation saved and confirmed.';

      // Delete the old image only after its replacement/removal is saved.
      if(previousPath && previousPath!==nextPath &&
          previousPath.startsWith(owner+'/')) {
        try {
          const cleanup=await storage.remove([previousPath]);
          if(cleanup.error && !revoked)
            feedback.textContent='Invitation saved. The previous image could not be removed from storage.';
        } catch {
          if(!revoked)
            feedback.textContent='Invitation saved. The previous image could not be removed from storage.';
        }
      }
    } catch {
      if(!revoked) {
        loaded=false;
        retry.hidden=false;
        feedback.textContent='Could not confirm the save, or the image changed elsewhere. Reload the saved invitation before trying again.';
      }
      // Do not delete a newly uploaded image after an uncertain save:
      // the database may already reference it.
    } finally {
      working=false;
      if(!revoked)setControls();
      if(invitationSaved && !revoked) window.dispatchEvent(new Event('wedsparks:invitation-saved'));
    }
  };

  retry.onclick=()=>{
    if(confirm('Reload the saved invitation? Unsaved changes will be replaced.'))
      void loadDesign();
  };
  new MutationObserver(()=>{
    if(modal.open)void loadDesign();
  }).observe(modal,{attributes:true,attributeFilter:['open']});

  onSessionChange(({user})=>{
    if(owner && user?.id!==owner) {
      loaded=false;
      pendingFile=null;
      savedPath=null;
      showImage(null);
      feedback.textContent='';
      setControls();
    }
  });
  setControls();
  if(modal.open)void loadDesign();
}

// Separate invitation designer
function getInvitationDesignerDialog() {
  const existing = document.getElementById('gi-designer-dialog');
  if (existing) return existing;

  const editor = $('gi-designer');
  const sendingDialog = $('gi-fields').closest('dialog');
  const modal = document.createElement('dialog');
  modal.id = 'gi-designer-dialog';
  modal.setAttribute('aria-labelledby','gi-designer-title');
  modal.style.width = 'min(760px,calc(100% - 32px))';

  const title = node('h2','Your invitation');
  title.id = 'gi-designer-title';
  const intro = node('p',
    'Create your invitation here. Your saved design and wording will be used when inviting guests.');
  const close = node('button','Close');
  close.type = 'button';
  close.style.marginTop = '18px';
  close.onclick = () => modal.close();

  modal.append(title,intro,editor,close);
  content.closest('main').append(modal);

  const style = document.createElement('style');
  style.textContent = `
    #gi-designer-dialog #gi-designer {
      margin-top:18px;
      padding-top:0;
      border-top:0;
    }
    #gi-designer-dialog #gi-designer > h3:first-child {
      display:none;
    }
    .gi-saved-invitation-note {
      margin-bottom:20px;
      padding:14px 16px;
      border:1px solid #dedbd6;
      border-radius:9px;
      background:white;
    }
    .gi-saved-invitation-note p {
      margin:0 0 10px;
      font-size:14px;
    }
  `;
  document.head.append(style);

  const launch = node('button','Your invitation');
  launch.type = 'button';
  launch.id = 'gi-open-designer';
  $('gu-refresh').after(launch);

  function openDesigner() {
    if (!owner || revoked || busy || loading) return;
    if (sendingDialog.open) sendingDialog.close();
    if (!modal.open) modal.showModal();
  }
  launch.onclick = openDesigner;

  const note = node('div','','gi-saved-invitation-note');
  note.append(node('p','Use your saved invitation. Choose recipients and how they can reply below.'));
  const edit = node('button','Edit your invitation');
  edit.type = 'button';
  edit.onclick = openDesigner;
  note.append(edit);
  $('gi-fields').prepend(note);

  onSessionChange(({user}) => {
    if (owner && user?.id !== owner) modal.close();
  });

  return modal;
}

// Inline invitation image removal
{
  const input = $('gi-card-file');
  const remove = $('gi-card-remove');
  const label = input.closest('label');
  input.id = 'gi-card-file';
  label.htmlFor = input.id;

  const row = document.createElement('div');
  row.className = 'gi-image-upload-row';
  label.after(row);
  row.append(input,remove);

  const style = document.createElement('style');
  style.textContent = `
    #gi-designer .gi-image-upload-row {
      display:flex;
      align-items:center;
      gap:10px;
      padding:6px 8px;
      border:1px solid #bdc8be;
      border-radius:7px;
      background:white;
      margin-top:7px;
    }
    #gi-designer .gi-image-upload-row input {
      flex:1;
      min-width:0;
      width:0;
      border:0;
      padding:5px;
      margin:0;
      background:transparent;
    }
    #gi-designer .gi-image-upload-row button {
      flex-shrink:0;
      min-height:36px;
      padding:7px 12px;
      white-space:nowrap;
    }
    @media(max-width:450px) {
      #gi-designer .gi-image-upload-row {
        flex-wrap:wrap;
      }
      #gi-designer .gi-image-upload-row input {
        flex-basis:100%;
      }
      #gi-designer .gi-image-upload-row button {
        margin-left:auto;
      }
    }
  `;
  document.head.append(style);
}
// Invitation readiness gate
let pendingInvitationAction = null;
let checkingInvitation = false;
const invitationRequiredFields = {
  couple_names:['gi-names','Couple names'],
  wedding_date:['gi-date','Wedding date'],
  wedding_location:['gi-location','Venue / location'],
  wording:['gi-wording','Invitation wording'],
  subject:['gi-subject','Email subject']
};

function invitationReadinessNotice(missing) {
  const modal = getInvitationDesignerDialog();
  let notice = $('gi-readiness-notice');
  if (!notice) {
    notice = node('p','');
    notice.id = 'gi-readiness-notice';
    notice.tabIndex = -1;
    notice.setAttribute('role','status');
    notice.style.cssText =
      'padding:14px;border-left:4px solid #a45b36;background:#fff8f2;color:#633b27';
    $('gi-designer').before(notice);
  }
  const names = missing.map(key => invitationRequiredFields[key]?.[1])
    .filter(Boolean);
  notice.textContent = names.length
    ? 'Your saved invitation is incomplete. Complete and save these details to continue: ' + names.join(', ') + '.'
    : 'Save your completed invitation to continue.';
  notice.hidden = false;

  for (const [key,[id]] of Object.entries(invitationRequiredFields)) {
    const field = $(id);
    const invalid = missing.includes(key);
    field.setAttribute('aria-invalid',String(invalid));
    field.style.outline = invalid ? '2px solid #a45b36' : '';
    if (invalid) field.setAttribute('aria-describedby','gi-readiness-notice');
    else field.removeAttribute('aria-describedby');
  }
  if (!modal.open) modal.showModal();
  notice.focus();
}

function validateInvitationFields() {
  const missing = Object.entries(invitationRequiredFields)
    .filter(([, [id]]) => !$(id).value.trim())
    .map(([key]) => key);
  if (missing.length) {
    invitationReadinessNotice(missing);
    $(invitationRequiredFields[missing[0]][0]).focus();
    return false;
  }
  return true;
}

async function ensureInvitationReady(continueAction) {
  if (checkingInvitation || revoked || !owner) return false;
  checkingInvitation = true;
  const checkedOwner = owner;
  let readiness;
  try {
    const {data,error} = await supabase.rpc('get_couple_invitation_readiness');
    if (revoked || owner !== checkedOwner) return false;
    if (error || !Array.isArray(data?.missing)) throw new Error();
    readiness = data;
  } catch {
    if (!revoked) message('Could not check your invitation. Please try again.',true);
    return false;
  } finally {
    checkingInvitation = false;
  }

  if (readiness.ready === true) return true;
  pendingInvitationAction = continueAction;
  invitationReadinessNotice(readiness.missing);
  return false;
}

{
  const modal = getInvitationDesignerDialog();

  modal.addEventListener('close',() => {
    pendingInvitationAction = null;
    const notice = $('gi-readiness-notice');
    if (notice) notice.hidden = true;
    for (const [id] of Object.values(invitationRequiredFields)) {
      $(id).removeAttribute('aria-invalid');
      $(id).removeAttribute('aria-describedby');
      $(id).style.outline = '';
    }
  });

  for (const [id] of Object.values(invitationRequiredFields)) {
    $(id).addEventListener('input',() => {
      if ($(id).value.trim()) {
        $(id).removeAttribute('aria-invalid');
        $(id).removeAttribute('aria-describedby');
        $(id).style.outline = '';
      }
    });
  }

  window.addEventListener('wedsparks:invitation-saved',async () => {
    const action = pendingInvitationAction;
    if (!action || revoked || !modal.open) return;
    if (!await ensureInvitationReady(action)) return;
    if (pendingInvitationAction !== action || !modal.open || revoked) return;
    pendingInvitationAction = null;
    modal.close();
    // Let the dialog's close handler finish before reopening the flow.
    setTimeout(() => {
      if (!revoked && owner) void action();
    },0);
  });

  onSessionChange(({user}) => {
    if (user?.id !== owner) pendingInvitationAction = null;
  });
}