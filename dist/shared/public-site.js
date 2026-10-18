import {creditMilestone,planningTasks,timelineMoments,timelineTime,budgetAllocation} from './public-tools-model.js';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const money=(n,currency='AUD')=>new Intl.NumberFormat('en-AU',{style:'currency',currency,maximumFractionDigits:0}).format(n);
// Keep supplier sign-up return paths correct on localhost and under Pages' base path.
const publicBase=new URL('../',import.meta.url);
for(const a of document.querySelectorAll('a[href*="signup/?experience=supplier"]')){
 const target=new URL(a.href);if(target.origin!==publicBase.origin)continue;
 const destination=target.searchParams.get('returnTo')?.endsWith('/supplier-profile-import/')?'supplier-profile-import/':'supplier-account/storefront/';
 target.searchParams.set('returnTo',new URL(destination,publicBase).pathname);a.href=target.href;
}
if(document.body.dataset.publicPage==='true'){
  const button=document.querySelector('.mobile-menu-toggle'),menu=document.querySelector('.mobile-nav-panel');
  function close(){if(menu)menu.hidden=true;button?.setAttribute('aria-expanded','false');}
  button?.addEventListener('click',()=>{menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.addEventListener('click',e=>{if(!e.target.closest('.public-header'))close();});
}
document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
const reward=document.querySelector('[data-credit-calculator]');
if(reward){
 const input=reward.querySelector('#credit-spend');
 const paint=()=>{const spend=Number(input.value)||0,credits=creditMilestone(spend);reward.querySelector('[data-spend]').textContent=money(spend);reward.querySelector('[data-reward]').textContent=money(credits);reward.querySelector('[data-purchasing-power]').textContent=money(spend+credits);};
 input.addEventListener('input',paint);paint();
}
const budget=document.querySelector('[data-budget-tool]');
if(budget){
 const rows=budget.querySelector('[data-budget-rows]'),total=budget.querySelector('#budget-total'),guests=budget.querySelector('#budget-guests'),currency=budget.querySelector('#budget-currency');
 const categories=[['Venue, food & drinks',45],['Photography & video',15],['Outfits & accessories',10],['Flowers & styling',8],['Music & entertainment',7],['Other details',5],['A little breathing room',10]];
 const fields=[];
 for(const [name,value] of categories){const row=node('div',null,'public-budget-row'),label=node('label',name),input=node('input'),amount=node('strong'),bar=node('div',null,'public-budget-bar'),fill=node('span');input.type='number';input.min='0';input.max='100';input.value=value;input.id='allocation-'+fields.length;input.setAttribute('aria-label',name+' allocation percentage');label.htmlFor=input.id;bar.append(fill);row.append(label,input,amount,bar);rows.append(row);fields.push({input,amount,fill});}
 function paint(){const percentages=fields.map(f=>Math.min(100,Math.max(0,Number(f.input.value)||0))),values=budgetAllocation(Math.min(10000000,Number(total.value)),percentages);if(!values){budget.querySelector('[data-budget-remaining]').textContent='Enter a valid budget.';return;}budget.querySelector('[data-per-guest]').textContent=money((Number(total.value)||0)/Math.max(1,Number(guests.value)||1),currency.value);fields.forEach((f,i)=>{f.amount.textContent=money(values[i],currency.value);f.fill.style.width=percentages[i]+'%';});const allocated=percentages.reduce((n,p)=>n+p,0);budget.querySelector('[data-budget-remaining]').textContent=allocated===100?'100% of your budget allocated.':allocated<100?`${100-allocated}% of your budget is still unallocated.`:`Your allocation is ${allocated-100}% over your budget.`;}
 budget.addEventListener('input',paint);budget.addEventListener('change',paint);paint();
}
const checklist=document.querySelector('[data-checklist]');
if(checklist){
 const storageKey='wedsparks.public-checklist.v1';let checked=[];try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))checked=saved;}catch{}
 const inputs=[],list=checklist.querySelector('[data-checklist-items]');
 for(const [group,tasks] of planningTasks){const section=node('section',null,'public-checklist-group');section.append(node('h3',group));for(const task of tasks){const label=node('label',null,'public-check-task'),input=node('input');input.type='checkbox';input.checked=checked.includes(task);inputs.push([input,task]);label.append(input,node('span',task));section.append(label);}list.append(section);}
 function paint(){const selected=inputs.filter(([i])=>i.checked).map(([,t])=>t);checklist.querySelector('[data-checklist-progress]').textContent=selected.length+' of '+inputs.length+' tasks ticked';checklist.querySelector('[data-checklist-fill]').style.width=(selected.length/inputs.length*100)+'%';try{localStorage.setItem(storageKey,JSON.stringify(selected));}catch{}}
 checklist.addEventListener('change',paint);checklist.querySelector('[data-checklist-reset]').addEventListener('click',()=>{inputs.forEach(([i])=>{i.checked=false;});paint();});paint();
}
const timeline=document.querySelector('[data-timeline]');
if(timeline){const ceremony=timeline.querySelector('#ceremony-time'),rows=timeline.querySelector('[data-timeline-rows]'),times=[];for(const [offset,title] of timelineMoments){const row=node('div',null,'public-timeline-row'),time=node('strong'),input=node('input');input.value=title;input.maxLength=150;input.setAttribute('aria-label','Moment '+title);times.push([time,offset]);row.append(time,input);rows.append(row);}const paint=()=>times.forEach(([time,offset])=>{time.textContent=timelineTime(ceremony.value,offset)||'—';});ceremony.addEventListener('input',paint);paint();}
const contact=document.querySelector('[data-contact-draft]');
if(contact)contact.addEventListener('submit',e=>{e.preventDefault();if(!contact.reportValidity())return;const body='WedSparks enquiry draft\nName: '+contact.querySelector('#contact-name').value+'\nEmail: '+contact.querySelector('#contact-email').value+'\nTopic: '+contact.querySelector('#contact-topic').value+'\n\n'+contact.querySelector('#contact-message').value;const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'})),a=node('a');a.href=url;a.download='wedsparks-enquiry-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);contact.querySelector('[role=status]').textContent='Enquiry draft downloaded. No message has been sent.';});
