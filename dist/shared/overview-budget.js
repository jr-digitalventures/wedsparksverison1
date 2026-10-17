import {supabase} from './supabase-client.js';
import {siteUrl,onSessionChange} from './auth.js';

let owner=null,revision=0,inFlight=false,revoked=false;
const byId=id=>document.getElementById('overview-budget-'+id);
const cents=value=>Math.round(Number(value||0)*100);
const money=value=>new Intl.NumberFormat('en-AU',{
  style:'currency',currency:'AUD',minimumFractionDigits:0,maximumFractionDigits:0
}).format(value/100);
const cost=row=>cents(row.confirmed_amount??row.estimated_amount);
const balance=row=>Math.max(0,cost(row)-cents(row.paid_amount));
const visible=()=>byId('status') &&
  !byId('status').closest('main').hidden &&
  !document.getElementById('private-content').hidden &&
  !document.hidden;

function mount(){
  if(byId('status'))return true;
  const root=document.getElementById('private-content');
  if(!root)return false;
  const heading=[...root.querySelectorAll('h2')]
    .find(node=>node.textContent.trim()==='Upcoming payments');
  if(!heading)return false;
  const card=heading.closest('section');
  card.innerHTML=`
    <h2>Next payments</h2>
    <p id="overview-budget-status" role="status"></p>
    <ul id="overview-budget-list"></ul>
    <button id="overview-budget-retry" type="button" hidden>Try again</button>
    <a id="overview-budget-link" class="overview-task-link">Open budget &amp; payments →</a>
  `;
  const paymentLabel=[...root.querySelectorAll('dt')]
    .find(node=>['Pending payments','Overdue payments'].includes(node.textContent.trim()));
  if(paymentLabel)paymentLabel.textContent='Overdue payments';
  const count=paymentLabel?.parentElement.querySelector('dd');
  if(count){
    count.id='overview-budget-count';
    count.setAttribute('aria-live','polite');
    count.removeAttribute('aria-label');
  }
  const note=[...root.querySelectorAll('p')].find(node=>
    node.textContent.includes('Messages and payment tracking are coming next.'));
  if(note)note.textContent=
    'Tasks, payments and RSVPs update automatically. Messages are coming next.';
  byId('link').href=siteUrl('dashboard/budget/');
  byId('retry').onclick=()=>void refreshOverviewBudget();
  const style=document.createElement('style');
  style.textContent=`
    #overview-budget-list{padding:0;margin:0 0 18px;list-style:none}
    #overview-budget-list li{padding:12px 0;border-bottom:1px solid #dddcd5}
    #overview-budget-list a{display:flex;justify-content:space-between;
      gap:12px;color:#214c3e;text-decoration:none}
    #overview-budget-list a:hover{text-decoration:underline}
    #overview-budget-list small{display:block;margin-top:4px}
    #overview-budget-list .is-overdue{color:#9b382d}
    #overview-budget-retry[hidden]{display:none}
  `;
  document.head.append(style);
  return true;
}

async function readExpenses(userId){
  const all=[];
  for(;;){
    const {data,count,error}=await supabase.from('couple_expenses')
      .select('id,title,category,estimated_amount,confirmed_amount,paid_amount,due_date',
        {count:'exact'})
      .eq('user_id',userId).order('id').range(all.length,all.length+499);
    if(error||!Array.isArray(data)||count===null)throw new Error();
    all.push(...data);
    if(all.length>=count)return all;
    if(!data.length)throw new Error();
  }
}

