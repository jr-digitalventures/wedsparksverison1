const marketplaceRoutes=window.WEDSPARKS_SUPPLIER_ROUTES;
const marketplaceBase=new URL('../wedding-suppliers/',document.currentScript.src);
const marketplaceSelected={};
const categoryOptions=document.querySelector('#marketplace-category-options');
if(categoryOptions&&marketplaceRoutes){categoryOptions.replaceChildren(...marketplaceRoutes.categories.map(c=>{const b=document.createElement('button');b.type='button';b.textContent=c.value;return b;}));}
function marketplaceDestination(value){try{const url=new URL(value,location.href);if(url.origin==='https://jr-digitalventures.github.io'&&url.pathname.startsWith('/wedsparksverison1/'))return new URL('../'+url.pathname.slice('/wedsparksverison1/'.length)+url.search,document.currentScript?.src||new URL('marketplace.js',location.href)).href;return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}}
const menuButton = document.querySelector('.mobile-menu-toggle');
const mobileMenu = document.querySelector('#marketplace-mobile-navigation');

menuButton?.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
  mobileMenu.hidden = !opening;
});

document.addEventListener('click', event => {
  if (mobileMenu?.hidden || mobileMenu?.contains(event.target) || menuButton?.contains(event.target)) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
});

const searchTriggers = [...document.querySelectorAll('[data-marketplace-trigger]')];
const closeSearchDropdowns = () => searchTriggers.forEach(trigger => {
  trigger.setAttribute('aria-expanded', 'false');
  document.getElementById(trigger.dataset.marketplaceTrigger).hidden = true;
});

searchTriggers.forEach(trigger => {
  const dropdown = document.getElementById(trigger.dataset.marketplaceTrigger);
  trigger.addEventListener('click', event => {
    event.stopPropagation();
    const opening = dropdown.hidden;
    closeSearchDropdowns();
    dropdown.hidden = !opening;
    trigger.setAttribute('aria-expanded', String(opening));
  });
  dropdown.querySelectorAll(':scope > button:not(.marketplace-date-apply)').forEach(option => {
    option.addEventListener('click', () => {
      trigger.querySelector('strong').textContent = option.textContent.trim();
      marketplaceSelected[trigger.dataset.marketplaceTrigger]=option.textContent.trim();
      closeSearchDropdowns();
      trigger.focus();
    });
  });
});

const dateInput = document.querySelector('#marketplace-date');

