import {supabase} from './supabase-client.js';
import {requireUser,loadAccount,siteUrl,onSessionChange} from './auth.js';
import {
  supplierSections,supplierPageCopy,supplierIcons,supplierRouteFor,supplierSafeUrl
} from './supplier-dashboard-config.js';

const firstMain=document.querySelector('main[data-supplier-page]');
let owner=null,account=null,revoked=false,activePage=null,navigationBusy=false;
let businessPromise=null,inboxBusy=false,inboxDirty=false,inboxChannel=null,inboxTimer=null;
const pages=new Map();
const node=(tag,text,className)=>{
  const el=document.createElement(tag);
  if(text!=null)el.textContent=text;
  if(className)el.className=className;
  return el;
};
function icon(key){
  const el=node('span');
  el.setAttribute('aria-hidden','true');
  el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+(supplierIcons[key]||supplierIcons.overview)+'"/></svg>';
  return el;
}
const routeFor=value=>supplierRouteFor(value,siteUrl(''));
function makeLink(label,path,className){
  const link=node('a',label,className);
  link.href=siteUrl(path);
  return link;
}
function intro(content,key){
  const [title,description]=supplierPageCopy[key];
  const box=node('section',null,'sd-intro');
  const copy=node('div');
  copy.append(node('h2',title),node('p',description));
  box.append(copy);content.append(box);
}
function card(title){
  const box=node('section',null,'sd-card');
  if(title)box.append(node('h2',title));
  return box;
}
function emptyCard(content,key,title,description,note){
  const box=card();
  box.classList.add('sd-empty');
  const mark=node('span',null,'sd-empty-icon');mark.append(icon(key));
  box.append(mark,node('h2',title),node('p',description));
  if(note)box.append(node('p',note,'sd-note'));
  content.append(box);
}
async function business(){
  if(businessPromise)return businessPromise;
  const current=owner;
  businessPromise=(async()=>{
    const mapping=await supabase.from('supplier_vendor_accounts')
      .select('vendor_id').eq('user_id',current).maybeSingle();
    if(mapping.error)throw new Error();
    if(!mapping.data)return null;
    const result=await supabase.from('Vendor Public Profiles')
      .select('vendor_id,"Name of Wedding Vendor","Wedding Vendor Type","Image #1","Location","About Paragraph","Destination URL"')
      .eq('vendor_id',mapping.data.vendor_id).maybeSingle();
    if(result.error)throw new Error();
    return result.data;
  })().catch(error=>{businessPromise=null;throw error;});
  return businessPromise;
}
function detailsCard(title,fields){
  const box=card(title),list=node('dl',null,'sd-details');
  for(const [label,value] of fields){
    const row=node('div');
    row.append(node('dt',label),node('dd',value||'Not added yet'));list.append(row);
  }
  box.append(list);return box;
}
function showBusinessError(content,route){
  const box=card('Your business details');
  box.append(node('p','We could not load your business details. Please try again.'));
  const retry=node('button','Try again','sd-retry');retry.type='button';
  retry.addEventListener('click',()=>void renderPage(content,route));
  box.append(retry);content.append(box);
}
async function renderPage(content,route){
  if(revoked)return;
  content.replaceChildren();intro(content,route.key);
  const placeholders={
    bookings:['book','Your booking space','Confirmed bookings and the details that matter will live here.','Booking tools are coming next.'],
    availability:['calendar','A calendar made for your business','Keep track of the dates you can offer couples and the days you want to keep free.','Availability tools are coming next.'],
    reviews:['review','Kind words, all together','This will be a home for feedback from the couples you have helped celebrate.','Review tools are coming next.'],
    'pricing-packages':['tag','Packages that tell your story','Bring your services, inclusions and pricing together so couples can find their fit.','Package tools are coming next.']
  };
  if(placeholders[route.key]){
    emptyCard(content,...placeholders[route.key]);return;
  }
  if(route.key==='overview'){
    const grid=node('div',null,'sd-grid');
    const pulse=card('Your business pulse');
    const metrics=node('dl',null,'sd-metrics');
    for(const [label,id] of [['Open conversations','sd-open-count'],['Unread messages','sd-unread-count']]){
      const row=node('div'),value=node('dd'),link=makeLink('—','supplier-account/messages/');
      link.id=id;link.setAttribute('aria-live','polite');
      value.append(link);row.append(node('dt',label),value);metrics.append(row);
    }
    pulse.append(metrics);
    const next=card('Make yourself at home');
    const quick=node('div',null,'sd-quick-links');
    for(const key of ['messages','storefront','availability','profile-health']){
      const section=supplierSections.find(item=>item.key===key);
      const link=makeLink('' ,section.path);
      link.append(icon(section.icon),node('span',section.label),node('span','→'));
      quick.append(link);
    }
    next.append(quick);
    const recent=card('Latest enquiries');recent.classList.add('sd-span-all');
    const status=node('p','Loading your conversations…');status.id='sd-inbox-status';status.setAttribute('role','status');
    const list=node('ul',null,'sd-recent-list');list.id='sd-recent-list';
    recent.append(status,list,makeLink('Open Inbox & Enquiries','supplier-account/messages/','sd-primary'));
    grid.append(pulse,next,recent);content.append(grid);
    void refreshInbox();
    return;
  }
  if(route.key==='settings'){
    content.append(detailsCard('Your personal account',[
      ['First name',account.profile.first_name],
      ['Last name',account.profile.last_name],
      ['Email',account.user.email]
    ]));
    const note=node('p','Your sign-in and notification preferences will live here.','sd-note');
    note.style.marginTop='20px';content.append(note);return;
  }
  const waiting=node('p','Loading your business details…','sd-note');content.append(waiting);
  let vendor;
  try{vendor=await business();}catch{if(!revoked){waiting.remove();showBusinessError(content,route);}return;}
  if(revoked)return;
  waiting.remove();
  if(!vendor){
    emptyCard(content,'store','Your business, ready to take shape',
      'Your storefront and business details will appear here once your supplier profile is set up.');
    return;
  }
  const name=vendor['Name of Wedding Vendor']||'Your business';
  const profileUrl=supplierSafeUrl(vendor['Destination URL'],siteUrl(''));
  if(route.key==='storefront'){
    const box=card();box.classList.add('sd-storefront');
    const imageUrl=supplierSafeUrl(vendor['Image #1'],siteUrl(''));
    if(imageUrl){
      const img=node('img');img.src=imageUrl;img.alt=name;img.addEventListener('error',()=>img.remove());box.append(img);
    }
    const copy=node('div');
    copy.append(node('p',vendor['Wedding Vendor Type']||'Wedding supplier','sd-category'),node('h2',name));
    if(vendor.Location)copy.append(node('p',vendor.Location));
    if(vendor['About Paragraph'])copy.append(node('p',vendor['About Paragraph']));
    if(profileUrl){const link=node('a','View your public profile','sd-primary');link.href=profileUrl;link.target='_blank';link.rel='noopener';copy.append(link);}
    box.append(copy);content.append(box);return;
  }
  if(route.key==='account-settings'){
    content.append(detailsCard('Your supplier account',[
      ['Business name',name],['Supplier category',vendor['Wedding Vendor Type']],
      ['Location',vendor.Location],['Account email',account.user.email]
    ]));return;
  }
  if(route.key==='profile-health'){
    const fields=[
      ['Business name',vendor['Name of Wedding Vendor']],
      ['Supplier category',vendor['Wedding Vendor Type']],
      ['Main image',supplierSafeUrl(vendor['Image #1'],siteUrl(''))],
      ['About your business',vendor['About Paragraph']],
      ['Location',vendor.Location]
    ];
    const complete=fields.filter(([,value])=>String(value||'').trim()).length;
    const box=card('Your storefront essentials');
    box.append(node('p',complete+' of '+fields.length+' essentials added'));
    const bar=node('div',null,'sd-health-bar');
    bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Storefront essentials');
    bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(fields.length));bar.setAttribute('aria-valuenow',String(complete));
    const fill=node('span');fill.style.width=(complete/fields.length*100)+'%';bar.append(fill);
    const list=node('ul',null,'sd-health');
    for(const [label,value] of fields){
      const done=!!String(value||'').trim(),row=node('li');
      row.append(node('span',done?'✓':'○','sd-check'+(done?' is-complete':'')),
        node('span',label),node('small',done?'Added':'To add','sd-note'));list.append(row);
    }
    box.append(bar,list,makeLink('Open your storefront','supplier-account/storefront/','sd-primary'));
    content.append(box);
  }
}
function overviewVisible(){
  const page=pages.get('overview');
  return !!owner&&!revoked&&page?.main===activePage?.main&&!document.hidden;
}
async function refreshInbox(){
  if(!overviewVisible())return;
  if(inboxBusy){inboxDirty=true;return;}
  inboxBusy=true;inboxDirty=false;
  const current=owner,content=pages.get('overview').main;
  try{
    const {data,error}=await supabase.rpc('get_message_inbox',{p_status:'open',p_category:'',p_limit:3,p_offset:0});
    if(revoked||owner!==current)return;
    if(error||!Array.isArray(data?.rows))throw new Error();
    content.querySelector('#sd-open-count').textContent=Number(data.total||0).toLocaleString('en-AU');
    content.querySelector('#sd-unread-count').textContent=Number(data.unread_total||0).toLocaleString('en-AU');
    content.querySelector('#sd-inbox-status').textContent=data.rows.length?'':'Your next enquiry starts here. Conversations with couples will appear as they get in touch.';
    const list=content.querySelector('#sd-recent-list');
    const signature=JSON.stringify(data.rows);
    if(list.dataset.signature!==signature){
      list.dataset.signature=signature;
      list.replaceChildren(...data.rows.map(row=>{
        const item=node('li'),link=makeLink('','supplier-account/messages/');
        const url=new URL(link.href);url.searchParams.set('conversation',row.id);
        link.href=url.href;link.target='_self';
        link.append(node('strong',row.couple_name||'Couple'),
          node('span',row.last_message||'Start your conversation'));
        const detail=[row.business_name,Number(row.unread_count)>0?row.unread_count+' unread':''].filter(Boolean).join(' · ');
        if(detail)link.append(node('small',detail));
        item.append(link);return item;
      }));
    }
  }catch{
    if(!revoked&&owner===current)content.querySelector('#sd-inbox-status').textContent='Conversations will reconnect automatically.';
  }finally{
    inboxBusy=false;
    if(inboxDirty){inboxDirty=false;queueInbox();}
  }
}
function queueInbox(){
  if(!overviewVisible()||inboxTimer!==null)return;
  inboxTimer=setTimeout(()=>{inboxTimer=null;void refreshInbox();},160);
}
function stopInbox(){
  clearTimeout(inboxTimer);inboxTimer=null;
  const previous=inboxChannel;inboxChannel=null;
  if(previous)try{void supabase.removeChannel(previous).catch(()=>{});}catch{}
}
function subscribeInbox(){
  if(!owner||revoked||inboxChannel)return;
  const current=owner,changed=()=>{if(owner===current&&!revoked)queueInbox();};
  try{
    inboxChannel=supabase.channel('supplier-overview:'+owner)
      .on('postgres_changes',{event:'*',schema:'public',table:'supplier_conversations'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'supplier_messages'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'supplier_conversation_reads'},changed);
    inboxChannel.subscribe(status=>{if(status==='SUBSCRIBED')changed();});
  }catch{stopInbox();}
}
async function mountPage(page,route){
  if(page.mounted)return;
  const content=page.main.querySelector('[data-supplier-content]');
  page.main.querySelector('[data-supplier-loading]').hidden=true;
  page.main.querySelector('[data-supplier-private]').hidden=false;
  if(route.key==='messages'){
    await import('./messages.js');
    const title=page.main.querySelector('.msg-heading h2');
    const copy=page.main.querySelector('.msg-heading p');
    if(title)title.textContent='Inbox & Enquiries';
    if(copy)copy.textContent='Your enquiries and conversations with couples.';
  }else await renderPage(content,route);
  page.mounted=true;
}
if(firstMain){
  const initial=routeFor(location.href);
  const shell=node('div',null,'ws-dashboard-shell');
  const details=node('details',null,'ws-dashboard-navigation');
  const summary=node('summary');details.append(summary);
  const nav=node('nav');nav.setAttribute('aria-label','Supplier dashboard');
  for(const section of supplierSections){
    if(section.group==='user')nav.append(node('p','User settings','sd-nav-group'));
    const link=makeLink('',section.path);
    link.append(icon(section.icon),node('span',section.label));
    link.dataset.supplierSection=section.key;nav.append(link);
  }
  details.append(nav);firstMain.before(shell);shell.append(details,firstMain);
  const mobile=matchMedia('(max-width:700px)');
  const updateMenu=()=>{details.open=!mobile.matches;};
  updateMenu();mobile.addEventListener('change',updateMenu);
  const banner=node('section',null,'ws-profile-photo-banner');
  banner.setAttribute('aria-labelledby','supplier-page-title');
  const image=node('img');image.src=siteUrl('assets/background.jpg');image.alt='';image.decoding='async';
  image.addEventListener('error',()=>{image.hidden=true;});
  const copy=node('div',null,'ws-profile-photo-copy');
  const title=firstMain.querySelector('h1');title.id='supplier-page-title';
  copy.append(node('p','Your business, your way'),title);banner.append(image,copy);shell.before(banner);
  const navNotice=node('p',null,'ws-profile-status');navNotice.hidden=true;navNotice.setAttribute('role','status');details.append(navNotice);

  function updateNavigation(route){
    title.textContent=route.label;
    document.title=route.label+' — WedSparks';
    summary.textContent=route.label+' · Change section';
    document.body.dataset.page=route.key;
    nav.querySelectorAll('a').forEach(link=>{
      if(link.dataset.supplierSection===route.key)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if(mobile.matches)details.open=false;
  }
  async function showSection(route,push){
    if(navigationBusy||revoked||!account)return;
    navigationBusy=true;navNotice.hidden=true;shell.setAttribute('aria-busy','true');
    let added=null;
    try{
      let page=pages.get(route.key);
      if(!page){
        const response=await fetch(siteUrl(route.path),{credentials:'same-origin'});
        if(!response.ok)throw new Error();
        const parsed=new DOMParser().parseFromString(await response.text(),'text/html');
        const next=parsed.querySelector('main[data-supplier-page]');
        if(!next)throw new Error();
        const imported=document.importNode(next,true);
        imported.querySelectorAll('script').forEach(script=>script.remove());
        imported.querySelector('h1')?.remove();
        imported.hidden=true;shell.append(imported);added=imported;
        page={main:imported,mounted:false};pages.set(route.key,page);
      }
      if(revoked)return;
      const previous=activePage;
      // Mount before switching so a failed fetch leaves the current page intact.
      await mountPage(page,route);
      if(revoked)return;
      if(previous)previous.main.hidden=true;
      page.main.hidden=false;activePage=page;
      updateNavigation(route);
      if(push)history.pushState({supplier:route.key},'',siteUrl(route.path));
      window.dispatchEvent(new CustomEvent('wedsparks:section-open',{detail:route.key}));
      if(route.key==='overview')void refreshInbox();
    }catch{
      if(added){added.remove();pages.delete(route.key);}
      if(!revoked){navNotice.textContent='We could not open that section. Please try again.';navNotice.hidden=false;}
    }finally{navigationBusy=false;shell.removeAttribute('aria-busy');}
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href]');
    if(!link||link.target||link.hasAttribute('download'))return;
    const route=routeFor(link.href);if(!route)return;
    event.preventDefault();
    if(pages.get(route.key)?.main===activePage?.main)return;
    void showSection(route,true);
  });
  window.addEventListener('popstate',()=>{
    const route=routeFor(location.href);
    if(route&&navigationBusy)location.reload();
    else if(route)void showSection(route,false);
  });
  onSessionChange(({user})=>{
    if(owner&&user?.id!==owner){
      revoked=true;owner=null;account=null;businessPromise=null;stopInbox();
      for(const page of pages.values()){
        page.main.hidden=true;page.main.querySelector('[data-supplier-private]')?.replaceChildren();
      }
      location.replace(siteUrl('login/'));
    }
  });
  async function start(){
    const status=firstMain.querySelector('[data-supplier-loading]');
    try{
      const user=await requireUser(location.pathname+location.search);
      if(!user||revoked)return;
      owner=user.id;
      const result=await loadAccount(user);
      if(revoked||owner!==user.id)return;
      if(!result.roles.includes('supplier')){location.replace(siteUrl('dashboard/'));return;}
      account=result;
      const page={main:firstMain,mounted:false};
      activePage=page;pages.set(initial.key,page);updateNavigation(initial);
      await mountPage(page,initial);
      if(revoked)return;
      subscribeInbox();
      if(initial.key==='overview')void refreshInbox();
    }catch{
      if(!revoked){status.hidden=false;status.textContent='Could not load your supplier dashboard. Refresh to try again.';}
    }
  }
  void start();
}
window.addEventListener('wedsparks:messages-changed',queueInbox);
window.addEventListener('focus',queueInbox);
window.addEventListener('online',queueInbox);
window.addEventListener('pagehide',stopInbox);
window.addEventListener('pageshow',()=>{subscribeInbox();queueInbox();});
document.addEventListener('visibilitychange',queueInbox);
setInterval(queueInbox,12000);
