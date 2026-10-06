const SB='https://vfdtyxcfrqnqdyuimtho.supabase.co',KEY='sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd',PAGE=15;
const list=document.querySelector('.supplier-results-list'),pager=document.querySelector('.supplier-pagination'),featured=document.querySelector('.featured-supplier-card'),count=document.querySelector('#supplier-results-title>span:first-child');
const template=list?.querySelector('.supplier-listing-card')?.cloneNode(true),spark='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z"/></svg>';
const state={rows:[],category:'',locationState:'',locationCity:'',locationNational:false,price:'',style:'',date:'',page:0};
const val=(r,k)=>r?.[k]??'',clean=v=>String(v??'').trim(),norm=v=>clean(v).toLowerCase(),split=v=>clean(v).split(/[,;|\n]+/).map(x=>x.trim()).filter(Boolean);
const safe=v=>{try{const u=new URL(clean(v),location.href);return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}};
const money=v=>{const s=clean(v),n=Number(s.replace(/[^0-9.]/g,''));return s&&Number.isFinite(n)?new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(n):s};
const trunc=(v,n)=>{const s=clean(v);if(s.length<=n)return s;const cut=s.slice(0,n-3),i=cut.lastIndexOf(' ');return`${cut.slice(0,i>0?i:cut.length).trimEnd()}...`};
const images=r=>Array.from({length:10},(_,i)=>safe(val(r,`Image #${i+1}`))).filter(Boolean),yes=r=>['yes','true','1'].includes(norm(val(r,'Highlighted Record')??val(r,'Highlighted Record Column')));
const normalDate=v=>{const s=clean(v),iso=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/),au=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(iso)return`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;if(au)return`${au[3]}-${au[2].padStart(2,'0')}-${au[1].padStart(2,'0')}`;const d=new Date(s);return Number.isNaN(d.getTime())?s:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const filterTriggers=[...document.querySelectorAll('[data-filter-trigger]')],headingTriggers=[...document.querySelectorAll('[data-heading-filter]')];
const closeAll=()=>[...filterTriggers,...headingTriggers].forEach(t=>{t.setAttribute('aria-expanded','false');const m=document.getElementById(t.dataset.filterTrigger||t.dataset.headingFilter);if(m)m.hidden=true});
[...filterTriggers,...headingTriggers].forEach(t=>{const m=document.getElementById(t.dataset.filterTrigger||t.dataset.headingFilter);t.addEventListener('click',e=>{e.stopPropagation();const open=m.hidden;closeAll();m.hidden=!open;t.setAttribute('aria-expanded',String(open));if(open&&t.dataset.headingFilter==='heading-location-options')openLocationMenu()})});
document.addEventListener('click',e=>{if(!e.target.closest('.supplier-filter,.supplier-heading-filter'))closeAll()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
const label=(t,s,on=true)=>{const x=t?.querySelector('span');if(x)x.textContent=s;t?.classList.toggle('is-selected',on)};
// Only multi-value fields such as styles are split at commas.
const unique=(k,multiple=false)=>[...new Set(state.rows.flatMap(r=>multiple?split(val(r,k)):[clean(val(r,k))]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'en-AU'));
const menu=(id,items,all,fn)=>{const m=document.getElementById(id);m?.replaceChildren();[all,...items].forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.textContent=x;b.onclick=()=>fn(i?x:'');m?.append(b)})};

// The display-only Location column is never used to build or match search options.
function locationGroups() {
  const regions = new Map();
  state.rows.forEach(record => {
    const region = clean(val(record, 'Location - State'));
    const city = clean(val(record, 'Location - Suburb/City'));
    if (!region) return;
    const key = norm(region);
    if (!regions.has(key)) regions.set(key, { name: region, cities: new Map() });
    if (city && !regions.get(key).cities.has(norm(city))) regions.get(key).cities.set(norm(city), city);
  });
  return [...regions.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-AU')).map(region => ({
    name: region.name,
    cities: [...region.cities.values()].sort((a, b) => a.localeCompare(b, 'en-AU')),
  }));
}

const locationControls = [];
const locationUI = { active: '', pane: 'states', groups: [] };
const stateAbbreviations = {
  'new south wales': 'NSW',
  victoria: 'VIC',
  queensland: 'QLD',
  'western australia': 'WA',
  'south australia': 'SA',
  tasmania: 'TAS',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
};
function updateLocationLabel() {
  const stateLabel = stateAbbreviations[norm(state.locationState)] || state.locationState;
  const text = state.locationCity ? `${state.locationCity}, ${stateLabel}` : stateLabel || (state.locationNational ? 'Australia' : '');
  label(document.querySelector('[data-heading-filter="heading-location-options"]'), text || 'LOCATION', !!text);
  locationControls.forEach(({ button, region, city, stateRow }) => {
    const selected = norm(region) === norm(state.locationState) && (stateRow || norm(city) === norm(state.locationCity));
    button.setAttribute('aria-pressed', String(selected));
  });
}

function positionLocationMenu() {
  const menu = document.getElementById('heading-location-options');
  if (menu.hidden) return;
  // Keep the desktop panel aligned to the start of “IN”, regardless of label length.
  menu.style.setProperty('--location-offset', '0px');
  const filter = menu.closest('.supplier-heading-filter');
  const anchor = document.querySelector('.supplier-location-anchor');
  const anchorOffset = window.matchMedia('(min-width: 901px)').matches && filter && anchor
    ? anchor.getBoundingClientRect().left - filter.getBoundingClientRect().left
    : 0;
  if (anchorOffset) {
    const available = window.innerWidth - 16 - (filter.getBoundingClientRect().left + anchorOffset);
    menu.style.setProperty('--location-width', Math.min(760, Math.max(320, available)) + 'px');
  } else {
    menu.style.setProperty('--location-width', 'min(380px, calc(100vw - 32px))');
  }
  menu.style.setProperty('--location-offset', anchorOffset + 'px');
  const box = menu.getBoundingClientRect();
  const offset = anchorOffset + Math.max(16 - box.left, 0);
  menu.style.setProperty('--location-offset', offset + 'px');
}
function openLocationMenu() {
  locationUI.active = state.locationState || locationUI.groups[0]?.name || '';
  locationUI.pane = 'states';
  drawLocationMenu();
  positionLocationMenu();
}
function chooseLocation(region, city = '', close = false, national = false) {
  state.locationState = region;
  state.locationCity = city;
  state.locationNational = national;
  state.page = 0;
  updateLocationLabel();
  render();
  if (close) closeAll();
}
function drawLocationMenu() {
  const container = document.getElementById('heading-location-options');
  container.replaceChildren();
  container.setAttribute('data-pane', locationUI.pane);
  locationControls.length = 0;
  const block = (className, text = '') => {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    return node;
  };
  const button = (text, action, className = '') => {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = text; node.className = className;
    node.onclick = event => { event?.stopPropagation(); action(); };
    return node;
  };
  const choice = (text, region, city, stateRow, action) => {
    const node = button(text, action, stateRow ? 'supplier-location-state' : 'supplier-location-choice');
    node.setAttribute('data-location-state', region);
    node.setAttribute('data-location-city', city);
    locationControls.push({ button: node, region, city, stateRow });
    return node;
  };
  const states = block('supplier-location-states');
  const heading = block('supplier-location-heading', 'Select a state');
  heading.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>Select a state</span>';
  states.append(heading);
  const stateList = block('supplier-location-state-list');
  const national = choice('All locations', '', '', true, () => chooseLocation('', '', true, true));
  national.className += ' supplier-location-national';
  stateList.append(national);
  locationUI.groups.forEach(region => {
    const node = choice(region.name, region.name, '', true, () => {
      locationUI.active = region.name;
      locationUI.pane = 'locations';
      chooseLocation(region.name);
      drawLocationMenu();
      // On the drill-down view, focus the Back control after replacing the state list.
      positionLocationMenu();
      if (window.matchMedia('(max-width: 900px)').matches) locationUI.back.focus();
      else locationUI.activeButton?.focus();
    });
    node.setAttribute('data-active', String(norm(region.name) === norm(locationUI.active)));
    stateList.append(node);
  });
  states.append(stateList);
  container.append(states);
  const locations = block('supplier-location-detail');
  const back = button('← Back', () => {
    locationUI.pane = 'states'; drawLocationMenu(); positionLocationMenu();
    locationUI.activeButton?.focus();
  }, 'supplier-location-back');
  locationUI.back = back;
  locations.append(back);
  locations.append(block('supplier-location-heading', locationUI.active || 'Select a state'));
  const all = button('All', () => chooseLocation(locationUI.active, '', true), 'supplier-location-all');
  all.setAttribute('aria-label', `All locations in ${locationUI.active}`);
  all.setAttribute('aria-pressed', String(!state.locationCity && norm(state.locationState) === norm(locationUI.active)));
  locations.append(all);
  const cityList = block('supplier-location-city-list');
  const region = locationUI.groups.find(item => norm(item.name) === norm(locationUI.active));
  (region?.cities || []).forEach(city => cityList.append(choice(city, region.name, city, false, () => chooseLocation(region.name, city, true))));
  if (!region?.cities.length) cityList.append(block('supplier-location-empty', 'No suburbs or cities available.'));
  locations.append(cityList);
  container.append(locations);
  locationUI.activeButton = locationControls.find(item => item.stateRow && norm(item.region) === norm(locationUI.active))?.button;
  locationControls.push({ button: all, region: locationUI.active, city: '', stateRow: false });
  updateLocationLabel();
}
function setupLocationMenu() {
  locationUI.groups = locationGroups();
  locationUI.active = state.locationState || locationUI.groups[0]?.name || '';
  drawLocationMenu();
}
window.addEventListener('resize', positionLocationMenu);

function setupMenus(){
 const ct=document.querySelector('[data-heading-filter="heading-category-options"]'),st=document.querySelector('[data-filter-trigger="supplier-style-options"]'),pt=document.querySelector('[data-filter-trigger="supplier-price-options"]');
 menu('heading-category-options',unique('Wedding Vendor Type'),'All wedding categories',v=>{state.category=v;state.page=0;label(ct,v||'WEDDING CATEGORY',!!v);closeAll();render()});
 setupLocationMenu();
 menu('supplier-style-options',unique('Vendor Style',true),'Any style',v=>{state.style=v;state.page=0;label(st,v||'Style',!!v);closeAll();render()});
 document.querySelectorAll('#supplier-price-options button').forEach(b=>b.onclick=()=>{state.price=b.textContent==='Any price'?'':b.textContent;state.page=0;label(pt,state.price||'Starting Price',!!state.price);closeAll();render()});
}
document.querySelector('.supplier-date-apply')?.addEventListener('click',()=>{const input=document.querySelector('#supplier-filter-date');if(!input?.value)return;state.date=normalDate(input.value);state.page=0;label(document.querySelector('[data-filter-trigger="supplier-date-options"]'),new Intl.DateTimeFormat('en-AU',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${state.date}T00:00:00`)),true);closeAll();render()});
const priceMatch=r=>{if(!state.price)return true;const n=Number(clean(val(r,'Starting Price')).replace(/[^0-9.]/g,''));if(!Number.isFinite(n))return false;if(state.price==='Under $1,000')return n<1000;if(state.price==='$1,000–$2,500')return n>=1000&&n<=2500;if(state.price==='$2,500–$5,000')return n>=2500&&n<=5000;if(state.price==='$5,000+')return n>=5000;return true};
const matches=r=>(!state.category||norm(val(r,'Wedding Vendor Type'))===norm(state.category))&&(!state.locationState||norm(val(r,'Location - State'))===norm(state.locationState))&&(!state.locationCity||norm(val(r,'Location - Suburb/City'))===norm(state.locationCity))&&(!state.style||split(val(r,'Vendor Style')).some(x=>norm(x)===norm(state.style)))&&(!state.date||split(val(r,'Dates Available')).some(x=>normalDate(x)===state.date))&&priceMatch(r);