const marketplaceLocationMenu = document.querySelector('#marketplace-location-options');
const marketplaceLocationTrigger = document.querySelector('[data-marketplace-trigger="marketplace-location-options"]');
const marketplaceLocationUI = {active:'', pane:'states', groups:[]};
const marketplaceStateAbbreviations = {
  'new south wales':'NSW', victoria:'VIC', queensland:'QLD', 'western australia':'WA',
  'south australia':'SA', tasmania:'TAS', 'australian capital territory':'ACT', 'northern territory':'NT'
};
const normaliseMarketplaceLocation = value => String(value || '').trim().toLowerCase();
const marketplaceLocationBlock = (className, text='') => {
  const node=document.createElement('div'); node.className=className; node.textContent=text; return node;
};
const marketplaceLocationButton = (text, className, action) => {
  const node=document.createElement('button'); node.type='button'; node.className=className; node.textContent=text;
  node.addEventListener('click',event=>{event.stopPropagation();action();}); return node;
};
function setMarketplaceLocation(region='',city='',close=false,national=false){
  const abbreviation=marketplaceStateAbbreviations[normaliseMarketplaceLocation(region)] || region;
  const visible=city ? `${city}, ${abbreviation}` : abbreviation || (national ? 'Australia' : 'Find your where');
  marketplaceLocationTrigger?.querySelector('strong')?.replaceChildren(visible);
  marketplaceSelected['marketplace-location-options']=city ? `${city}, ${region}` : region;
  if(close){closeSearchDropdowns();marketplaceLocationTrigger?.focus();}
}
function drawMarketplaceLocationMenu(){
  if(!marketplaceLocationMenu)return;
  marketplaceLocationMenu.replaceChildren();
  marketplaceLocationMenu.dataset.pane=marketplaceLocationUI.pane;
  const states=marketplaceLocationBlock('marketplace-location-states');
  const heading=marketplaceLocationBlock('marketplace-location-heading');
  heading.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>Select a state</span>';
  states.append(heading);
  const stateList=marketplaceLocationBlock('marketplace-location-state-list');
  stateList.append(marketplaceLocationButton('All locations','marketplace-location-state marketplace-location-national',()=>setMarketplaceLocation('','',true,true)));
  marketplaceLocationUI.groups.forEach(group=>{
    const row=marketplaceLocationButton(group.name,'marketplace-location-state',()=>{
      marketplaceLocationUI.active=group.name;marketplaceLocationUI.pane='locations';
      setMarketplaceLocation(group.name);drawMarketplaceLocationMenu();
    });
    row.dataset.active=String(normaliseMarketplaceLocation(group.name)===normaliseMarketplaceLocation(marketplaceLocationUI.active));
    stateList.append(row);
  });
  states.append(stateList); marketplaceLocationMenu.append(states);

  const detail=marketplaceLocationBlock('marketplace-location-detail');
  detail.append(marketplaceLocationButton('← Back','marketplace-location-back',()=>{
    marketplaceLocationUI.pane='states';drawMarketplaceLocationMenu();
  }));
  detail.append(marketplaceLocationBlock('marketplace-location-heading',marketplaceLocationUI.active || 'Select a state'));
  detail.append(marketplaceLocationButton('All','marketplace-location-all',()=>setMarketplaceLocation(marketplaceLocationUI.active,'',true)));
  const cityList=marketplaceLocationBlock('marketplace-location-city-list');
  const activeGroup=marketplaceLocationUI.groups.find(group=>normaliseMarketplaceLocation(group.name)===normaliseMarketplaceLocation(marketplaceLocationUI.active));
  (activeGroup?.cities || []).forEach(city=>cityList.append(marketplaceLocationButton(city,'marketplace-location-choice',()=>setMarketplaceLocation(activeGroup.name,city,true))));
  if(!activeGroup?.cities.length)cityList.append(marketplaceLocationBlock('marketplace-location-empty','No suburbs or cities available.'));
  detail.append(cityList); marketplaceLocationMenu.append(detail);
}
function fallbackMarketplaceLocationGroups(){
  return (marketplaceRoutes?.states || []).map(state=>({
    name:state.value,
    cities:(marketplaceRoutes?.cities || []).filter(city=>normaliseMarketplaceLocation(city.state)===normaliseMarketplaceLocation(state.value)).map(city=>city.value)
  }));
}
async function loadMarketplaceLocationGroups(){
  marketplaceLocationUI.groups=fallbackMarketplaceLocationGroups();
  marketplaceLocationUI.active=marketplaceLocationUI.groups[0]?.name || '';
  drawMarketplaceLocationMenu();
  try{
    const select=encodeURIComponent('"Location - State","Location - Suburb/City"');
    const response=await fetch(`https://vfdtyxcfrqnqdyuimtho.supabase.co/rest/v1/Vendor%20Public%20Profiles?select=${select}`,{headers:{apikey:'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd'}});
    if(!response.ok)throw new Error(`Supabase request failed (${response.status})`);
    const rows=await response.json();
    const grouped=new Map();
    rows.forEach(row=>{
      const region=String(row['Location - State'] || '').trim();
      const city=String(row['Location - Suburb/City'] || '').trim();
      if(!region)return;
      if(!grouped.has(region))grouped.set(region,new Set());
      if(city)grouped.get(region).add(city);
    });
    const ordered=(marketplaceRoutes?.states || []).map(state=>state.value);
    marketplaceLocationUI.groups=[...grouped].sort(([a],[b])=>{
      const ai=ordered.findIndex(value=>normaliseMarketplaceLocation(value)===normaliseMarketplaceLocation(a));
      const bi=ordered.findIndex(value=>normaliseMarketplaceLocation(value)===normaliseMarketplaceLocation(b));
      return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b);
    }).map(([name,cities])=>({name,cities:[...cities].sort((a,b)=>a.localeCompare(b))}));
    marketplaceLocationUI.active=marketplaceLocationUI.groups[0]?.name || '';
    drawMarketplaceLocationMenu();
  }catch(error){console.warn('Using local Marketplace location fallback:',error.message);}
}
marketplaceLocationTrigger?.addEventListener('click',()=>{
  if(marketplaceLocationTrigger.getAttribute('aria-expanded')==='true'){
    marketplaceLocationUI.pane='states';drawMarketplaceLocationMenu();
  }
});
loadMarketplaceLocationGroups();

