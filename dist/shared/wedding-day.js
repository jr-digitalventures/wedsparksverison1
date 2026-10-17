import {supabase} from './supabase-client.js';
import {requireUser,loadAccount,siteUrl,onSessionChange} from './auth.js';

const $=id=>document.getElementById(id);
const content=$('wd-content');
let owner=null, rows=[], busy=false, loading=false, revoked=false;
let editing=null, weddingDate='';

const categories=[
  'Preparation','Hair & makeup','Travel','First look','Photography',
  'Ceremony','Canapés','Reception','Speeches','Cake cutting',
  'First dance','Farewell','Other'
];

function node(tag,text,className){
  const item=document.createElement(tag);
  item.textContent=text;
  if(className)item.className=className;
  return item;
}
function dateLabel(value){
  return value
    ?new Date(value+'T12:00:00').toLocaleDateString('en-AU',{
      weekday:'long',day:'numeric',month:'long'
    })
    :'Date to be confirmed';
}
function timeLabel(value){
  if(!value)return 'Time to be confirmed';
  const [hour,minute]=value.slice(0,5).split(':').map(Number);
  const date=new Date(2000,0,1,hour,minute);
  return date.toLocaleTimeString('en-AU',{
    hour:'numeric',minute:'2-digit'
  });
}
function status(text,error=false){
  $('wd-status').textContent=text;
  $('wd-status').dataset.error=String(error);
}
function filtered(){
  const search=$('wd-search').value.trim().toLocaleLowerCase();
  const category=$('wd-category-filter').value;
  return rows.filter(row=>
    (!search||`${row.title} ${row.category} ${row.location} ${row.notes}`
      .toLocaleLowerCase().includes(search))&&
    (!category||row.category===category)
  );
}

content.innerHTML=`
  <div class="ct-heading">
    <div>
      <h2>Every moment, beautifully timed</h2>
      <p>Bring the people, places and moments of your day into one simple run sheet.</p>
    </div>
    <button id="wd-add" class="ct-primary" type="button">+ Add a moment</button>
  </div>
  <div class="wd-intro">
    <strong>Your wedding-day run sheet</strong>
    <span>Keep timings flexible while the plan comes together.</span>
  </div>
  <dl class="ct-stats">
    <div><dt>Moments planned</dt><dd id="wd-total">—</dd></div>
    <div><dt>With a time</dt><dd id="wd-timed">—</dd></div>
    <div><dt>Locations added</dt><dd id="wd-locations">—</dd></div>
  </dl>
  <div class="ct-filters">
    <label>Find a moment
      <input id="wd-search" type="search" placeholder="Moment, category or location">
    </label>
    <label>Category
      <select id="wd-category-filter"><option value="">All categories</option></select>
    </label>
  </div>
  <div class="ct-toolbar">
    <p id="wd-status" role="status" aria-live="polite"></p>
    <button id="wd-refresh" type="button">Refresh run sheet</button>
  </div>
  <section id="wd-timeline" aria-label="Wedding day schedule"></section>
  <div id="wd-empty" hidden>
    <h2 id="wd-empty-title">Your day will take shape here</h2>
    <p id="wd-empty-text">Add the first moment to begin your wedding-day run sheet.</p>
    <button id="wd-empty-add" class="ct-primary" type="button">Add your first moment</button>
    <button id="wd-typical-schedule" type="button">Start with a typical wedding-day schedule</button>
  </div>
  <dialog id="wd-dialog" aria-labelledby="wd-dialog-title">
    <form id="wd-form">
      <h2 id="wd-dialog-title">Add a moment</h2>
      <fieldset id="wd-fields">
        <div class="ct-form-grid">
          <label>Date (optional)
            <input name="event_date" type="date" min="1900-01-01" max="9999-12-31">
          </label>
          <label>Time (optional)
            <input name="start_time" type="time">
          </label>
          <label>Moment
            <input name="title" required maxlength="160" placeholder="e.g. Ceremony begins">
          </label>
          <label>Category
            <input name="category" required maxlength="80">
          </label>
          <label>Location (optional)
            <input name="location" maxlength="250" placeholder="e.g. Garden terrace">
          </label>
        </div>
        <label>Notes (optional)
          <textarea name="notes" rows="3" maxlength="2000"
            placeholder="Anything everyone needs to know"></textarea>
        </label>
      </fieldset>
      <p id="wd-form-status" class="ct-help" role="status"></p>
      <div class="ct-actions">
        <button id="wd-save" class="ct-primary" type="submit">Save moment</button>
        <button id="wd-close" type="button">Close</button>
      </div>
    </form>
  </dialog>
`;