// Remember one winner per search for this tab's session, including across reloads.
const featuredChoices = new Map();
let renderedHighlight = null;
const featuredPriority = record => {
  const value = clean(val(record, 'Featured Priority'));
  const number = Number(value);
  return value && Number.isFinite(number) ? number : 10;
};
const featuredIdentity = record => record.id != null
  ? JSON.stringify(['id', record.id])
  : JSON.stringify(['profile', ...['Name of Wedding Vendor', 'Wedding Vendor Type', 'Location - State', 'Location - Suburb/City', 'Destination URL'].map(key => clean(val(record, key)))]);

function selectHighlight(rows) {
  if (!state.category) return null;
  const eligible = rows.filter(yes);
  if (!eligible.length) return null;
  const priority = Math.min(...eligible.map(featuredPriority));
  const candidates = eligible.filter(record => featuredPriority(record) === priority);
  const searchKey = 'wedsparks:featured:v2:' + JSON.stringify(
    [state.category, state.locationState, state.locationCity, state.price, state.style, state.date].map(norm)
  );
  let saved = featuredChoices.get(searchKey);
  if (!saved) {
    try { saved = sessionStorage.getItem(searchKey); } catch { /* Storage may be disabled. */ }
  }
  // Revalidate a remembered choice so removed records or changed priorities cannot win.
  const remembered = candidates.find(record => featuredIdentity(record) === saved);
  const selected = remembered || candidates[Math.floor(Math.random() * candidates.length)];
  const identity = featuredIdentity(selected);
  featuredChoices.set(searchKey, identity);
  try { sessionStorage.setItem(searchKey, identity); } catch { /* Keep the in-memory choice. */ }
  return selected;
}
const features=(el,values,limit)=>{el.replaceChildren();values.filter(clean).forEach(v=>{const s=document.createElement('span');s.innerHTML=spark;const b=document.createElement('b');b.textContent=trunc(v,limit);s.append(b);el.append(s)})};
function carousel(card,slides){slides=slides.slice(0,10);const media=card.querySelector('.featured-supplier-media,.supplier-listing-media'),img=media?.querySelector(':scope>img'),prev=media?.querySelector('.listing-image-prev'),next=media?.querySelector('.listing-image-next'),counter=media?.querySelector('.listing-image-count'),dots=media?.querySelector('.featured-image-dots');if(!media||!img)return;if(!slides.length){prev?.setAttribute('hidden','');next?.setAttribute('hidden','');if(counter)counter.hidden=true;if(dots)dots.hidden=true;return}img.src=slides[0];prev?.toggleAttribute('hidden',slides.length<2);next?.toggleAttribute('hidden',slides.length<2);if(counter)counter.hidden=slides.length<2;if(dots)dots.hidden=slides.length<2;let at=0,moving=false;
 const indicators=()=>{if(counter)counter.textContent=`${at+1}/${slides.length}`;dots?.querySelectorAll('i').forEach((d,i)=>d.classList.toggle('is-active',i===at))};
 async function show(index,dir){const target=(index+slides.length)%slides.length;if(moving||target===at)return;moving=true;const incoming=img.cloneNode(false);incoming.classList.add('carousel-incoming');incoming.src=slides[target];incoming.style.transform=`translateX(${dir*100}%)`;try{await incoming.decode()}catch{}media.append(incoming);const time={duration:450,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'},out=img.animate([{transform:'translateX(0)'},{transform:`translateX(${-dir*100}%)`}],time),inc=incoming.animate([{transform:`translateX(${dir*100}%)`},{transform:'translateX(0)'}],time);at=target;indicators();await Promise.all([out.finished,inc.finished]);img.src=slides[at];out.cancel();incoming.remove();moving=false}
 if(dots){dots.replaceChildren();slides.forEach((_,i)=>{const d=document.createElement('i');d.onclick=()=>show(i,i>=at?1:-1);dots.append(d)})}if(prev)prev.onclick=()=>show(at-1,-1);if(next)next.onclick=()=>show(at+1,1);indicators();
}
const fav=card=>{const b=card.querySelector('.supplier-favourite');if(!b)return;const animate=open=>{const from=parseFloat(getComputedStyle(b).width),to=open?180:42;b.getAnimations().forEach(a=>a.cancel());b.classList.toggle('is-expanded',open);b.style.width=`${from}px`;const a=b.animate([{width:`${from}px`},{width:`${to}px`}],{duration:450,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});a.onfinish=()=>{b.style.width=`${to}px`;a.cancel()}};b.onmouseenter=()=>animate(true);b.onmouseleave=()=>animate(false);b.onfocus=()=>animate(true);b.onblur=()=>animate(false);b.onclick=()=>{const saved=b.classList.toggle('is-saved');b.setAttribute('aria-pressed',String(saved));b.querySelector('span').textContent=saved?'Saved':'Save to Favourites'}};
function fillFeatured(r){featured.hidden=false;featured.querySelector('.supplier-type').textContent=clean(val(r,'Wedding Vendor Type'));featured.querySelector('.supplier-card-titleline h2').textContent=clean(val(r,'Name of Wedding Vendor'));featured.querySelector('.supplier-location span').textContent=clean(val(r,'Location'));featured.querySelector('.supplier-price-value').textContent=money(val(r,'Starting Price'));featured.querySelector('.supplier-description').textContent=trunc(val(r,'Highlighted About Paragraph'),170);features(featured.querySelector('.supplier-features'),Array.from({length:6},(_,i)=>val(r,`Highlighted Feature #${i+1}`)),30);featured.querySelector('.featured-supplier-actions a').href=safe(val(r,'Destination URL'))||'#';featured.querySelector('.featured-supplier-media img').alt=clean(val(r,'Name of Wedding Vendor'))||'Featured wedding supplier';carousel(featured,images(r))}
function makeCard(r){const c=template.cloneNode(true),name=clean(val(r,'Name of Wedding Vendor'));c.querySelector('.supplier-type').textContent=clean(val(r,'Wedding Vendor Type'));c.querySelector('.supplier-card-titleline h2').textContent=name;c.querySelector('.supplier-location span').textContent=clean(val(r,'Location'));c.querySelector('.supplier-price-value').textContent=money(val(r,'Starting Price'));c.querySelector('.supplier-description').textContent=trunc(val(r,'About Paragraph'),300);features(c.querySelector('.supplier-features'),Array.from({length:4},(_,i)=>val(r,`Showcased Feature #${i+1}`)),40);c.querySelector('.supplier-profile-button').href=safe(val(r,'Destination URL'))||'#';c.querySelector('.supplier-listing-media img').alt=name||'Wedding supplier';const f=c.querySelector('.supplier-favourite');f.setAttribute('aria-label',`Save ${name||'supplier'}`);f.classList.remove('is-saved','is-expanded');f.style.width='';f.querySelector('span').textContent='Save to Favourites';fav(c);carousel(c,images(r));return c}
const empty=message=>{const p=document.createElement('p');p.className='supplier-results-empty';p.textContent=message;list.append(p)};
function pagination(n){pager.replaceChildren();pager.hidden=n<=1;if(n<=1)return;const add=(text,target,{disabled=false,current=false,labelText=''}={})=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;if(labelText)b.setAttribute('aria-label',labelText);if(current)b.setAttribute('aria-current','page');b.onclick=()=>{if(disabled||target===state.page)return;state.page=target;render();list.scrollIntoView({behavior:'smooth',block:'start'})};pager.append(b)};const gap=()=>{const s=document.createElement('span');s.className='supplier-pagination-ellipsis';s.textContent='…';pager.append(s)};add('‹',state.page-1,{disabled:state.page===0,labelText:'Previous page'});const visible=new Set([0,n-1,state.page-1,state.page,state.page+1]);if(state.page<=2)[0,1,2,3].forEach(i=>i<n&&visible.add(i));if(state.page>=n-3)[n-4,n-3,n-2,n-1].forEach(i=>i>=0&&visible.add(i));let last=-1;[...visible].filter(i=>i>=0&&i<n).sort((a,b)=>a-b).forEach(i=>{if(last>=0&&i-last>1)gap();add(String(i+1),i,{current:i===state.page,labelText:`Page ${i+1}`});last=i});add('›',state.page+1,{disabled:state.page===n-1,labelText:'Next page'})}
function render() {
  const rows = state.rows.filter(matches);
  const highlight = selectHighlight(rows);
  // Reserve the featured supplier on every page so results do not shift or repeat.
  const results = highlight ? rows.filter(record => record !== highlight) : rows;
  const pages = Math.ceil(results.length / PAGE);
  if (state.page >= pages) state.page = 0;
  featured.hidden = !highlight || state.page !== 0;
  if (!featured.hidden && renderedHighlight !== highlight) {
    fillFeatured(highlight);
    renderedHighlight = highlight;
  }
  count.textContent = rows.length;
  list.replaceChildren();
  results.slice(state.page * PAGE, state.page * PAGE + PAGE).forEach(record => list.append(makeCard(record)));
  if (!rows.length) empty('No wedding suppliers match these filters yet.');
  pagination(pages);
}
function initialQuery() {
  const q = new URLSearchParams(location.search);
  const category = q.get('category') || q.get('vendorType') || '';
  const matchedCategory = unique('Wedding Vendor Type').find(value => norm(value) === norm(category));
  if (matchedCategory) {
    state.category = matchedCategory;
    label(document.querySelector('[data-heading-filter="heading-category-options"]'), matchedCategory, true);
  }
  const groups = locationGroups();
  // Keep older city/state links usable, including Australian state abbreviations.
  const aliases = { nsw:'new south wales', vic:'victoria', qld:'queensland', sa:'south australia', wa:'western australia', tas:'tasmania', act:'australian capital territory', nt:'northern territory' };
  const stateName = value => aliases[norm(value)] || norm(value);
  const findState = value => groups.find(region => stateName(region.name) === stateName(value));
  let regionInput = clean(q.get('state'));
  let cityInput = clean(q.get('city'));
  const legacy = clean(q.get('location'));
  if (!regionInput && legacy) {
    const wholeState = findState(legacy);
    if (wholeState) regionInput = wholeState.name;
    else if (legacy.includes(',')) {
      const comma = legacy.lastIndexOf(',');
      cityInput = legacy.slice(0, comma).trim();
      regionInput = legacy.slice(comma + 1).trim();
    } else cityInput = legacy;
  }
  if (!regionInput && cityInput) {
    const possibleStates = groups.filter(region => region.cities.some(city => norm(city) === norm(cityInput)));
    if (possibleStates.length === 1) regionInput = possibleStates[0].name;
  }
  if (regionInput) {
    const region = findState(regionInput);
    state.locationState = region ? region.name : regionInput;
    state.locationCity = region?.cities.find(city => norm(city) === norm(cityInput)) || cityInput;
  }
  updateLocationLabel();
}
async function load(){try{const res=await fetch(`${SB}/rest/v1/${encodeURIComponent('Vendor Public Profiles')}?select=*`,{headers:{apikey:KEY,Accept:'application/json'}});if(!res.ok)throw Error(`Supabase request failed (${res.status})`);state.rows=await res.json();setupMenus();initialQuery();render()}catch(e){console.error(e);featured.hidden=true;list.replaceChildren();empty('Wedding suppliers are temporarily unavailable.');pager.hidden=true;count.textContent='0'}}
load();