document.querySelector('.marketplace-date-apply')?.addEventListener('click', () => {
  if (!dateInput.value) return;
  const selectedDate = new Date(`${dateInput.value}T00:00:00`);
  const label = new Intl.DateTimeFormat('en-AU', {weekday:'short', day:'2-digit', month:'short', year:'numeric'}).format(selectedDate);
  document.querySelector('[data-marketplace-trigger="marketplace-date-options"] strong').textContent = label;
  closeSearchDropdowns();
});

document.addEventListener('click', event => {
  if (!event.target.closest('.marketplace-search-field')) closeSearchDropdowns();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeSearchDropdowns();
});

const marketplaceCategoryGrid = document.querySelector('#marketplace-category-grid');
if (marketplaceCategoryGrid) {
  const marketplaceExpandedGrid = document.querySelector('#marketplace-expanded-categories');
  const marketplaceShowCategories = document.querySelector('#marketplace-show-categories');
  const marketplaceHideCategories = document.querySelector('#marketplace-hide-categories');
  const SUPABASE_URL = 'https://vfdtyxcfrqnqdyuimtho.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd';
  const safeUrl = value => {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const createCategoryCard = (row, featured = false) => {
      const link = document.createElement('a');
      link.className = `marketplace-category-card has-data-image${featured ? ' marketplace-category-featured' : ''}`;
      const category=marketplaceRoutes?.categoryByValue(row.name);
      link.href = category?new URL(category.slug+'/',marketplaceBase).href:marketplaceBase.href;
      const imageUrl = safeUrl(row.image_url);
      if (imageUrl) link.style.backgroundImage = `url("${imageUrl.replaceAll('"', '%22')}")`;

      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = row.name;
      const action = document.createElement('small');
      action.append('Explore ');
      const arrow = document.createElement('b');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      action.append(arrow);
      content.append(title, action);
      link.append(content);
      return link;
  };

  let marketplaceCategoryRows = [];
  let compactCategoryLayout = window.matchMedia('(max-width: 1200px)').matches;

  const renderMarketplaceCategories = rows => {
    marketplaceCategoryRows = rows;
    const primaryCardCount = window.matchMedia('(max-width: 1200px)').matches ? 6 : 7;
    const featuredRows = rows.filter(row => !/^cake$/i.test(row.name.trim())).slice(0, primaryCardCount);
    const remainingRows = rows.filter(row => !featuredRows.includes(row));
    const cards = featuredRows.map((row, index) => createCategoryCard(row, index === 0));
    if (cards.length) marketplaceCategoryGrid.replaceChildren(...cards);

    if (marketplaceExpandedGrid && marketplaceShowCategories && remainingRows.length) {
      const remainingCards = remainingRows.map((row, index) => {
        const card = createCategoryCard(row);
        card.style.setProperty('--card-index', index);
        return card;
      });
      marketplaceExpandedGrid.replaceChildren(...remainingCards);
      marketplaceShowCategories.hidden = false;
    }
  };

  marketplaceShowCategories?.addEventListener('click', () => {
    marketplaceShowCategories.setAttribute('aria-expanded', 'true');
    marketplaceShowCategories.hidden = true;
    marketplaceExpandedGrid.hidden = false;
    marketplaceHideCategories.hidden = false;
    marketplaceExpandedGrid.classList.remove('is-open');
    marketplaceExpandedGrid.style.setProperty('--expanded-height', `${marketplaceExpandedGrid.scrollHeight}px`);
    marketplaceExpandedGrid.getBoundingClientRect();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => marketplaceExpandedGrid.classList.add('is-open'));
    });
  });

  marketplaceHideCategories?.addEventListener('click', () => {
    marketplaceShowCategories.setAttribute('aria-expanded', 'false');
    marketplaceExpandedGrid.classList.remove('is-open');
    marketplaceHideCategories.hidden = true;
    window.setTimeout(() => {
      marketplaceExpandedGrid.hidden = true;
      marketplaceShowCategories.hidden = false;
    }, 650);
  });

  window.addEventListener('resize', () => {
    const nextCompactCategoryLayout = window.matchMedia('(max-width: 1200px)').matches;
    if (nextCompactCategoryLayout !== compactCategoryLayout && marketplaceCategoryRows.length) {
      compactCategoryLayout = nextCompactCategoryLayout;
      marketplaceShowCategories?.setAttribute('aria-expanded', 'false');
      marketplaceExpandedGrid?.classList.remove('is-open');
      if (marketplaceExpandedGrid) marketplaceExpandedGrid.hidden = true;
      if (marketplaceHideCategories) marketplaceHideCategories.hidden = true;
      renderMarketplaceCategories(marketplaceCategoryRows);
    }
    if (marketplaceShowCategories?.getAttribute('aria-expanded') === 'true') {
      marketplaceExpandedGrid.style.setProperty('--expanded-height', `${marketplaceExpandedGrid.scrollHeight}px`);
    }
  });

  const loadMarketplaceCategories = async () => {
    const query = 'select=name,display_order,image_url,destination_url&is_active=eq.true&order=display_order.asc';
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/supplier_categories?${query}`, {
        headers: {apikey: SUPABASE_PUBLISHABLE_KEY}
      });
      if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length) renderMarketplaceCategories(rows);
    } catch (error) {
      console.warn('Using local Marketplace category fallback:', error.message);
    }
  };

  loadMarketplaceCategories();
}

const marketplaceLocationTrack = document.querySelector('#marketplace-location-track');
if (marketplaceLocationTrack) {
  const pagination = document.querySelector('.marketplace-location-pagination');
  const SUPABASE_URL = 'https://vfdtyxcfrqnqdyuimtho.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd';
  let pageButtons = [];

  const safeLocationUrl = value => {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const supplierCountLabel = value => {
    const text = String(value ?? '').trim();
    if (!text) return 'Suppliers';
    if (/suppliers?$/i.test(text)) return text;
    const numericValue = Number(text.replaceAll(',', '').replace('+', ''));
    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString('en-AU')}+ suppliers` : `${text} suppliers`;
  };

  const createLocationPagination = () => {
    const card = marketplaceLocationTrack.querySelector('.marketplace-location-card');
    if (!card) return;
    const gap = Number.parseFloat(getComputedStyle(marketplaceLocationTrack).columnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    const visibleCount = Math.max(1, Math.floor((marketplaceLocationTrack.clientWidth + gap) / step));
    const hiddenCount = Math.max(0, marketplaceLocationTrack.children.length - visibleCount);
    const pageCount = hiddenCount > 0 ? hiddenCount + 1 : 0;
    pagination.replaceChildren();
    pagination.hidden = pageCount === 0;
    pageButtons = Array.from({length: pageCount}, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show wedding location position ${index + 1}`);
      button.setAttribute('aria-current', String(index === 0));
      button.addEventListener('click', () => {
        marketplaceLocationTrack.scrollTo({left: step * index, behavior: 'smooth'});
      });
      pagination.append(button);
      return button;
    });
  };

  const renderLocations = rows => {
    const activeRows = rows
      .filter(row => {
        const active = row.is_active ?? row.Is_active;
        return active === true || String(active).toLowerCase() === 'true';
      })
      .sort((a, b) => Number(a.display_order ?? a.dispaly_order ?? a.Display_order ?? a.Dispaly_order ?? 0) - Number(b.display_order ?? b.dispaly_order ?? b.Display_order ?? b.Dispaly_order ?? 0));
    const cards = activeRows.map(row => {
      const link = document.createElement('a');
      link.className = 'marketplace-location-card';
      const locationName=String(row.location_name??row.Location_name??'').trim();
      const region=[...(marketplaceRoutes?.states||[]),...(marketplaceRoutes?.cities||[])].find(item=>item.value.toLowerCase()===locationName.toLowerCase());
      const destination=new URL(region?region.slug+'/':'',marketplaceBase);if(!region&&locationName)destination.searchParams.set('location',locationName);link.href=destination.href;

      const image = document.createElement('img');
      image.src = safeLocationUrl(row.image_url ?? row.Image_url) || '../assets/background-v2.png';
      image.alt = row.location_name ?? row.Location_name ?? 'Wedding location';

      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = row.location_name ?? row.Location_name ?? 'Wedding location';
      const count = document.createElement('small');
      count.textContent = 'Explore wedding suppliers';
      const arrow = document.createElement('b');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      content.append(title, count, arrow);
      link.append(image, content);
      return link;
    });
    if (!cards.length) return;
    marketplaceLocationTrack.replaceChildren(...cards);
    marketplaceLocationTrack.scrollLeft = 0;
    createLocationPagination();
  };

  let locationFrame;
  marketplaceLocationTrack.addEventListener('scroll', () => {
    cancelAnimationFrame(locationFrame);
    locationFrame = requestAnimationFrame(() => {
      const maxScroll = marketplaceLocationTrack.scrollWidth - marketplaceLocationTrack.clientWidth;
      const card = marketplaceLocationTrack.querySelector('.marketplace-location-card');
      const gap = Number.parseFloat(getComputedStyle(marketplaceLocationTrack).columnGap) || 0;
      const step = card ? card.getBoundingClientRect().width + gap : 1;
      const active = maxScroll > 0 ? Math.round(marketplaceLocationTrack.scrollLeft / step) : 0;
      pageButtons.forEach((button, index) => button.setAttribute('aria-current', String(index === active)));
    });
  }, {passive: true});

  const loadLocations = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Locations?select=*`, {
        headers: {apikey: SUPABASE_PUBLISHABLE_KEY}
      });
      if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
      const rows = await response.json();
      if (Array.isArray(rows)) renderLocations(rows);
    } catch (error) {
      console.warn('Using local wedding-location fallback:', error.message);
    }
  };

  createLocationPagination();
  window.addEventListener('resize', () => {
    marketplaceLocationTrack.scrollLeft = 0;
    createLocationPagination();
  });
  loadLocations();
}