const style=document.createElement('style');
style.textContent=`
  #wd-content > .ct-heading{
    padding:20px 24px;border-radius:14px;background:#214c3e;margin-bottom:24px
  }
  #wd-content > .ct-heading h2{color:white}
  #wd-content > .ct-heading p{color:#e0ebe2}
  #wd-content > .ct-heading .ct-primary{
    background:#fffaf0;color:#214c3e;border-color:#fffaf0
  }
  #wd-content > .ct-heading .ct-primary:hover{background:white;color:#214c3e}
  #wd-content .wd-intro{
    display:flex;justify-content:space-between;gap:16px;align-items:center;
    padding:14px 18px;margin-bottom:20px;border:1px solid #d7ddd6;
    border-radius:12px;background:#fffaf0;color:#214c3e
  }
  #wd-content .wd-intro span{font-size:14px}
  #wd-content .wd-date-group{margin:26px 0}
  #wd-content .wd-date-group h3{
    margin:0;padding:0 0 10px;border-bottom:1px solid #d7ddd6;
    color:#214c3e
  }
  #wd-content .wd-list{list-style:none;padding:0;margin:0}
  #wd-content .wd-row{
    display:flex;align-items:flex-start;gap:18px;padding:15px 0;
    border-bottom:1px solid #e2e3de
  }
  #wd-content .wd-time{
    flex:0 0 100px;font-weight:700;color:#214c3e
  }
  #wd-content .wd-body{min-width:0;flex:1}
  #wd-content .wd-body p{margin:5px 0 0;color:#536158}
  #wd-content .wd-meta{font-size:14px}
  #wd-content #wd-empty{
    padding:24px;border:1px dashed #bdc8be;border-radius:12px;background:white
  }
  #wd-content #wd-typical-schedule{
    margin-left:8px
  }
  #wd-dialog{width:min(680px,calc(100% - 32px))}
  #wd-dialog label{margin-bottom:12px}
  #wd-form-status[data-error="true"]{color:#9b382d}
  @media(max-width:600px){
    #wd-content > .ct-heading{padding:18px}
    #wd-content .wd-intro{align-items:flex-start;flex-direction:column}
    #wd-content .wd-row{gap:10px;flex-wrap:wrap}
    #wd-content .wd-time{flex-basis:auto;width:100%}
  }
`;
document.head.append(style);

const dialog=$('wd-dialog');
const form=$('wd-form');
const fields=form.elements;

