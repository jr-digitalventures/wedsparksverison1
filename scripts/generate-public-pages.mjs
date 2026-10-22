import {specialPage} from './public-special-pages.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyPublicSeo} from './public-seo.mjs';
import {planningLinks,planningShowcase,supplierShowcase,toolAftercare,creditCta} from './public-sections.mjs';
import {brandMark,favicon} from './brand.mjs';
import {publicPages,guides} from './public-page-content.mjs';
const scriptDirectory=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptDirectory,'../dist');
function writeText(file,value){if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===value)return;fs.writeFileSync(file,value);}
export const origin=(process.env.SITE_URL||'https://jr-digitalventures.github.io/wedsparksverison1').replace(/\/$/,'');
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(href,label,cls='')=>`<a${cls?` class="${cls}"`:''} href="${esc(href)}">${esc(label)}</a>`;
export function header(prefix='',mobileId='mobile-navigation'){
  const nav=[['wedding-suppliers/','Find Suppliers'],['planning-your-wedding/','Plan Your Wedding'],['wedding-credits/','Spend Less']];
  return `<header class="site-header public-header"><nav class="header-side header-left" aria-label="Primary navigation">${nav.map(([url,t])=>url==='planning-your-wedding/'?`<div class="nav-plan">${link(prefix+url,t,'header-nav-link')}<nav class="planning-dropdown" aria-label="Wedding planning tools">${planningLinks.map(([u,h,summary])=>`<a href="${prefix}planning-your-wedding/${u}"><strong>${h}</strong><span>${summary}</span></a>`).join('')}<a href="${prefix}wedding-guides/"><strong>Wedding Guides</strong><span>Your full guide to planning your day</span></a></nav></div>`:link(prefix+url,t,'header-nav-link')).join('')}</nav><a class="brand" href="${prefix||'./'}" aria-label="WedSparks home"><img class="ws-header-logo" src="${prefix}assets/wedsparks-horizontal-reverse.svg" alt="WedSparks" width="1485" height="410"></a><nav class="header-side header-right" aria-label="Account navigation">${link(prefix+'for-suppliers/','For Suppliers','header-nav-link')}<button class="header-action login" type="button" disabled>Log In</button><button class="header-action signup" type="button" disabled>Sign Up</button></nav><button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="${mobileId}" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="mobile-nav-panel" id="${mobileId}" aria-label="Mobile navigation" hidden>${[...nav,['for-suppliers/','For Suppliers'],['real-weddings/','Real Weddings']].map(([u,t])=>link(prefix+u,t,'header-nav-link')+(u==='planning-your-wedding/'?`<div class="mobile-planning-tools">${planningLinks.map(([url,title])=>link(prefix+'planning-your-wedding/'+url,title)).join('')}${link(prefix+'wedding-guides/','Wedding Guides')}</div>`:'')).join('')}<div class="mobile-account-actions"><button type="button" disabled>Log In</button><button type="button" disabled>Sign Up</button></div></nav></header>`;
}
export function footer(prefix=''){
  const groups=[['Your wedding',[['wedding-suppliers/','Find suppliers'],['suppliers/','Supplier profiles'],['planning-your-wedding/','Planning tools'],['wedding-credits/','Wedding credits'],['wedding-guides/','Wedding guides'],['real-weddings/','Real weddings']]],['Your business',[['for-suppliers/','Become a supplier'],['supplier-profile-import/','Bring your existing details'],['supplier-account/','Supplier dashboard']]],['WedSparks',[['about/','About us'],['contact/','Contact'],['faqs/','FAQs'],['privacy/','Privacy information'],['terms/','Platform terms'],['wedding-credits/terms/','Credit programme terms'],['cancellations/','Cancellations & refunds'],['disputes/','Resolving a dispute']]]];
  return `<footer class="public-footer" data-public-footer><div><a class="public-footer-brand" href="${prefix||'./'}">WedSparks</a><p>Your wedding, with a little more spark.</p><p class="public-small">Discover your people. Bring your plans together.</p></div>${groups.map(([heading,items])=>`<nav aria-label="${heading}"><h2>${heading}</h2>${items.map(([u,t])=>link(prefix+u,t)).join('')}</nav>`).join('')}<p class="public-footer-bottom">© ${new Date().getFullYear()} WedSparks · Made for the moments that matter.</p></footer>`;
}
const toolCards=[['budget-planner/','01','Your wedding budget','Try the calculator and make room for your priorities.'],['checklist/','02','Your next steps','A practical checklist, from first ideas to the wedding week.'],['guest-list-rsvp/','03','Your favourite people','Discover guest groups, invitations and online replies.'],['wedding-day-timeline/','04','A day that flows','Build a starting-point run sheet around your ceremony.']];
function cards(items,prefix){return `<div class="public-card-grid">${items.map(([url,num,title,text])=>`<a class="public-card" href="${prefix+url}"><img class="public-card-photo" src="${prefix}assets/${/budget|checklist|timeline|planning|rsvp/.test(url)?'wedding-planning.webp':'wedding-garden.webp'}" alt="" width="1536" height="1024" loading="lazy" decoding="async"><span class="public-card-number">${num}</span><h3>${esc(title)}</h3><p>${esc(text)}</p><span class="public-card-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>`;}
function tool(kind){
  if(kind==='credits')return `<section class="public-interactive" data-credit-calculator><div><p class="public-eyebrow">MAKE YOUR SPENDING GO FURTHER</p><h2>Your budget. A little more possibility.</h2><p>See the extra wedding spending your payments could unlock. Amounts shown in AUD.</p><label for="credit-spend">Money you plan to pay through WedSparks · AUD</label><input id="credit-spend" type="range" min="0" max="100000" step="1000" value="50000"><output data-spend>$50,000</output><p class="public-small">Amounts covered by credits do not earn more credits.</p></div><div class="public-reward-number"><span>Additional wedding credits you could earn</span><strong data-reward>$5,000</strong><p>Every complete $10,000 paid through WedSparks earns $1,000 in credits.</p><div class="credit-grand-total"><span>Your money + wedding credits</span><strong data-purchasing-power>$55,000</strong><span>to put towards your wedding through WedSparks</span></div></div></section>`;
  if(kind==='budget')return `<section class="public-interactive" data-budget-tool><div><p class="public-eyebrow">YOUR STARTING POINT</p><h2>Plan the big picture.</h2><label for="budget-total">Your total budget</label><input id="budget-total" type="number" min="0" max="10000000" step="100" value="45000"><label for="budget-currency">Currency</label><select id="budget-currency"><option value="AUD">AUD · Australian dollars</option><option value="NZD">NZD · New Zealand dollars</option></select><label for="budget-guests">Approximate guest count</label><input id="budget-guests" type="number" min="1" max="10000" value="80"><p class="public-small">An illustrative allocation you can adjust—not supplier prices or recommended spending. No personal information is sent.</p></div><div><div class="public-budget-summary"><span>Approximate budget per guest</span><strong data-per-guest></strong></div><div data-budget-rows></div><p data-budget-remaining role="status"></p></div></section>`;
  if(kind==='checklist')return `<section class="public-tool-card" data-checklist><div class="public-section-heading"><div><p class="public-eyebrow">YOUR PLANNING CHECKLIST</p><h2>A little progress feels good.</h2></div><button class="public-button secondary" type="button" data-print>Print checklist</button></div><p data-checklist-progress role="status"></p><div class="public-progress"><span data-checklist-fill></span></div><div data-checklist-items></div><button class="public-text-button" type="button" data-checklist-reset>Clear these ticks</button></section>`;
  if(kind==='timeline')return `<section class="public-tool-card" data-timeline><div class="public-section-heading"><div><p class="public-eyebrow">YOUR WEDDING-DAY STARTING POINT</p><h2>Start with your ceremony.</h2></div><button class="public-button secondary" type="button" data-print>Print timeline</button></div><label for="ceremony-time">Ceremony time</label><input id="ceremony-time" type="time" value="15:00"><p class="public-small">A flexible same-day example. Check travel, preparation and supplier timing for your wedding.</p><div data-timeline-rows></div></section>`;
  if(kind==='contact')return `<form class="public-tool-card" data-contact-draft><h2>Prepare your enquiry</h2><label for="contact-topic">What is your enquiry about?</label><select id="contact-topic"><option>Planning my wedding</option><option>My supplier business</option><option>Wedding credits</option><option>Sharing a real wedding</option><option>Something else</option></select><label for="contact-message">Your message</label><textarea id="contact-message" rows="5" maxlength="4000" required></textarea><button class="public-button" type="submit">Download enquiry draft</button><p class="public-small" role="status">This prepares a text file for you. It does not send a message.</p></form>`;
  return '';
}
function pagePhotography(page){
  const planning=/planning|guides|import|contact|privacy|terms|faq/.test(page.path);
  return {banner:planning?'wedding-planning.webp':'wedding-garden.webp',detail:planning?'wedding-garden.webp':'wedding-planning.webp',alt:planning?'White flowers, candlelight and linen tables at a garden wedding reception':'Wedding rings, flowers and an open planning notebook on an ivory linen desk'};
}
export function renderPage(page){
  const prefix='../'.repeat(page.path.split('/').length),canonical=origin+'/'+page.path+'/',cta=['suppliers','import'].includes(page.kind)?'Create your supplier account':'Start your wedding plan',signup=['suppliers','import'].includes(page.kind)?'signup/?experience=supplier&returnTo='+encodeURIComponent(new URL(origin).pathname.replace(/\/$/,'')+(page.kind==='import'?'/supplier-profile-import/':'/supplier-account/storefront/')):'signup/?experience=couple';
  const photo=pagePhotography(page);
  const sections=(page.sections||[]).map(([h,t],i)=>`<section class="public-copy-section"><span class="public-section-index">${String(i+1).padStart(2,'0')}</span><div><h2>${esc(h)}</h2><p>${esc(t)}</p></div></section>${!['credits','planning','suppliers','budget','checklist','timeline','guests'].includes(page.kind)&&i===Math.ceil((page.sections||[]).length/2)-1?`<figure class="public-photo-break"><img src="${prefix}assets/${photo.detail}" alt="${esc(photo.alt)}" width="1536" height="1024" loading="lazy" decoding="async"></figure>`:''}`).join('');
  const faq=page.faqs?.length?`<section class="public-faq"><h2>A little more clarity</h2>${page.faqs.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`:'';
  const planning=page.kind==='planning'?planningShowcase(prefix):page.kind==='suppliers'?supplierShowcase(prefix):'';
  const aftercare=toolAftercare(page,prefix);
  const copy=aftercare??(['planning','suppliers'].includes(page.kind)?'':`<div class="public-copy-wrap">${sections}</div>`);
  const guideCards=page.kind==='guides'?`<section class="public-section">${cards(guides.map((g,i)=>['wedding-guides/'+g.slug+'/',String(i+1).padStart(2,'0'),g.title,g.description]),prefix)}</section>`:'';
  const sourceImport=page.kind==='import'?`<section class="public-tool-card" data-profile-import><p role="status">Opening the import tool…</p></section>`:'';
  let html=`<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#103e33"><link rel="icon" type="image/svg+xml" href="${prefix}assets/wedsparks-favicon.svg"><title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${canonical}">${page.draft?'<meta name="robots" content="noindex,follow">':''}<meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="${page.article?'article':'website'}"><meta property="og:image" content="${origin}/assets/${photo.banner}"><link rel="stylesheet" href="${prefix}styles.css"><link rel="stylesheet" href="${prefix}auth.css"><link rel="stylesheet" href="${prefix}shared/public-site.css"><script type="module" src="${prefix}shared/header-auth.js"></script><script type="module" src="${prefix}shared/public-site.js"></script>${page.kind==='import'?`<script type="module" src="${prefix}shared/profile-import-page.js"></script>`:''}</head><body class="public-site" data-public-page="true"><a class="skip-link" href="#public-content">Skip to content</a>${header(prefix)}<section class="public-photo-banner"><img src="${prefix}assets/${photo.banner}" alt="" width="1536" height="1024" fetchpriority="high" decoding="async"><div class="public-photo-banner-copy"><p class="public-eyebrow">${esc(page.eyebrow||'THE WEDSPARKS GUIDE')}</p><h1>${esc(page.heading)}</h1></div></section><main id="public-content"><section class="public-photo-intro"><p class="public-lead">${esc(page.lead)}</p><div class="public-actions">${link(prefix+signup,cta,'public-button')}${link(prefix+'wedding-suppliers/','Explore suppliers','public-button secondary')}</div></section>${page.article?`<p class="public-article-byline" data-editorial-article>By <a href="${prefix}about/">WedSparks</a> · Wedding planning guide</p>`:''}${planning}${tool(page.kind)}${sourceImport}${guideCards}${!(page.sections||[]).length?`<figure class="public-photo-break public-photo-standalone"><img src="${prefix}assets/${photo.detail}" alt="${esc(photo.alt)}" width="1536" height="1024" loading="lazy" decoding="async"></figure>`:''}${copy}${faq}${page.kind==='credits'?creditCta(prefix,signup):`<section class="public-end-cta"><p class="public-eyebrow">MAKE IT YOURS</p><h2>${['suppliers','import'].includes(page.kind)?'Your business deserves a beautiful home.':'A little clarity for your next step.'}</h2><div class="public-actions">${link(prefix+signup,cta,'public-button light')}${link(prefix+(page.kind==='import'?'for-suppliers/':page.kind==='suppliers'?'supplier-profile-import/':'planning-your-wedding/'),page.kind==='import'?'Explore the supplier offering ↗':page.kind==='suppliers'?'Bring your existing details ↗':'Explore the planning tools ↗','public-button secondary')}</div></section>`}</main>${footer(prefix)}</body></html>\n`;
  const custom=specialPage(page,prefix,guides);
  if(custom){
    let customBody=custom.body;
    if(custom.plain){
      const title=customBody.match(/<h1>([\s\S]*?)<\/h1>/)?.[1];
      if(title)html=html.replace(`<h1>${esc(page.heading)}</h1>`,()=>`<h1>${title}</h1>`);
      customBody=customBody.replace(/<h1>[\s\S]*?<\/h1>/,'').replace(/<p class="public-eyebrow">[\s\S]*?<\/p>/,'');
    }
    const end=`<section class="public-end-cta"><p class="public-eyebrow">YOUR WEDDING. A LITTLE MORE SPARK.</p><h2>Start bringing your wedding together.</h2><div class="public-actions">${link(prefix+'signup/?experience=couple','Start your wedding plan','public-button light')}</div></section>`;
    html=html.replace(/<main id="public-content">[\s\S]*?<\/main>/,()=>`<main id="public-content">${customBody}${end}</main>`);
  }
  if(page.kind==='import')html=html.replace(/<section class="public-end-cta">[\s\S]*?<\/section>/,'');
  return html;
}
const supplierRouteContext={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(new URL('../dist/wedding-suppliers/supplier-routes.js',import.meta.url),'utf8'),supplierRouteContext);
const supplierRoutes=supplierRouteContext.module.exports;
const supplierSeoContext={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(new URL('../dist/wedding-suppliers/supplier-seo-content.js',import.meta.url),'utf8'),supplierSeoContext);
const supplierSeoContent=supplierSeoContext.module.exports;
function marketplacePresentation(html,prefix){
  if(!html.includes('class="marketplace-search-page"'))return html;
  if(!html.includes('public-photo-banner'))html=html.replace('<section class="marketplace-hero" aria-label="Wedding supplier marketplace search">',`<section class="marketplace-hero public-photo-banner" aria-label="Wedding supplier marketplace search"><img src="${supplierRoutes.mainHero}" alt="" width="1536" height="1024" fetchpriority="high"><div class="public-photo-banner-copy"><p class="public-eyebrow">FIND YOUR WEDDING TEAM</p>`).replace('<h1 class="marketplace-title">Search Wedding Suppliers</h1>','<h1 class="marketplace-title">Search Wedding Suppliers</h1></div>');
  html=html.replace(/(<div class="marketplace-category-grid" id="marketplace-category-grid">)[\s\S]*?(<\/div>)/,()=>`<div class="marketplace-category-grid" id="marketplace-category-grid">${supplierRoutes.categories.map((c,i)=>`<a class="marketplace-category-card has-data-image${i===0?' marketplace-category-featured':''}" href="${prefix}wedding-suppliers/${c.slug}/" style="background-image:url('${c.hero}')"><span><strong>${c.label}</strong><small>Explore <b aria-hidden="true">→</b></small></span></a>`).join('')}</div>`);
  return html;
}
function directoryPresentation(html,prefix){
  if(!html.includes('supplier-category-page'))return html;
  const title=html.match(/<h1 class="marketplace-title">([^<]+)<\/h1>/)?.[1]||'Find Wedding Suppliers';
  const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1]||'';
  const segments=canonical.split('/wedding-suppliers/')[1]?.split('/').filter(Boolean)||[];
  const category=supplierRoutes.categoryBySlug(segments[0]);
  const location=supplierRoutes.locationBySlug(category?segments[1]:segments[0]);
  const hero=category?.hero||supplierRoutes.mainHero;
  const focal=category?.heroPosition||(!category&&supplierRoutes.mainHeroPosition)||'center calc(50% - 50px)';
  const heroClass=`supplier-hero-image${category?.heroFlip?' supplier-hero-image--flipped':''}`;
  const heroTransform=category?.heroFlip?'transform:scaleX(-1);':'';
  html=html.replace(/<section class="marketplace-hero[^"]*"[\s\S]*?<\/section>/,()=>`<section class="marketplace-hero public-photo-banner" aria-label="Wedding supplier discovery" style="--supplier-hero-position:${focal}"><img class="${heroClass}" src="${hero}" style="object-position:${focal};${heroTransform}" alt="" width="1536" height="1024" fetchpriority="high"><div class="public-photo-banner-copy"><h2 class="supplier-hero-subtitle">CONNECT WITH THE RIGHT SUPPLIERS FOR YOUR WEDDING</h2><h1 class="marketplace-title">${title}</h1></div></section>`);
  const seoCategory=category?.value||'All wedding suppliers';
  const seoLocation=location?(location.abbreviation||location.label):'';
  const seoKey=seoLocation?`${seoCategory} + ${seoLocation}`:category?`${seoCategory} + No Location selected or Location selected that IS NOT state or main city`:'All wedding suppliers + Any location / no category selected';
  const locationOnlySeoCopy={title:'Bring Your Wedding Plans Together with the Right Suppliers',paragraph:'Explore wedding suppliers across photography, venues, flowers, catering, cakes, entertainment, styling and more. Compare profiles, services and packages to see which vendors suit your plans and budget. Consider your date, guest numbers and venue requirements before requesting quotes. Browse by category or filter by location to discover wedding professionals for your celebration.'};
  const seoCopy=(!category&&location?locationOnlySeoCopy:supplierSeoContent[seoKey])||supplierRoutes.seoContent(category);
  const seoSection=`<section class="supplier-seo-dynamic" aria-live="polite"><h3 data-seo-dynamic-title>${esc(seoCopy.title)}</h3><p data-seo-dynamic-paragraph>${esc(seoCopy.paragraph)}</p></section>`;
  html=html.replace(/<section class="supplier-seo-dynamic"[\s\S]*?<\/section>/,'');
  html=html.replace(/<section class="public-discovery-intro"[\s\S]*?<\/section>/,'');
  html=html.replace('<section class="supplier-category-content"',seoSection+'<section class="supplier-category-content"');
  if(!html.includes('id="featured-card-template"'))html=html.replace(/<article class="featured-supplier-card"[\s\S]*?<\/article>/,m=>`<template id="featured-card-template">${m}</template>`);
  if(!html.includes('id="supplier-card-template"')){let first=true;html=html.replace(/<article class="supplier-listing-card"[\s\S]*?<\/article>/g,m=>{if(!first)return '';first=false;return `<template id="supplier-card-template">${m}</template><p class="directory-loading" role="status">Loading published suppliers…</p>`;});}
  html=html.replace('<span>467</span>','<span>—</span>');
  return html;
}
export function updateSitemap(){
  const pages=[];function walk(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,file.name);if(file.isDirectory())walk(abs);else if(file.name==='index.html'){const html=fs.readFileSync(abs,'utf8');if(/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)||/data-supplier-page|id="signup-form"|data-supplier-profile|id="messages-root"/.test(html))continue;const match=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);if(match&&match[1].startsWith(origin+'/'))pages.push(match[1]);}}}walk(root);writeText(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...new Set(pages)].sort().map(u=>'  <url><loc>'+esc(u)+'</loc></url>').join('\n')+'\n</urlset>\n');
}
function generate(){
  writeText(path.join(root,'assets/wedsparks-favicon.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><image width="1024" height="1024" href="data:image/webp;base64,${fs.readFileSync(path.join(root,'assets/wedsparks-favicon.webp')).toString('base64')}"/></svg>`);
  writeText(path.join(root,'assets/wedsparks-mark.svg'),brandMark.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ',1));
  const pages=[...publicPages,{path:'wedding-guides',title:'Wedding Planning Guides & Advice | WedSparks',description:'Practical wedding planning guides on budgets, checklists, venues, supplier quotes, invitations and wedding-day timelines.',eyebrow:'GOOD ADVICE FOR YOUR NEXT STEP',heading:'A little clarity. A lot more confidence.',lead:'Practical ideas to help you make decisions, ask useful questions and plan a wedding that feels like you.',kind:'guides'},...guides.map(g=>({path:'wedding-guides/'+g.slug,title:g.title+' | WedSparks',heading:g.title,description:g.description,lead:g.intro,sections:g.sections,article:true})),{path:'supplier-profile-import',title:'Import Your Wedding Business Details | WedSparks',description:'Prepare your wedding business storefront from a supported business-owned file, then review and save a private draft.',eyebrow:'A HEAD START FOR YOUR STOREFRONT',heading:'Bring the details you already have.',lead:'Upload a supported business-owned file. Review what comes across before saving it to your private supplier draft.',kind:'import'}];
  for(const page of pages){const dir=path.join(root,page.path);fs.mkdirSync(dir,{recursive:true});writeText(path.join(dir,'index.html'),renderPage(page));}
  let home=fs.readFileSync(new URL('./homepage-original.html',import.meta.url),'utf8').replace(/<base[^>]+>/,'').replace(/<meta name="robots"[^>]+>/,'');
  home=home.replace(/<title>.*?<\/title>/,'<title>WedSparks | Wedding Planning & Wedding Credits</title>').replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="Find wedding suppliers, organise your plans and earn $1,000 in wedding credits for every $10,000 paid through WedSparks payments.">');
  const creditSentence='Earn <strong>$1,000 in free wedding credits</strong> for every <strong>$10,000 paid through WedSparks</strong>.';
  const heroCopy='<div class="hero-copy"><h1 id="hero-title"><span class="headline-line">Create Your Day,</span><em class="headline-line">Your Way.</em></h1><div class="home-hero-summary"><p>Find your suppliers. Bring your wedding together. Earn $1,000 in free wedding credits for every $10,000 paid through WedSparks.</p></div><div class="public-home-actions"><a class="public-button" href="wedding-credits/">How WedSparks credits work ↗</a></div></div>\n';
  home=home.replace(/<link rel="icon"[^>]+>/,'<link rel="icon" type="image/svg+xml" href="assets/wedsparks-favicon.svg">');
  home=home.replace(/<div class="hero-copy">[\s\S]*?<div id="search"/,()=>heroCopy+'        <div id="search"');
  home=home.replace('href="https://www.google.com/"','href="wedding-suppliers/"').replace('<body>','<body class="public-home">');
  home=home.replace('<span class="trust-icon" data-icon="bookmark"></span>','<span class="trust-icon" data-icon="ring"></span>').replace('<h3>Save What You Love</h3><p>Build your supplier shortlist</p>','<h3>Free Wedding Credits</h3><p>$1,000 earned per $10,000 paid</p>');
  home=home.replace('Real and verified wedding vendors','Discover registered wedding businesses').replace('Discover Your Style</h3>','Plan Your Wedding Day</h3>').replace('Explore ideas, themes and suppliers that match the wedding you want to create.','Bring your timings and favourite moments together in one wedding-day run sheet.');
  const categoryMap={venues:'wedding-venues',florists:'wedding-florists',catering:'wedding-caterers',photography:'wedding-photographers',entertainment:'wedding-entertainment',cakes:'wedding-cakes','hair-and-makeup':'wedding-hair-stylists','styling-and-hire':'wedding-hire'};for(const [old,slug] of Object.entries(categoryMap))home=home.replaceAll('href="./?category='+old+'"','href="wedding-suppliers/'+slug+'/"');
  home=home.replace(/(<div class="planning-intro">[\s\S]*?<\/h2>)\s*<p>[\s\S]*?<\/p>/,'$1<p class="planning-lead">Find your suppliers, keep your plans together and earn wedding credits as you pay through WedSparks. Less scattered admin. More room for the day you want.</p>');
  home=home.replace(/<h3>Compare<\/h3>[\s\S]*?<p>[^<]*<\/p>/,'<h3>Connect</h3><p>Talk with suppliers, ask questions and keep your conversations together.</p>');
  home=home.replace(/<h3>Connect<\/h3>\s*<p>Save favourite suppliers[^<]*<\/p>/,'<h3>Plan</h3><p>Organise your budget, guests, tasks and wedding-day details in one place.</p>');
  home=home.replace(/<h3>Plan<\/h3>\s*<p>Manage your wedding budget[^<]*<\/p>/,'<h3>Earn</h3><p>Earn $1,000 in free wedding credits for every $10,000 of money paid through WedSparks. Use credits on your next supplier payment to bring your costs down.</p>');
  home=home.replace(/<p class="marketplace-account-banner-copy">[\s\S]*?<\/p>/,()=>'<p class="marketplace-account-banner-copy">Bring your suppliers and wedding plans together in one place. '+creditSentence+'</p>');
  home=home.replace('class="marketplace-account-banner-button" href="#"','class="marketplace-account-banner-button" href="signup/?experience=couple"');
  if(!home.includes('rel="canonical"'))home=home.replace('</head>',`<link rel="canonical" href="${origin}/"></head>`);
  writeText(path.join(root,'index.html'),home.replace(/[ \t]+$/gm,''));
  // Static navigation links stay available even if JavaScript or authentication fails.
  function navigation(dir){
    for(const f of fs.readdirSync(dir,{withFileTypes:true})){
      const abs=path.join(dir,f.name);if(f.isDirectory()){navigation(abs);continue;}if(f.name!=='index.html')continue;
      const original=fs.readFileSync(abs,'utf8');let html=original.replaceAll('supplier-category.js?v=30','supplier-category.js?v=31').replaceAll('marketplace.js?v=17','marketplace.js?v=18');
      const relative=path.relative(root,path.dirname(abs)),prefix='../'.repeat(relative?relative.split(path.sep).length:0);
      // Supplier route pages begin from the wedding-suppliers template, so make
      // their shared assets relative to the generated route rather than that
      // template. This keeps the card/chat enhancement loaded at every depth.
      html=html
        .replace(/href="(?:\.\.\/)*shared\/\.\.\/auth\.css"/g,`href="${prefix}auth.css"`)
        .replace(/src="(?:\.\.\/)*shared\/header-auth\.js"/g,`src="${prefix}shared/header-auth.js"`)
        .replace(/href="(?:\.\.\/)*shared\/public-site\.css"/g,`href="${prefix}shared/public-site.css"`)
        .replace(/src="(?:\.\.\/)*shared\/supplier-save-bridge\.js(?:\?v=\d+)?"/g,`src="${prefix}shared/supplier-save-bridge.js?v=3"`);
      const frozen=['suppliers','supplier','homepage-2'].includes(relative.split(path.sep)[0]);
      if(!frozen&&html.includes('class="site-header')){
        const mobileId=html.match(/class="mobile-menu-toggle"[^>]*aria-controls="([^"]+)"/)?.[1]||'mobile-navigation';
        html=html.replace(/<header class="site-header[^"]*">[\s\S]*?<\/header>/,()=>header(prefix,mobileId));
        html=directoryPresentation(html,prefix);
        html=marketplacePresentation(html,prefix);
        if(!/<link rel="icon"/.test(html))html=html.replace('</head>',`<link rel="icon" type="image/svg+xml" href="${prefix}assets/wedsparks-favicon.svg"></head>`);
        html=html.replace(/<link rel="icon"[^>]+>/,()=>`<link rel="icon" type="image/svg+xml" href="${prefix}assets/wedsparks-favicon.svg">`);
      }
      if(!html.includes('shared/public-site.css'))html=html.replace('</head>',`<link rel="stylesheet" href="${prefix}shared/public-site.css"></head>`);
      if(/<footer\b/.test(html))html=html.replace(/<footer\b[\s\S]*?<\/footer>/,()=>footer(prefix));
      else html=html.replace('</body>',footer(prefix)+'</body>');
      if(!frozen)html=applyPublicSeo(html,origin);html=html.replace(/[ \t]+$/gm,'');if(html!==original)writeText(abs,html);
    }
  }
  // Preserve old bookmarks without maintaining a second homepage variant.
  writeText(path.join(root,'homepage-2/index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=../"><title>WedSparks homepage</title></head><body><p><a href="../">Continue to the WedSparks homepage</a></p></body></html>`);
  navigation(root);updateSitemap();
  writeText(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`Generated ${pages.length} public pages; refreshed homepage, navigation and sitemap.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))generate();
