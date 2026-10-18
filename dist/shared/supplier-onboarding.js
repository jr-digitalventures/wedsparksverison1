import {requireUser,loadAccount,siteUrl,safeReturnPath,onSessionChange} from './auth.js';
import {createSupplierWorkspace} from './supplier-workspace-service.js';
import {cleanWorkspace,defaultCategories,missingEssentials} from './supplier-workspace-model.js';
import {supplierSetupSteps,setupFields,setupProgress,setupDestination,nextSetup} from './supplier-onboarding-model.js';
import {parseProfileImport} from './profile-import-parser.js';
import {identifyImportSource} from './supplier-import-sources.js';
import {el,renderSupplierProfile} from './supplier-profile-view.js';

const query=new URLSearchParams(location.search),preview=query.get('preview')==='1';
const loading=document.querySelector('#onboarding-loading'),layout=document.querySelector('#onboarding-layout'),content=document.querySelector('#onboarding-content'),steps=document.querySelector('#onboarding-steps');
const requestedReturn=safeReturnPath(query.get('returnTo'));
const destination=requestedReturn&&!new URL(requestedReturn,location.origin).pathname.includes('/supplier-onboarding')?requestedReturn:siteUrl('supplier-account/');
let owner=null,revoked=false,busy=false,publishedNow=false,service,data,step=0,fileRevision=0,importDraft=null,sourceDraft='',importMode='manual',importConsent=false,importReading=false;
const localDrafts=new Map(),temporaryPhotos=[];
const action=(label,fn,cls='text-button')=>{const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;};
function field(form,label,key,value='',type='text',options){
 const wrap=el('label',null,'auth-field'),input=el(options?'select':type==='textarea'?'textarea':'input');
 input.name=key;input.id='setup-'+key;input.setAttribute('aria-label',label);wrap.htmlFor=input.id;input.value=value||'';
 if(options){for(const [v,t] of options){const option=el('option',t);option.value=v;input.append(option);}input.value=value||'';}
 else if(type==='textarea'){input.rows=4;input.maxLength=6000;}else{input.type=type;input.maxLength=250;}
 if(type==='number'){input.min='0';input.max='10000000';input.step='0.01';}
 wrap.append(el('span',label),input);form.append(wrap);return input;
}
function values(){return Object.fromEntries((setupFields[step]||[]).map(key=>[key,content.querySelector('[name="'+key+'"]')?.value||'']));}
function remember(){if(step<6)localDrafts.set(step,values());}
function sidebar(){steps.replaceChildren();const progress=setupProgress(data.onboarding);supplierSetupSteps.forEach((title,i)=>{const item=el('li',(i<progress.step?'✓':i+1)+'  '+title);if(i===step)item.setAttribute('aria-current','step');steps.append(item);});}
function status(message){const target=content.querySelector('[role="status"]');if(target)target.textContent=message;}
async function run(task){
 if(busy||revoked)return;busy=true;const controls=[...content.querySelectorAll('button,input,select,textarea')].map(n=>[n,n.disabled]);controls.forEach(([n])=>n.disabled=true);
 try{await task();}catch(error){if(!revoked)status(error.message||'Could not save. Your details are still here; please try again.');}
 finally{busy=false;controls.forEach(([n,disabled])=>{if(n.isConnected)n.disabled=disabled;});}
}
async function persist(next){if(!preview)await service.save(next);if(revoked)throw new Error('Your session changed. Please sign in again.');data=next;}
async function advance(skip=false){await run(async()=>{
 if(step===0&&!skip&&importMode==='import'&&importReading)throw new Error('Your file is still opening. Please wait a moment or skip this step.');
 let next=nextSetup(data,step,skip?{}:values(),skip);
 if(step===0&&!skip&&importMode==='import'){
   let nzSource=false;if(sourceDraft){const identified=identifyImportSource(sourceDraft);nzSource=identified.source?.countries.length===1&&identified.source.countries[0]==='NZ';next.onboarding.sourceUrl=sourceDraft;}
   if(importDraft){
     if(!content.querySelector('#setup-import-rights')?.checked)throw new Error('Confirm that you represent this business and can reuse these details, or skip this step.');
     for(const row of content.querySelectorAll('[data-import-key]')){if(row.querySelector('input[type=checkbox]').checked){const key=row.dataset.importKey;if(nzSource&&key==='startingPrice')continue;next.storefront[key]=row.querySelector('[data-import-value]').value.trim();}}
   }
 }
 await persist(next);if(revoked)return;localDrafts.delete(step);step=next.onboarding.step;render();
 });}