(() => {
  const input=fields.category;
  input.autocomplete='off';
  input.placeholder='Type or choose a category';
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');

  const wrap=document.createElement('div');
  wrap.className='wd-category-picker';
  input.parentNode.insertBefore(wrap,input);
  wrap.append(input);

  const arrow=document.createElement('span');
  arrow.textContent='⌄';
  arrow.className='wd-category-arrow';
  arrow.setAttribute('aria-hidden','true');

  const menu=document.createElement('div');
  menu.id='wd-category-options';
  menu.hidden=true;
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label','Wedding-day category suggestions');
  wrap.append(arrow,menu);
  input.setAttribute('aria-controls',menu.id);

  const pickerStyle=document.createElement('style');
  pickerStyle.textContent=`
    #wd-dialog .wd-category-picker{position:relative}
    #wd-dialog .wd-category-picker input{margin:0;padding-right:42px}
    #wd-dialog .wd-category-arrow{
      position:absolute;right:14px;top:50%;transform:translateY(-50%);
      color:#214c3e;font-size:17px;pointer-events:none
    }
    #wd-dialog #wd-category-options{
      position:absolute;z-index:20;top:calc(100% + 6px);left:0;right:0;
      max-height:210px;overflow:auto;padding:5px;border:1px solid #b7c4bc;
      border-radius:9px;background:#fffdf9;box-shadow:0 5px 16px #173e3314
    }
    #wd-dialog #wd-category-options[hidden]{display:none}
    #wd-dialog #wd-category-options [role=option]{
      padding:10px 12px;border-radius:5px;color:#214c3e;cursor:pointer
    }
    #wd-dialog #wd-category-options [role=option]:hover,
    #wd-dialog #wd-category-options [aria-selected=true]{
      background:#214c3e;color:white
    }
  `;
  document.head.append(pickerStyle);

  let choices=[],selected=-1;
  function close(){
    menu.hidden=true;selected=-1;
    input.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-activedescendant');
  }
  function choose(index){
    if(!choices[index])return;
    input.value=choices[index];
    input.dispatchEvent(new Event('change',{bubbles:true}));
    close();
  }
  function show(){
    if(busy||!dialog.open)return;
    const typed=input.value.trim();
    const search=typed.toLocaleLowerCase();
    const names=new Map();
    categories.concat(rows.map(row=>row.category)).forEach(value=>{
      const name=String(value||'').trim();
      if(name&&!names.has(name.toLowerCase()))names.set(name.toLowerCase(),name);
    });
    choices=[...names.values()]
      .sort((a,b)=>a.localeCompare(b))
      .filter(name=>name.toLowerCase().includes(search));
    if(typed&&!names.has(search))choices.push(typed);

    menu.replaceChildren();
    selected=-1;
    choices.forEach((choice,index)=>{
      const option=document.createElement('div');
      option.id=`wd-category-option-${index}`;
      option.setAttribute('role','option');
      option.setAttribute('aria-selected','false');
      option.textContent=typed===choice&&!names.has(search)
        ?`Use “${choice}” — new`
        :choice;
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(index));
      menu.append(option);
    });
    menu.hidden=false;
    input.setAttribute('aria-expanded','true');
  }
  function highlight(index){
    selected=index;
    [...menu.querySelectorAll('[role=option]')].forEach((option,itemIndex)=>{
      option.setAttribute('aria-selected',String(itemIndex===index));
    });
    const active=menu.querySelectorAll('[role=option]')[index];
    if(active){
      input.setAttribute('aria-activedescendant',active.id);
      active.scrollIntoView({block:'nearest'});
    }
  }

  input.addEventListener('focus',show);
  input.addEventListener('click',show);
  input.addEventListener('input',show);
  input.addEventListener('blur',close);
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(menu.hidden)show();
      if(!choices.length)return;
      const direction=event.key==='ArrowDown'?1:-1;
      highlight(selected<0
        ?(direction>0?0:choices.length-1)
        :(selected+direction+choices.length)%choices.length);
    }else if(event.key==='Enter'&&!menu.hidden){
      event.preventDefault();
      if(selected>=0)choose(selected);
      else close();
    }else if(event.key==='Escape'){
      close();
    }
  });
})();

