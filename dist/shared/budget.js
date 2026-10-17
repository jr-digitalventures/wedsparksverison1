import {supabase} from './supabase-client.js';
import {requireUser,loadAccount,siteUrl,onSessionChange} from './auth.js';

const $ = id => document.getElementById(id);
const content = $('bu-content');
let owner, rows=[], target=null, busy=false, loading=false;
let revoked=false, original=null, limit=25, loaded=false;
const cents = value => Math.round(Number(value || 0)*100);
const money = value => new Intl.NumberFormat('en-AU',{
  style:'currency',currency:'AUD'
}).format(value/100);
const cost = row => cents(row.confirmed_amount ?? row.estimated_amount);
const balance = row => cost(row)-cents(row.paid_amount);
const today = () => {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const overdue = row => balance(row)>0 && row.due_date && row.due_date<today();
const dateLabel = value => value
  ? new Date(value+'T12:00:00').toLocaleDateString('en-AU')
  : 'No due date';
function el(tag,text,cls) {
  const node=document.createElement(tag);
  node.textContent=text;
  if(cls)node.className=cls;
  return node;
}

content.innerHTML=`
  <div class="ct-heading">
    <div><h2>Make room for what matters</h2><p>Your wedding costs, payments and upcoming expenses.</p></div>
    <button id="bu-add" type="button" class="ct-primary">+ Add expense</button>
  </div>
  <div class="bu-target">
    <div><span>YOUR WEDDING BUDGET</span><h2 id="bu-target">—</h2></div>
    <div><span id="bu-room-label">Budget remaining</span><strong id="bu-room">—</strong></div>
    <div>
      <span>Overdue</span>
      <strong id="bu-overdue" title="Unpaid amounts with a due date before today">—</strong>
    </div>
    <a id="bu-profile">Edit wedding budget →</a>
  </div>
  <section class="bu-visual" aria-labelledby="bu-visual-heading">
    <div class="bu-visual-heading">
      <h3 id="bu-visual-heading">Your budget at a glance</h3>
      <span id="bu-budget-percent"></span>
    </div>
    <div id="bu-spending-bar" class="bu-spending-bar" role="img">
      <span id="bu-bar-paid"></span>
      <span id="bu-bar-unpaid"></span>
      <span id="bu-bar-room"></span>
      <span id="bu-budget-marker" hidden></span>
    </div>
    <div class="bu-bar-labels"><span>$0</span><span id="bu-bar-end"></span></div>
    <div class="bu-legend">
      <span><i style="background:#214c3e"></i>Paid · recorded by you</span>
      <span><i style="background:#d8d0c2"></i>Expected still to pay</span>
      <span><i style="background:#fff;border:1px solid #bfc8c0"></i>Remaining budget</span>
      <span><i style="background:#b68a38"></i>WedSparks credits used · Not connected yet</span>
    </div>
    <p id="bu-chart-note" class="ct-help"></p>
  </section>
  <dl class="ct-stats">
    <div><dt>Expected total</dt><dd id="bu-total">—</dd></div>
    <div><dt>Paid · recorded by you</dt><dd id="bu-paid">—</dd></div>
    <div><dt>Still to pay</dt><dd id="bu-outstanding">—</dd></div>
  </dl>
  <p class="ct-help">Expected total uses confirmed costs where available, otherwise estimates. Recorded payments do not count as verified spending for wedding credits.</p>
  <div class="ct-filters">
    <label>Find an expense<input id="bu-search" type="search" placeholder="Expense or supplier"></label>
    <label>Category<select id="bu-category"><option value="">All categories</option></select></label>
    <label>Payment status<select id="bu-state">
      <option value="">All expenses</option><option value="outstanding">Still to pay</option>
      <option value="overdue">Overdue</option><option value="paid">Fully paid</option>
    </select></label>
  </div>
  <div class="ct-toolbar"><p id="bu-status" role="status" aria-live="polite"></p>
    <button id="bu-refresh" type="button">Refresh expenses</button></div>
  <ul id="bu-list" class="ct-list"></ul>
  <div id="bu-empty" hidden><h2 id="bu-empty-title"></h2><p id="bu-empty-text"></p>
    <button id="bu-empty-add" class="ct-primary" type="button">Add your first expense</button>
    <button id="bu-clear" type="button">Clear filters</button>
  </div>
  <button id="bu-more" type="button" hidden>Show more expenses</button>
  <dialog id="bu-dialog" aria-labelledby="bu-title">
    <form id="bu-form"><h2 id="bu-title">Add expense</h2>
      <fieldset id="bu-fields">
        <label>Expense name<input name="title" required maxlength="160" placeholder="e.g. Venue deposit"></label>
        <div class="ct-form-grid">
          <label>Category<input name="category" required maxlength="80" list="bu-categories" value="Other"></label>
          <datalist id="bu-categories">
            <option value="Venue"></option><option value="Catering"></option>
            <option value="Photography"></option><option value="Flowers & styling"></option>
            <option value="Attire"></option><option value="Music & entertainment"></option>
            <option value="Transport"></option><option value="Stationery"></option>
            <option value="Other"></option>
          </datalist>
          <label>Supplier (optional)<input name="supplier_name" maxlength="200"></label>
          <label>Estimated cost · AUD<input name="estimated_amount" type="number" min="0" max="9999999999.99" step="0.01" required value="0"></label>
          <label>Confirmed cost · AUD (optional)<input name="confirmed_amount" type="number" min="0" max="9999999999.99" step="0.01"></label>
          <label>Amount paid so far · AUD<input name="paid_amount" type="number" min="0" max="9999999999.99" step="0.01" required value="0"></label>
          <label>Payment due date (optional)<input name="due_date" type="date" min="1900-01-01" max="9999-12-31"></label>
        </div>
        <p class="ct-help">Enter the total paid so far, not just the latest payment.</p>
        <label>Notes (optional)<textarea name="notes" rows="3" maxlength="3000"></textarea></label>
      </fieldset>
      <p id="bu-form-status" role="status"></p>
      <div class="ct-actions"><button id="bu-save" class="ct-primary" type="submit">Save expense</button>
        <button id="bu-close" type="button">Close</button></div>
    </form>
  </dialog>`;
$('bu-profile').href=siteUrl('dashboard/profile/');

const style=el('style','');
style.textContent=`
#bu-content .bu-target{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:24px;border-radius:14px;background:#103e33;color:white;margin-bottom:20px}
#bu-content .bu-target span{font-size:12px}
#bu-content .bu-target h2{color:white;margin:8px 0 0}
#bu-content .bu-target strong{display:block;font:28px Georgia,serif;margin-top:8px}
#bu-content .bu-target a{color:white}
#bu-content .ct-row{padding:14px;align-items:center}
#bu-content .bu-amount{text-align:right;white-space:nowrap}
#bu-empty{padding:24px;border:1px dashed #bdc8be;border-radius:12px;background:white}
#bu-dialog{width:min(680px,calc(100% - 32px))}
#bu-dialog label{margin-bottom:12px}
@media(max-width:600px){#bu-content .ct-row{flex-wrap:wrap}#bu-content .bu-amount{text-align:left}}
`;
document.head.append(style);
const form=$('bu-form'), dialog=$('bu-dialog');
const keys=['title','category','supplier_name','estimated_amount','confirmed_amount','paid_amount','due_date','notes'];
const field=key=>form.elements.namedItem(key);
function message(text){$('bu-status').textContent=text;}
function lock(value){
  busy=value;
  $('bu-fields').disabled=value;
  $('bu-save').disabled=value;
  $('bu-close').disabled=value;
  $('bu-add').disabled=value;
  $('bu-empty-add').disabled=value;
  $('bu-refresh').disabled=value||loading;
  render();
}
function render(){
  if(!loaded||revoked)return;
  const total=rows.reduce((n,r)=>n+cost(r),0);
  const paid=rows.reduce((n,r)=>n+cents(r.paid_amount),0);
  $('bu-target').textContent=target===null?'Not set yet':money(target);
  $('bu-room').textContent=target===null?'—':money(Math.abs(target-total));
  $('bu-room-label').textContent=target!==null&&total>target?'Over budget':'Budget remaining';
  $('bu-total').textContent=money(total);
  $('bu-paid').textContent=money(paid);
  $('bu-outstanding').textContent=money(total-paid);
  const overdueAmount=rows.filter(overdue).reduce((sum,row)=>sum+balance(row),0);
  $('bu-overdue').textContent=money(overdueAmount);
  $('bu-overdue').style.color=overdueAmount>0?'#9b382d':'';
  const scale=Math.max(target || 0,total,paid,1);
  $('bu-bar-paid').style.width=(paid/scale*100)+'%';
  $('bu-bar-unpaid').style.width=(Math.max(0,total-paid)/scale*100)+'%';
  $('bu-bar-room').style.width=(Math.max(0,(target || 0)-total)/scale*100)+'%';
  $('bu-bar-end').textContent=money(Math.max(target || 0,total,paid));
  $('bu-budget-percent').textContent=target>0
    ? Math.round(paid/target*100)+'% of budget paid'
    : 'Budget target not set';
  $('bu-budget-marker').hidden=!(target>0 && total>target);
  $('bu-budget-marker').style.left=((target || 0)/scale*100)+'%';
  $('bu-budget-marker').title='Wedding budget: '+money(target || 0);
  $('bu-chart-note').textContent=target>0
    ? (total>target
        ? 'Expected costs exceed your budget by '+money(total-target)+'. The line marks your budget.'
        : money(Math.max(0,target-total))+' remains outside your recorded expenses.')
    : 'Set your wedding budget to compare your expenses against it.';
  $('bu-spending-bar').setAttribute('aria-label',
    'Wedding budget '+(target===null?'not set':money(target))+
    '. Expected expenses '+money(total)+
    '. Paid '+money(paid)+
    '. Expected still to pay '+money(total-paid)+
    '. Credit usage is not connected yet.');

  const search=$('bu-search').value.trim().toLowerCase();
  const category=$('bu-category').value, state=$('bu-state').value;
  const visible=rows.filter(r=>
    (!search||`${r.title} ${r.supplier_name}`.toLowerCase().includes(search))&&
    (!category||r.category===category)&&
    (!state||(state==='outstanding'?balance(r)>0:state==='overdue'?overdue(r):balance(r)===0))
  ).sort((a,b)=>(a.due_date||'9999-12-31').localeCompare(b.due_date||'9999-12-31')||a.title.localeCompare(b.title));

  $('bu-list').replaceChildren();
  for(const r of visible.slice(0,limit)){
    const row=el('li','','ct-row'), body=el('div','','ct-task-body');
    body.append(el('strong',r.title),el('p',
      `${r.category}${r.supplier_name?' · '+r.supplier_name:''} · ${dateLabel(r.due_date)}`));
    if(overdue(r))body.append(el('span','Overdue','ct-overdue-tag'));
    const amounts=el('div','','bu-amount');
    amounts.append(el('strong',money(cost(r))),el('p',
      `${r.confirmed_amount===null?'Estimated':'Confirmed'} · ${money(balance(r))} left`));
    const actions=el('div','','ct-actions');
    const edit=el('button','Edit'), remove=el('button','Delete');
    edit.type=remove.type='button';
    edit.disabled=remove.disabled=busy||loading;
    edit.setAttribute('aria-label',`Edit ${r.title}`);
    remove.setAttribute('aria-label',`Delete ${r.title}`);
    edit.onclick=()=>openEditor(r);
    let confirming=false;
    remove.onclick=()=>{
      if(busy||loading)return;
      if(!confirming){confirming=true;remove.textContent='Confirm delete';return;}
      void mutate(
        supabase.from('couple_expenses').delete().eq('user_id',owner)
          .eq('id',r.id).eq('updated_at',r.updated_at),
        'Expense removed.',false
      );
    };
    actions.append(edit,remove);row.append(body,amounts,actions);$('bu-list').append(row);
  }
  $('bu-more').hidden=visible.length<=limit;
  $('bu-empty').hidden=visible.length>0;
  $('bu-empty-title').textContent=rows.length?'No matching expenses':'Start with one expense';
  $('bu-empty-text').textContent=rows.length?'Change your filters to see more expenses.':'Add a quote, a planned purchase or a supplier booking to begin tracking your budget.';
  $('bu-empty-add').hidden=rows.length>0;
  $('bu-clear').hidden=!rows.length;
}

async function refresh(){
  if(loading||revoked||!owner)return false;
  loading=true;$('bu-refresh').disabled=true;render();
  try{
    const all=[];
    for(;;){
      const {data,count,error}=await supabase.from('couple_expenses')
        .select('*',{count:'exact'}).eq('user_id',owner)
        .order('id').range(all.length,all.length+499);
      if(revoked)return false;
      if(error||!Array.isArray(data)||count===null)throw new Error();
      all.push(...data);
      if(all.length>=count)break;
      if(!data.length)throw new Error();
    }
    const profile=await supabase.from('couple_profiles')
      .select('wedding_budget').eq('user_id',owner).single();
    if(revoked)return false;
    if(profile.error)throw new Error();
    rows=all;target=profile.data.wedding_budget==null?null:cents(profile.data.wedding_budget);
    loaded=true;
    const selected=$('bu-category').value;
    $('bu-category').replaceChildren(new Option('All categories',''));
    [...new Set(rows.map(r=>r.category))].sort()
      .forEach(value=>$('bu-category').add(new Option(value,value)));
    if([...$('bu-category').options].some(o=>o.value===selected))$('bu-category').value=selected;
    message(`${rows.length} expenses · Totals include all expenses.`);
    return true;
  }catch{
    if(!revoked)message('Could not refresh your budget. Please try again.');
    return false;
  }finally{
    loading=false;
    if(!revoked){$('bu-refresh').disabled=busy;render();}
  }
}
function openEditor(row=null){
  if(busy||loading||revoked)return;
  original=row;form.reset();
  if(row)keys.forEach(key=>field(key).value=row[key]??'');
  $('bu-title').textContent=row?'Edit expense':'Add expense';
  $('bu-form-status').textContent='';
  dialog.showModal();field('title').focus();
}
async function mutate(query,success,close){
  lock(true);
  try{
    const {data,error}=await query.select('id');
    if(revoked)return;
    if(error||data?.length!==1)throw new Error('Could not confirm the change. Refresh expenses before trying again; this expense may have changed elsewhere.');
    if(close)dialog.close();
    window.dispatchEvent(new Event('wedsparks:expenses-changed'));
    if(await refresh())message(success);
  }catch(error){
    if(!revoked){
      if(close)$('bu-form-status').textContent=error.message;
      else message(error.message);
    }
  }finally{if(!revoked)lock(false);}
}
form.onsubmit=event=>{
  event.preventDefault();
  if(busy||revoked||!form.reportValidity())return;
  const values=Object.fromEntries(keys.map(key=>[key,field(key).value.trim()]));
  if(!values.title||!values.category){
    $('bu-form-status').textContent='Enter an expense name and category.';return;
  }
  for(const key of ['estimated_amount','confirmed_amount','paid_amount']){
    values[key]=values[key]===''?null:Number(values[key]);
  }
  values.due_date=values.due_date||null;
  if(cents(values.paid_amount)>cents(values.confirmed_amount??values.estimated_amount)){
    $('bu-form-status').textContent='Amount paid exceeds the cost. Update the confirmed cost first.';return;
  }
  const query=original
    ?supabase.from('couple_expenses').update(values).eq('user_id',owner)
      .eq('id',original.id).eq('updated_at',original.updated_at)
    :supabase.from('couple_expenses').insert({...values,user_id:owner});
  void mutate(query,'Expense saved.',true);
};
$('bu-add').onclick=$('bu-empty-add').onclick=()=>openEditor();
$('bu-close').onclick=()=>{if(!busy)dialog.close();};
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
$('bu-refresh').onclick=()=>{if(!busy)void refresh();};
for(const id of ['bu-search','bu-category','bu-state']){
  $(id).addEventListener(id==='bu-search'?'input':'change',()=>{limit=25;render();});
}
$('bu-clear').onclick=()=>{
  for(const id of ['bu-search','bu-category','bu-state'])$(id).value='';
  limit=25;render();
};
$('bu-more').onclick=()=>{limit+=25;render();};
function refreshVisible(){
  if(owner&&!revoked&&!busy&&!loading&&!dialog.open&&!content.closest('main').hidden&&!document.hidden)void refresh();
}
window.addEventListener('wedsparks:section-open',event=>{
  if(event.detail==='budget')refreshVisible();
});
window.addEventListener('focus',refreshVisible);
onSessionChange(({user})=>{
  if(owner&&user?.id!==owner){
    revoked=true;rows=[];target=null;dialog.close();form.reset();
    content.replaceChildren();content.hidden=true;
    location.replace(siteUrl('login/'));
  }
});
(async()=>{
  try{
    const user=await requireUser();
    if(!user||revoked)return;
    owner=user.id;
    const account=await loadAccount(user);
    if(revoked)return;
    if(!account.roles.includes('couple')){
      location.replace(siteUrl('supplier-account/'));return;
    }
    $('bu-loading').hidden=true;content.hidden=false;
    await refresh();
  }catch{
    if(!revoked)$('bu-loading').textContent='Could not load your account. Refresh to try again.';
  }
})();

// Branded expense category picker
(() => {
  const input=field('category');
  const wrapper=document.createElement('div');
  wrapper.className='bu-category-picker';
  input.parentNode.insertBefore(wrapper,input);
  wrapper.append(input);
  input.removeAttribute('list');
  input.placeholder='Type a category or choose below';
  input.autocomplete='off';
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');
  input.setAttribute('aria-controls','bu-category-options');

  const arrow=document.createElement('button');
  arrow.type='button';
  arrow.textContent='⌄';
  arrow.setAttribute('aria-label','Show categories');
  arrow.setAttribute('aria-expanded','false');
  arrow.setAttribute('aria-controls','bu-category-options');

  const menu=document.createElement('div');
  menu.id='bu-category-options';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label','Expense categories');
  menu.hidden=true;
  wrapper.append(menu);

  const css=document.createElement('style');
  css.textContent=`
    #bu-dialog .bu-category-picker{position:relative}
    #bu-dialog .bu-category-picker input{padding-right:48px;margin-bottom:0}
    #bu-dialog .bu-category-picker>button{
      position:absolute;right:2px;top:2px;bottom:2px;
      width:44px;padding:0;border:0;background:transparent;
      color:#214c3e;font-size:25px;box-shadow:none
    }
    #bu-category-options{
      margin-top:6px;padding:5px;max-height:210px;overflow-y:auto;
      border:1px solid #b7c4bc;border-radius:9px;
      background:#fffdf9;box-shadow:0 5px 16px #173e3314
    }
    #bu-category-options[hidden]{display:none}
    #bu-category-options [role=option]{
      padding:10px 12px;border-radius:5px;color:#214c3e;
      cursor:pointer;font-weight:400
    }
    #bu-category-options [role=option]:first-child{font-weight:600}
    #bu-category-options [role=option]:hover,
    #bu-category-options [aria-selected=true]{
      background:#214c3e;color:white
    }
    #bu-dialog .bu-category-picker>button:focus-visible{
      outline:2px solid #214c3e;outline-offset:-4px
    }`;
  document.head.append(css);

  let active=-1;
  let options=[];
  function close(){
    menu.hidden=true;
    input.setAttribute('aria-expanded','false');
    arrow.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-activedescendant');
    active=-1;
  }
  function highlight(index){
    active=index;
    [...menu.children].forEach((item,i)=>{
      item.setAttribute('aria-selected',String(i===active));
    });
    const item=menu.children[active];
    if(item){
      input.setAttribute('aria-activedescendant',item.id);
      item.scrollIntoView({block:'nearest'});
    }
  }
  function choose(index){
    if(busy||input.disabled)return;
    const value=options[index];
    if(value===null){
      input.value='';
      input.focus();
      show('');
      return;
    }
    if(value===undefined)return;
    input.value=value;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.focus();
    close();
  }
  function show(query=''){
    if(busy||!dialog.open)return;
    const names=new Map();
    [...$('bu-categories').options].map(o=>o.value)
      .concat(rows.map(r=>r.category))
      .forEach(value=>{
        const name=String(value||'').trim();
        if(name&&!names.has(name.toLowerCase()))
          names.set(name.toLowerCase(),name);
      });
    const typed=query.trim();
    const existing=[...names.values()]
      .filter(name=>name.toLowerCase().includes(typed.toLowerCase()))
      .sort((a,b)=>a.localeCompare(b));
    const custom=typed&&!names.has(typed.toLowerCase());
    options=[custom?typed:null,...existing];
    menu.replaceChildren();
    options.forEach((value,index)=>{
      const item=document.createElement('div');
      item.id=`bu-category-option-${index}`;
      item.setAttribute('role','option');
      item.setAttribute('aria-selected','false');
      item.textContent=index===0
        ?(custom?`Use “${typed}”`:'Type a new category…')
        :value;
      item.addEventListener('pointerdown',event=>event.preventDefault());
      item.addEventListener('click',()=>choose(index));
      menu.append(item);
    });
    active=-1;
    input.removeAttribute('aria-activedescendant');
    menu.hidden=false;
    input.setAttribute('aria-expanded','true');
    arrow.setAttribute('aria-expanded','true');
  }
  input.addEventListener('focus',()=>show());
  input.addEventListener('click',()=>show());
  input.addEventListener('input',()=>show(input.value));
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!menu.hidden){
      event.preventDefault();event.stopPropagation();close();
    }else if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(menu.hidden)show();
      const step=event.key==='ArrowDown'?1:-1;
      highlight(active<0?(step>0?0:options.length-1)
        :(active+step+options.length)%options.length);
    }else if(event.key==='Enter'&&!menu.hidden&&active>=0){
      event.preventDefault();choose(active);
    }else if(event.key==='Tab'){
      close();
    }
  });
  arrow.addEventListener('pointerdown',event=>event.preventDefault());
  arrow.addEventListener('click',()=>{
    const wasOpen=!menu.hidden;
    input.focus();
    if(wasOpen)close();else show();
  });
  wrapper.addEventListener('focusout',event=>{
    if(!wrapper.contains(event.relatedTarget))close();
  });
  dialog.addEventListener('click',event=>{
    if(!wrapper.contains(event.target))close();
  });
  dialog.addEventListener('close',close);
  form.addEventListener('reset',close);
})();

// Keep the category menu below its input without stretching the form.
(() => {
  const style=document.createElement('style');
  style.textContent=`
    #bu-dialog .bu-category-picker{position:relative}
    #bu-dialog .bu-category-picker>button{
      top:2px;bottom:auto;height:48px;display:grid;place-items:center
    }
    #bu-dialog #bu-category-options{
      position:absolute;top:100%;left:0;right:0;
      z-index:20;box-sizing:border-box
    }
  `;
  document.head.append(style);
})();