const marketplaceSupplierCarousel = document.querySelector('#marketplace-supplier-carousel');
const marketplaceSupplierPagination = document.querySelector('.marketplace-supplier-pagination');
if (marketplaceSupplierCarousel && marketplaceSupplierPagination) {
  const SUPABASE_URL = 'https://vfdtyxcfrqnqdyuimtho.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZKsMTDpNvDifXRSCZJTTAA_JLt1QFYd';
  let supplierFrame;
  let supplierPageButtons = [];

  const safeSupplierUrl = value => {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const createSupplierPagination = () => {
    const pageCount = Math.min(5, Math.max(1, marketplaceSupplierCarousel.children.length));
    marketplaceSupplierPagination.replaceChildren();
    supplierPageButtons = Array.from({length: pageCount}, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show supplier categories page ${index + 1}`);
      button.setAttribute('aria-current', String(index === 0));
      button.addEventListener('click', () => {
        const maxScroll = marketplaceSupplierCarousel.scrollWidth - marketplaceSupplierCarousel.clientWidth;
        marketplaceSupplierCarousel.scrollTo({left: maxScroll * (index / Math.max(1, pageCount - 1)), behavior: 'smooth'});
      });
      marketplaceSupplierPagination.append(button);
      return button;
    });
  };

  const updateSupplierPagination = () => {
    const maxScroll = marketplaceSupplierCarousel.scrollWidth - marketplaceSupplierCarousel.clientWidth;
    const active = maxScroll > 0 ? Math.round((marketplaceSupplierCarousel.scrollLeft / maxScroll) * (supplierPageButtons.length - 1)) : 0;
    supplierPageButtons.forEach((button, index) => button.setAttribute('aria-current', String(index === active)));
  };

  const renderSupplierCards = rows => {
    const activeRows = rows
      .filter(row => {
        const active = row.is_active ?? row.Is_active;
        return active === true || String(active).toLowerCase() === 'true';
      })
      .sort((a, b) => Number(a.display_order ?? a.Display_order ?? 0) - Number(b.display_order ?? b.Display_order ?? 0));
    const cards = activeRows.map(row => {
      const link = document.createElement('a');
      link.className = 'supplier-card has-data-image';
      const destination=new URL(marketplaceBase);destination.searchParams.set('style',row.Wedding_style??row.wedding_style??'');link.href=destination.href;
      const imageUrl = safeSupplierUrl(row.Image_url ?? row.image_url);
      if (imageUrl) link.style.backgroundImage = `url("${imageUrl.replaceAll('"', '%22')}")`;
      const content = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = row.Wedding_style ?? row.wedding_style ?? 'Wedding style';
      const action = document.createElement('small');
      action.append('Explore ');
      const arrow = document.createElement('b');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      action.append(arrow);
      content.append(title, action);
      link.append(content);
      return link;
    });
    if (!cards.length) return;
    marketplaceSupplierCarousel.replaceChildren(...cards);
    marketplaceSupplierCarousel.scrollLeft = 0;
    createSupplierPagination();
    updateSupplierPagination();
  };

  const loadWeddingStyles = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Wedding%20Styles?select=*`, {
        headers: {apikey: SUPABASE_PUBLISHABLE_KEY}
      });
      if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length) renderSupplierCards(rows);
    } catch (error) {
      console.warn('Using local wedding-style carousel fallback:', error.message);
    }
  };

  createSupplierPagination();
  marketplaceSupplierCarousel.addEventListener('scroll', () => {
    cancelAnimationFrame(supplierFrame);
    supplierFrame = requestAnimationFrame(updateSupplierPagination);
  }, {passive: true});
  marketplaceSupplierCarousel.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    marketplaceSupplierCarousel.scrollBy({left: (event.key === 'ArrowRight' ? 1 : -1) * marketplaceSupplierCarousel.clientWidth * .72, behavior: 'smooth'});
  });
  window.addEventListener('resize', () => {
    createSupplierPagination();
    updateSupplierPagination();
  }, {passive: true});
  loadWeddingStyles();
}

// Submit the chosen filters to the shared supplier directory.
document.querySelector('.marketplace-edit-search')?.addEventListener('click',()=>{
 const target=new URL(marketplaceBase);
 const category=marketplaceRoutes?.categoryByValue(marketplaceSelected['marketplace-category-options']);
 if(category)target.pathname+=category.slug+'/';
 const location=marketplaceSelected['marketplace-location-options'];
 if(location)target.searchParams.set('location',location);
 const price=marketplaceSelected['marketplace-budget-options'];
 if(price&&price!=='Any budget')target.searchParams.set('price',price);
 if(dateInput?.value)target.searchParams.set('date',dateInput.value);
 window.location.assign(target.href);
});