function lock(value){
  busy=value;
  $('wd-fields').disabled=value;
  $('wd-save').disabled=value;
  $('wd-close').disabled=value;
  $('wd-add').disabled=value;
  $('wd-empty-add').disabled=value;
  $('wd-typical-schedule').disabled=value;
  $('wd-refresh').disabled=value||loading;
}
function refreshCategories(){
  const selected=$('wd-category-filter').value;
  $('wd-category-filter').replaceChildren(new Option('All categories',''));
  [...new Set(rows.map(row=>row.category))].sort((a,b)=>a.localeCompare(b))
    .forEach(category=>$('wd-category-filter').add(new Option(category,category)));
  if([...$('wd-category-filter').options].some(option=>option.value===selected)){
    $('wd-category-filter').value=selected;
  }
}
function render(){
  const visible=filtered();
  $('wd-total').textContent=rows.length;
  $('wd-timed').textContent=rows.filter(row=>row.start_time).length;
  $('wd-locations').textContent=new Set(
    rows.map(row=>row.location.trim()).filter(Boolean)
  ).size;

  const timeline=$('wd-timeline');
  timeline.replaceChildren();

  const groups=new Map();
  for(const row of visible){
    const key=row.event_date||'';
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }

  [...groups.keys()].sort((a,b)=>(a||'9999-12-31').localeCompare(b||'9999-12-31'))
    .forEach(key=>{
      const section=document.createElement('section');
      section.className='wd-date-group';
      section.append(node('h3',dateLabel(key)));

      const list=document.createElement('ul');
      list.className='wd-list';
      groups.get(key)
        .sort((a,b)=>(a.start_time||'99:99').localeCompare(b.start_time||'99:99')
          ||a.sort_order-b.sort_order||a.title.localeCompare(b.title))
        .forEach(row=>list.append(eventRow(row)));
      section.append(list);
      timeline.append(section);
    });

  $('wd-empty').hidden=visible.length>0;
  $('wd-empty-title').textContent=rows.length
    ?'No matching moments'
    :'Your day will take shape here';
  $('wd-empty-text').textContent=rows.length
    ?'Try a different moment or category.'
    :'Add the first moment to begin your wedding-day run sheet.';
}
function eventRow(row){
  const item=document.createElement('li');
  item.className='wd-row';

  const time=node('div',timeLabel(row.start_time),'wd-time');
  const body=node('div','','wd-body');
  body.append(node('strong',row.title));

  const meta=[row.category,row.location].filter(Boolean).join(' · ');
  if(meta)body.append(node('p',meta,'wd-meta'));
  if(row.notes){
    const details=document.createElement('details');
    details.append(node('summary','Notes'),node('p',row.notes));
    body.append(details);
  }

  const actions=node('div','','ct-actions');
  const edit=node('button','Edit');
  edit.type='button';
  edit.setAttribute('aria-label',`Edit ${row.title}`);
  edit.disabled=busy||loading;
  edit.addEventListener('click',()=>openEditor(row));

  const remove=node('button','Delete');
  remove.type='button';
  remove.setAttribute('aria-label',`Delete ${row.title}`);
  remove.disabled=busy||loading;
  remove.addEventListener('click',()=>{
    if(confirm(`Delete “${row.title}”? This cannot be undone.`)){
      void removeEvent(row);
    }
  });

  actions.append(edit,remove);
  item.append(time,body,actions);
  return item;
}
// A flexible starting point for couples who do not know where to begin.
const typicalSchedule=[
  ['08:00','Hair & makeup begins','Hair & makeup',''],
  ['11:00','Getting dressed','Preparation',''],
  ['12:00','First look','First look',''],
  ['13:00','Ceremony begins','Ceremony',''],
  ['13:30','Family and wedding-party photos','Photography',''],
  ['14:30','Canapés and drinks','Canapés',''],
  ['16:30','Reception begins','Reception',''],
  ['18:00','Dinner is served','Reception',''],
  ['19:15','Speeches','Speeches',''],
  ['20:30','Cake cutting','Cake cutting',''],
  ['20:45','First dance','First dance',''],
];