async function finishLater(){await run(async()=>{const next=nextSetup(data,5,{},true);await persist(next);if(!revoked){step=6;render();}});}
function render(){
 if(revoked)return;fileRevision++;importReading=false;sidebar();content.replaceChildren();
 if(preview)content.append(el('p','Preview only · Nothing is saved or published.','setup-preview-notice'));
 else if(service.mode!=='cloud')content.append(el('p','Browser review mode · Changes are saved on this browser only.','setup-preview-notice'));
 if(step===6){content.append(el('p','YOUR BUSINESS. AT YOUR PACE.','onboarding-progress'),el('h1','You’re ready to explore.'),el('p',preview?'That’s the setup flow. Create your supplier account when you’re ready.':publishedNow?'Your supplier profile is published. You can keep managing your business in the dashboard.':'Your setup choices are saved. Your listing’s publication status has not changed.','auth-intro'));
   const a=el('a',preview?'Create supplier account':'Go to my supplier dashboard','auth-primary onboarding-complete-link');a.href=preview?siteUrl('signup/?experience=supplier'):destination;content.append(a,action('Review the setup again',()=>{step=0;render();}));content.querySelector('h1').tabIndex=-1;content.querySelector('h1').focus();return;
 }
 const titles=['Already listed somewhere?','Tell couples who you are.','Where do you work?','Let your business shine.','A starting point for your services.','Your business, coming together.'];
 const copy=['Bring your own business details across, or start fresh. Importing is optional.','Start with the basics. You can leave any of these details for later.','Help couples understand where you are based and the areas you cover.','A short introduction and a main photo make a lovely start. You can add more later.','Share a starting price if you want to. Packages and availability can be set up in your dashboard.','Preview your storefront, keep working privately or publish when you are ready.'];
 content.append(el('p','Step '+(step+1)+' of 6','onboarding-progress'),el('h1',titles[step]),el('p',copy[step],'auth-intro'));
 const form=el('form');form.noValidate=true;content.append(form);
 const draft={...data.storefront,...(localDrafts.get(step)||{})};
 if(step===0)importStep(form);
 if(step===1){field(form,'Business name','name',draft.name);const category=field(form,'Supplier category','category',draft.category);category.setAttribute('list','setup-categories');const list=el('datalist');list.id='setup-categories';defaultCategories.forEach(name=>{const o=el('option');o.value=name;list.append(o);});form.append(list);field(form,'Business website · optional','website',draft.website,'url');form.append(el('p','Listing and core tools are free. Suppliers pay 18% commission on invoices paid through WedSparks. Couple Leads is optional at $50/month.','setup-note'));}
 if(step===2){field(form,'Country','country',draft.country,'text',[['','Choose a country'],['AU','Australia'],['NZ','New Zealand']]);field(form,'City or suburb','city',draft.city);field(form,'State, territory or region','state',draft.state);field(form,'Areas you serve · optional','serviceAreas',draft.serviceAreas,'textarea');}
 if(step===3){field(form,'Short introduction · optional','tagline',draft.tagline);field(form,'About your business','about',draft.about,'textarea');field(form,'Key features · optional, one per line','features',draft.features,'textarea');photoStep(form);}
 if(step===4){field(form,'Starting price · AUD, optional','startingPrice',draft.startingPrice,'number');form.append(el('p','Leave this blank if you prefer to quote individually. Pricing here is in Australian dollars. You can add pricing packages, availability and policies later in Your Storefront and the other dashboard tabs.','setup-note'));}
 if(step===5)reviewStep(form);
 const message=el('p','','auth-status');message.setAttribute('role','status');message.setAttribute('aria-live','polite');form.append(message);
 const actions=el('div',null,'onboarding-actions');if(step>0)actions.append(action('Back',()=>{if(busy)return;remember();step--;render();}));
 const next=el('button',step===5?'Save draft and finish':'Continue','auth-primary');next.type='submit';actions.append(next);form.append(actions,action('Skip for now',()=>void advance(true),'text-button onboarding-skip'));
 const leave=action('Skip all and finish later',()=>void finishLater(),'text-button setup-leave');form.append(leave);
 const exit=el('a',preview?'Return to For Suppliers':'Go to dashboard without saving','setup-exit');exit.href=preview?siteUrl('for-suppliers/'):siteUrl('supplier-account/');form.append(exit);
 form.onsubmit=e=>{e.preventDefault();void advance(false);};content.querySelector('h1').tabIndex=-1;content.querySelector('h1').focus();
}
function importStep(form){
 const choices=el('fieldset',null,'onboarding-options');choices.append(el('legend','How would you like to start?'));
 const group=el('div');group.hidden=importMode!=='import';
 for(const [value,title] of [['import','Import my existing details'],['manual','Start from scratch']]){const label=el('label',null,'auth-choice'),radio=el('input');radio.type='radio';radio.name='setup-start';radio.value=value;radio.checked=importMode===value;radio.onchange=()=>{importMode=value;group.hidden=value!=='import';};label.append(radio,el('strong',title));choices.append(label);}
 form.append(choices,group);
 const source=field(group,'Public business profile link · optional','source',sourceDraft,'url');source.maxLength=1500;source.oninput=()=>sourceDraft=source.value;
 group.append(el('p','Website links can be noted, but automatic website importing is not connected yet. Upload your own file to bring supported details across now. No competitor password is needed.','setup-note'));
 const upload=field(group,'Business-owned file · text, CSV, JSON or HTML','importFile','','file');upload.accept='.txt,.csv,.json,.html,.htm';
 const note=el('p','','setup-note'),review=el('div',null,'setup-import-review');group.append(note,review);
 function paint(){review.replaceChildren();if(!importDraft)return;review.append(el('h2','Choose the details to bring across'),el('p','Existing values are unchecked. Select a field only if you want to replace it.','setup-note'));
 for(const [key,value] of Object.entries(importDraft.fields)){const row=el('div',null,'setup-import-row');row.dataset.importKey=key;const check=el('input');check.type='checkbox';check.checked=!String(data.storefront[key]||'').trim();check.setAttribute('aria-label','Import '+key);const input=field(row,key.replace(/([A-Z])/g,' $1'),'import-'+key,value,['about','features','faq','cancellation','privacy'].includes(key)?'textarea':'text');input.dataset.importValue='';row.prepend(check);review.append(row);}
 const rights=el('label',null,'setup-consent'),check=el('input');check.type='checkbox';check.id='setup-import-rights';check.checked=importConsent;check.onchange=()=>importConsent=check.checked;rights.append(check,el('span','I represent this business and have permission to reuse these details.'));review.append(rights);}
 paint();
 upload.onchange=async()=>{const revision=++fileRevision;importDraft=null;importConsent=false;importReading=false;review.replaceChildren();const file=upload.files?.[0];if(!file)return;importReading=true;try{if(file.size>250000)throw new Error('Choose a file under 250 KB.');const ext=file.name.split('.').pop().toLowerCase();if(!['txt','csv','json','html','htm'].includes(ext))throw new Error('Choose a text, CSV, JSON or HTML file.');const text=await file.text();if(revoked||revision!==fileRevision)return;importDraft=parseProfileImport(text,['htm','html'].includes(ext)?'html':ext==='txt'?'text':ext);note.textContent='Review the fields below. Nothing has been saved yet.';paint();}catch(error){if(!revoked&&revision===fileRevision)note.textContent=error.message;}finally{if(revision===fileRevision)importReading=false;}};
}
function photoStep(form){
 const gallery=el('div',null,'setup-photos');form.append(gallery);
 async function paint(){const urls=preview?data.storefront.images.map(i=>i.url):await Promise.all(data.storefront.images.map(i=>service.imageUrl(i)));if(revoked||!gallery.isConnected)return;gallery.replaceChildren();data.storefront.images.forEach((image,i)=>{const tile=el('div'),img=el('img');img.src=urls[i];img.alt=i?'Gallery photo '+(i+1):'Main business photo';tile.append(img,el('small',i?'Photo '+(i+1):'Main photo'));gallery.append(tile);});}
 void paint();
 const upload=field(form,'Add photos · optional','photos','','file');upload.type='file';upload.multiple=true;upload.accept='image/jpeg,image/png,image/webp';
 upload.onchange=()=>void run(async()=>{const files=Array.from(upload.files||[]);if(data.storefront.images.length+files.length>10)throw new Error('Choose up to ten photos in total.');const next=structuredClone(data);
 for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose JPG, PNG or WebP photos under 5 MB.');if(preview){const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('This photo could not be read.'));reader.readAsDataURL(file);});next.storefront.images.push({url});}else next.storefront.images.push(await service.upload(file));}
 await persist(next);if(!revoked){upload.value='';await paint();status(preview?'Photos added to this preview only.':'Photos saved to your private draft.');}});
 form.append(el('p','Only upload photos you have permission to use. The first photo is your main image; reorder or remove photos in Your Storefront.','setup-note'));
}
function reviewStep(form){
 const missing=missingEssentials(data.storefront);form.append(el('p',service?.published?'Your existing published listing stays as it is until you explicitly publish an update.':'Your business is a private draft. Finishing setup does not publish it.','setup-note'));
 if(missing.length){form.append(el('h2','You can add these later'),el('p',missing.join(' · '),'setup-note'));}else form.append(el('p','Your essential profile details are ready.','setup-note'));
 form.append(action('Preview my supplier page',()=>void run(async()=>{const dialog=el('dialog',null,'setup-preview-dialog'),close=action('Close preview',()=>dialog.close(),'auth-primary'),body=el('div');dialog.setAttribute('aria-label','Your supplier page preview');dialog.append(close,body);const images=preview?data.storefront.images:await Promise.all(data.storefront.images.map(async image=>({url:await service.imageUrl(image)})));if(revoked)return;renderSupplierProfile(body,{...data.storefront,images},{packages:data.packages,preview:true});dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();}),'setup-preview-button'));
 const publish=action('Publish my profile',()=>void run(async()=>{if(preview)throw new Error('Preview only. Sign in to publish your own supplier profile.');const missing=missingEssentials(data.storefront);if(missing.length)throw new Error('Add '+missing.join(', ').toLowerCase()+' before publishing, or finish with a private draft.');const next=nextSetup(data,5);await service.publish(next);if(revoked)return;data=next;publishedNow=true;step=6;render();}),'setup-publish');publish.disabled=preview||missing.length>0||service?.mode!=='cloud';form.append(publish);
}
onSessionChange(({user})=>{if(preview||!owner||user?.id===owner)return;revoked=true;fileRevision++;document.querySelectorAll('.setup-preview-dialog').forEach(d=>d.close());content.replaceChildren();layout.hidden=true;loading.hidden=false;loading.textContent='Your session changed. Please sign in again.';});
window.addEventListener('pagehide',()=>temporaryPhotos.forEach(url=>URL.revokeObjectURL(url)));
async function start(){try{
 if(preview){data=cleanWorkspace();}else{const user=await requireUser(location.pathname+location.search);if(!user)return;owner=user.id;const account=await loadAccount(user);if(revoked)return;if(!account.roles.includes('supplier')){location.replace(siteUrl('dashboard/'));return;}service=createSupplierWorkspace(owner);data=await service.load();if(revoked)return;
 if(setupDestination(data,{entry:query.get('entry')==='1',linked:!!service.vendorId})==='dashboard'){location.replace(destination);return;}}
 step=setupProgress(data.onboarding).step;if(step===6)step=0;loading.hidden=true;layout.hidden=false;render();
 }catch(error){loading.textContent=error.message||'Could not open your setup. Please reload and try again.';const a=el('a','Preview the setup without saving');a.href=siteUrl('supplier-onboarding/?preview=1');loading.append(document.createElement('br'),a);}}
void start();