export async function refreshOverviewBudget(userId=owner){
  if(!userId||revoked||!mount())return;
  owner=userId;
  const request=++revision;
  inFlight=true;
  if(!document.querySelector('.wo-milestone')?.dataset.spendingLoaded) updateSpendingIllustration(null);
  if(!byId('status').textContent) byId('status').textContent='Loading your budget…';
  byId('retry').hidden=true;
  try{
    const rows=await readExpenses(userId);
    if(revoked||request!==revision)return;
    const paid=rows.reduce((sum,row)=>sum+cents(row.paid_amount),0);
    updateSpendingIllustration(paid);
    const now=new Date();
    const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const pending=rows.filter(row=>balance(row)>0);
    const late=pending.filter(row=>row.due_date&&row.due_date<today);
    const overdue=late.reduce((sum,row)=>sum+balance(row),0);


    if(byId('count')){
      byId('count').textContent=money(overdue);
      byId('count').setAttribute('aria-label',
        `${money(overdue)} overdue`);
    }

    pending.sort((a,b)=>
      (a.due_date||'9999-99-99').localeCompare(b.due_date||'9999-99-99')
      ||a.title.localeCompare(b.title));
    byId('list').replaceChildren();
    // Compact next payments
    for(const row of pending.slice(0,4)){
      const item=document.createElement('li');
      const link=document.createElement('a');
      link.href=siteUrl('dashboard/budget/');

      const name=document.createElement('span');
      name.className='payment-name';
      name.textContent=row.title;
      name.title=row.title;

      const category=document.createElement('span');
      category.className='payment-category';
      category.textContent=row.category||'Other';
      category.title=row.category||'Other';

      const amount=document.createElement('strong');
      amount.textContent=money(balance(row));

      link.setAttribute('aria-label',
        `${row.title}, ${row.category||'Other'}, ${money(balance(row))} owed`);
      link.append(name,category,amount);
      item.append(link);
      byId('list').append(item);
    }
    byId('status').hidden=pending.length>0;
    byId('status').textContent=pending.length?''
      :rows.length?'All recorded expenses are paid.':'No payments added yet.';
  }catch{
    if(revoked||request!==revision)return;
    for(const key of ['target','room','total','paid','unpaid','overdue','count']){
      if(byId(key))byId(key).textContent='—';
    }
    byId('count')?.setAttribute('aria-label','Payment totals unavailable');
    byId('list').replaceChildren();
    byId('status').hidden=false;
    byId('status').textContent='Couldn’t load payments. Please try again.';
    byId('retry').hidden=false;
  }finally{
    if(request===revision)inFlight=false;
  }
}

function refreshVisible(){
  if(owner&&!revoked&&!inFlight&&visible())void refreshOverviewBudget();
}
window.addEventListener('wedsparks:expenses-changed',refreshVisible);
window.addEventListener('focus',refreshVisible);
document.addEventListener('visibilitychange',refreshVisible);

onSessionChange(({user})=>{
  if(owner&&user?.id!==owner){
    revoked=true;revision++;owner=null;
    byId('list')?.replaceChildren();
    const root=document.getElementById('private-content');
    if(root)root.hidden=true;
  }
});

// Recorded spending illustration
function updateSpendingIllustration(paid){
  const root=document.getElementById('private-content');
  const milestone=root?.querySelector('.wo-milestone');
  if(!milestone)return;
  const known=paid!==null;
  if(!known&&milestone.dataset.spendingLoaded)return;

  // Milestone first, credit balances underneath.
  const balances=milestone.querySelector('.wo-live-credits');
  if(balances&&milestone.lastElementChild!==balances){
    milestone.append(balances);
    balances.style.borderBottom='0';
    balances.style.borderTop='1px solid rgba(255,255,255,.25)';
    balances.style.marginTop='24px';
    balances.style.paddingTop='20px';
    balances.style.marginBottom='0';
    balances.style.paddingBottom='0';
  }

  const step=1000000;
  const completed=known?Math.floor(paid/step):0;
  const progress=known?paid%step:0;
  const nextGoal=(completed+1)*step;

  milestone.querySelector('.wo-heading-row h3').textContent=
    'Next credit milestone';
  milestone.querySelector('.wo-heading-row strong').textContent='$1,000';

  const track=milestone.querySelector('.wo-track');
  track.removeAttribute('aria-hidden');
  track.setAttribute('role','img');
  track.setAttribute('aria-label',known
    ?`${money(progress)} towards the next $10,000 milestone, based on recorded payments.`
    :'Spending progress loading');

  [...track.children].forEach((segment,index)=>{
    const fill=known?Math.max(0,Math.min(100,(progress/step*4-index)*100)):0;
    segment.style.background=
      `linear-gradient(to right,#f1d995 ${fill}%,transparent ${fill}%)`;
  });

  const labels=milestone.querySelectorAll('.wo-track-labels span');
  labels[0].textContent='Recorded payments: '+(known?money(paid):'—');
  labels[1].textContent='Next spending goal: '+(known?money(nextGoal):'—');

  const remaining=milestone.querySelector('.wo-remaining');
  remaining.replaceChildren(document.createTextNode('Remaining to next reward: '));
  const value=document.createElement('strong');
  value.textContent=known?money(nextGoal-paid):'—';
  remaining.append(value);

  root.querySelector('.wo-credit-note').textContent=
    'Progress uses recorded payments. Credits are awarded on verified eligible WedSparks spending.';
  if(known)milestone.dataset.spendingLoaded='true';
}

(() => {
  const style=document.createElement('style');
  style.textContent=`
    #overview-budget-list li{padding:9px 0}
    #overview-budget-list a{
      display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;
      align-items:center;gap:12px;font-size:14px;
    }
    #overview-budget-list .payment-name,
    #overview-budget-list .payment-category{
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    }
    #overview-budget-list .payment-category{color:#657269;font-size:13px}
    #overview-budget-list strong{white-space:nowrap}
    #overview-budget-status[hidden]{display:none!important}
  `;
  document.head.append(style);
})();