async function addTypicalSchedule(){
  if(busy||loading||rows.length)return;

  lock(true);
  try{
    const records=typicalSchedule.map(([start_time,title,category,location],index)=>({
      event_date:weddingDate||null,
      start_time,
      title,
      category,
      location,
      notes:'',
      sort_order:index
    }));

    const {data,error}=await supabase
      .from('couple_wedding_day_events')
      .insert(records)
      .select();

    if(error||!Array.isArray(data))throw new Error();

    rows=data;
    refreshCategories();
    status('A typical wedding-day schedule has been added. Make it your own.');
  }catch{
    status('Could not add the typical schedule. Please try again.',true);
  }finally{
    lock(false);
    render();
  }
}
async function refresh(){
  if(loading||revoked||!owner)return;
  loading=true;
  $('wd-refresh').disabled=true;
  try{
    const all=[];
    for(;;){
      const {data,count,error}=await supabase.from('couple_wedding_day_events')
        .select('*',{count:'exact'})
        .eq('user_id',owner)
        .order('event_date',{ascending:true})
        .order('start_time',{ascending:true})
        .order('sort_order',{ascending:true})
        .range(all.length,all.length+499);
      if(error||!Array.isArray(data)||count===null)throw new Error();
      all.push(...data);
      if(all.length>=count)break;
      if(!data.length)throw new Error();
    }
    rows=all;
    refreshCategories();
    status(`${rows.length} ${rows.length===1?'moment':'moments'} planned.`);
  }catch{
    status('Could not load your wedding-day plan. Refresh to try again.',true);
  }finally{
    loading=false;
    lock(false);
    render();
  }
}
function openEditor(row=null){
  if(busy||loading)return;
  editing=row;
  form.reset();
  fields.event_date.value=row?.event_date||weddingDate||'';
  fields.start_time.value=row?.start_time?.slice(0,5)||'';
  fields.title.value=row?.title||'';
  fields.category.value=row?.category||'';
  fields.location.value=row?.location||'';
  fields.notes.value=row?.notes||'';
  $('wd-dialog-title').textContent=row?'Edit moment':'Add a moment';
  $('wd-save').textContent=row?'Save changes':'Save moment';
  $('wd-form-status').textContent='';
  dialog.showModal();
  fields.title.focus();
}
async function removeEvent(row){
  lock(true);
  try{
    const {error}=await supabase.from('couple_wedding_day_events').delete()
      .eq('id',row.id).eq('user_id',owner).eq('updated_at',row.updated_at);
    if(error)throw new Error();
    rows=rows.filter(item=>item.id!==row.id);
    refreshCategories();
    status('Moment deleted.');
  }catch{
    status('Could not delete that moment. Please refresh and try again.',true);
  }finally{
    lock(false);
    render();
  }
}
async function save(event){
  event.preventDefault();
  if(busy||!form.reportValidity())return;

  const payload={
    event_date:fields.event_date.value||null,
    start_time:fields.start_time.value||null,
    title:fields.title.value.trim(),
    category:fields.category.value.trim(),
    location:fields.location.value.trim(),
    notes:fields.notes.value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!payload.title||!payload.category)return;

  lock(true);
  try{
    let result;
    if(editing){
      result=await supabase.from('couple_wedding_day_events').update(payload)
        .eq('id',editing.id).eq('user_id',owner).eq('updated_at',editing.updated_at)
        .select().single();
    }else{
      delete payload.updated_at;
      result=await supabase.from('couple_wedding_day_events').insert(payload)
        .select().single();
    }
    if(result.error||!result.data)throw new Error();

    if(editing){
      rows=rows.map(row=>row.id===editing.id?result.data:row);
      status('Moment updated.');
    }else{
      rows.push(result.data);
      status('Moment added.');
    }
    refreshCategories();
    dialog.close();
  }catch{
    $('wd-form-status').textContent=
      'Could not save that moment. Please refresh and try again.';
    $('wd-form-status').dataset.error='true';
  }finally{
    lock(false);
    render();
  }
}

$('wd-add').addEventListener('click',()=>openEditor());
$('wd-empty-add').addEventListener('click',()=>openEditor());
$('wd-typical-schedule').addEventListener('click',()=>void addTypicalSchedule());
$('wd-close').addEventListener('click',()=>{if(!busy)dialog.close()});
$('wd-refresh').addEventListener('click',()=>void refresh());
$('wd-search').addEventListener('input',render);
$('wd-category-filter').addEventListener('change',render);
form.addEventListener('submit',save);
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault()});
window.addEventListener('wedsparks:section-open',event=>{
  if(event.detail==='wedding-day'&&!loading)void refresh();
});

onSessionChange(({user})=>{
  if(owner&&user?.id!==owner){
    revoked=true;
    dialog.close();
    content.replaceChildren();
    content.hidden=true;
    location.replace(siteUrl('login/'));
  }
});

(async()=>{
  try{
    const user=await requireUser();
    if(!user||revoked)return;
    owner=user.id;
    const account=await loadAccount(user);
    if(!account.roles.includes('couple')){
      location.replace(siteUrl('supplier-account/'));
      return;
    }
    weddingDate=account.couple?.wedding_date||'';
    $('wd-loading').hidden=true;
    content.hidden=false;
    await refresh();
  }catch{
    if(!revoked)$('wd-loading').textContent=
      'Could not load your account. Refresh the page to try again.';
  }
})();