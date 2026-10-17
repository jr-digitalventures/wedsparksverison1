import {money,safeWebUrl} from './supplier-workspace-model.js';
export const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
export function renderSupplierProfile(root,profile,{packages=[],reviews=[],preview=false,chatUrl='',onShortlist}={}){
  root.replaceChildren();root.classList.add('sp-profile');
  if(preview)root.append(el('p','Preview · Only you can see this draft.','sp-preview-label'));
  const photos=(profile.images||[]).map(i=>typeof i==='string'?i:i.url).filter(url=>safeWebUrl(url)||(preview&&/^data:image\/(?:jpeg|png|webp);base64,/.test(url)));
  if(photos.length){
    const gallery=el('section',null,'sp-gallery');gallery.setAttribute('aria-label','Business photos');
    photos.slice(0,5).forEach((url,i)=>{const button=el('button');button.type='button';button.setAttribute('aria-label','View photo '+(i+1));const image=el('img');image.src=url;image.alt=(profile.name||'Supplier')+' · photo '+(i+1);image.loading=i?'lazy':'eager';button.append(image);button.addEventListener('click',()=>{const d=el('dialog',null,'sp-lightbox'),close=el('button','×','sw-close');close.setAttribute('aria-label','Close photo');close.onclick=()=>d.close();const full=el('img');full.src=url;full.alt=image.alt;d.append(close,full);d.onclick=e=>{if(e.target===d)d.close();};d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();});gallery.append(button);});root.append(gallery);
  }else root.append(el('div','Your main photo will appear here','sp-photo-empty'));
  const grid=el('div',null,'sp-layout'),main=el('div'),aside=el('aside',null,'sp-enquiry');
  main.append(el('p',profile.category||'Wedding supplier','sp-eyebrow'),el('h1',profile.name||'Your business name'));
  const location=[profile.city,profile.state].filter(Boolean).join(', ');if(location)main.append(el('p','Based in '+location,'sp-location'));
  if(profile.tagline)main.append(el('p',profile.tagline,'sp-tagline'));
  function section(title,text){if(!String(text||'').trim())return;const box=el('section',null,'sp-section');box.append(el('h2',title),el('p',text));main.append(box);return box;}
  section('A little about us',profile.about);
  if(profile.features){const box=el('section',null,'sp-section');box.append(el('h2','What makes us special'));main.append(box);const list=el('ul',null,'sp-features');profile.features.split('\n').filter(Boolean).forEach(t=>list.append(el('li',t)));box.append(list);}
  if(location||profile.serviceAreas){const box=el('section',null,'sp-section');box.append(el('h2','Where we work'));if(location)box.append(el('p',location));if(profile.serviceAreas)box.append(el('p','Also serving '+profile.serviceAreas));if(location){const a=el('a','View location on Google Maps ↗');a.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(location);a.target='_blank';a.rel='noopener';box.append(a);}main.append(box);}
  if(packages.length){const box=el('section',null,'sp-section');box.append(el('h2','Pricing packages'));const cards=el('div',null,'sp-packages');for(const p of packages.filter(p=>p.visible!==false)){const c=el('article',null,'sp-package');c.append(el('h3',p.name),el('strong',money(p.price)+' '+(p.basis||'per wedding')),el('p',p.description));if(p.inclusions){const ul=el('ul');p.inclusions.split('\n').filter(Boolean).forEach(t=>ul.append(el('li',t)));c.append(ul);}cards.append(c);}box.append(cards);main.append(box);}
  if(reviews.length){const box=el('section',null,'sp-section');box.append(el('h2','Kind words from couples'));for(const r of reviews){const c=el('article',null,'sp-review');c.append(el('p','★'.repeat(r.rating)),el('p',r.body),el('small',r.author||'WedSparks couple'));box.append(c);}main.append(box);}
  if(profile.faq){const box=el('section',null,'sp-section');box.append(el('h2','Frequently asked questions'));for(const line of profile.faq.split('\n').filter(Boolean)){const [q,...a]=line.split('|'),details=el('details');details.append(el('summary',q),el('p',a.join('|')||'Contact us to find out more.'));box.append(details);}main.append(box);}
  if(profile.cancellation||profile.privacy){const box=el('section',null,'sp-section');box.append(el('h2','Things to know'));for(const [title,text] of [['Cancellation policy',profile.cancellation],['Privacy policy',profile.privacy]]){if(text){const d=el('details');d.append(el('summary',title),el('p',text));box.append(d);}}main.append(box);}
  aside.append(el('p','Your next celebration starts here','sp-eyebrow'),el('h2','Let’s make it happen'));
  if(profile.startingPrice)aside.append(el('p','From '+money(profile.startingPrice),'sp-price'));
  aside.append(el('p','Tell us about your wedding, check your date and find the right package for you.'));
  const chat=el(preview?'button':'a','Get a quote','sd-primary');if(preview){chat.disabled=true;aside.append(el('small','Enquiries become available when your page is published.'));}else chat.href=chatUrl;aside.append(chat);
  const save=el('button','♡ Save to shortlist','sw-secondary');save.type='button';save.disabled=preview||!onShortlist;if(onShortlist)save.onclick=()=>onShortlist(save);aside.append(save);
  const website=safeWebUrl(profile.website);if(website){const a=el('a','Visit our website ↗');a.href=website;a.target='_blank';a.rel='noopener';aside.append(a);}
  grid.append(main,aside);root.append(grid);
}
