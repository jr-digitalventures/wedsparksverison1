import {verifiedUser,loadAccount,siteUrl} from './auth.js';
import {createSupplierWorkspace} from './supplier-workspace-service.js';
import {identifyImportSource,importSourcesForCountry} from './supplier-import-sources.js';
import {parseProfileImport} from './profile-import-parser.js';
const root=document.querySelector('[data-profile-import]');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const fieldNames={name:'Business name',category:'Supplier category',about:'About your business',tagline:'Short introduction',city:'City or suburb',state:'State or region',website:'Business website',features:'Features',startingPrice:'Starting price · AUD',faq:'FAQs',cancellation:'Cancellation policy',privacy:'Privacy policy'};
if(root){
 root.replaceChildren();const form=el('form'),grid=el('div',null,'public-import-grid'),left=el('div'),right=el('div'),status=el('p','','public-import-status');status.setAttribute('role','status');status.hidden=true;
 function label(text,id,input){const wrap=el('label',text);wrap.htmlFor=id;input.id=id;left.append(wrap,input);return input;}
 left.append(el('h2','Your existing details'));
 const source=label('Public business profile link · optional','import-source',el('input'));source.type='url';source.placeholder='https://…';source.maxLength=1500;
 const sourceHint=el('p','This recognises a source; it does not fetch the website. Upload a business-owned file below.','public-small');left.append(sourceHint);
 source.onchange=()=>{if(!source.value){sourceHint.textContent='Upload a supported file below.';return;}try{const identified=identifyImportSource(source.value);sourceHint.textContent=identified.source?identified.source.name+' recognised. Automatic website importing is not connected yet; continue by uploading your own file.':'Business website link noted. Upload a business-owned file below.';}catch(error){sourceHint.textContent=error.message;}};
 const file=label('Upload a business-owned file · text, CSV, JSON or HTML','import-file',el('input'));file.type='file';file.accept='.txt,.csv,.json,.html,.htm,text/plain,text/csv,application/json,text/html';
 let importedText='';
 const rights=el('label',null,'public-check-task'),consent=el('input');consent.type='checkbox';consent.required=true;rights.append(consent,el('span','I represent this business and have permission to reuse the details I provide.'));left.append(rights);
 const submit=el('button','Review imported details','public-button');submit.type='submit';submit.disabled=true;left.append(submit);
 right.append(el('h2','Review before saving'),el('p','Supported details will appear here for you to check and amend. No images, reviews or account credentials are imported.','public-small'));
 grid.append(left,right);form.append(grid);root.append(form,status);
 const sources=el('details'),summary=el('summary','Our Australia & New Zealand import research list');sources.append(summary);for(const country of ['AU','NZ']){sources.append(el('h3',country==='AU'?'Australia':'New Zealand'));const list=el('p');list.textContent=importSourcesForCountry(country).map(s=>s.name).join(' · ');sources.append(list);}root.append(sources);
 let loadedFormat='text',fileRevision=0;
 file.onchange=async()=>{
   const revision=++fileRevision;importedText='';submit.disabled=true;const item=file.files?.[0];if(!item)return;
   status.hidden=false;
   if(item.size>250000){status.textContent='Choose a file under 250 KB.';return;}
   const ext=item.name.split('.').pop().toLowerCase();
   if(!['txt','csv','json','html','htm'].includes(ext)){status.textContent='Choose a text, CSV, JSON or HTML file.';return;}
   loadedFormat=['html','htm'].includes(ext)?'html':ext==='txt'?'text':ext;
   try{const content=await item.text();if(revision!==fileRevision)return;importedText=content;submit.disabled=false;status.textContent='File ready. Review the details before saving.';}catch{if(revision===fileRevision)status.textContent='This file could not be read. Please choose it again.';}
 };
 form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;status.hidden=false;try{const identified=source.value?identifyImportSource(source.value):null;const result=parseProfileImport(importedText,loadedFormat);if(identified?.source?.countries.length===1&&identified.source.countries[0]==='NZ'){delete result.fields.startingPrice;result.notes.push('Prices from this New Zealand source are left out of the AUD storefront fields.');}paint(result);status.textContent='Review the selected fields. Nothing has been saved or published.';status.classList.remove('public-error');}catch(error){status.textContent=error.message;status.classList.add('public-error');}};
 function paint(result){
   right.replaceChildren(el('h2','Choose what to bring across'));const selected=[];
   for(const [key,value] of Object.entries(result.fields)){const row=el('div',null,'public-import-select'),check=el('input'),label=el('label'),input=el(['about','features','faq','cancellation','privacy'].includes(key)?'textarea':'input');check.type='checkbox';check.checked=true;check.setAttribute('aria-label','Import '+fieldNames[key]);input.value=value;input.maxLength=['about','features','faq','cancellation','privacy'].includes(key)?6000:250;label.append(el('span',fieldNames[key]),input);row.append(check,label);right.append(row);selected.push({key,check,input});}
   const overwrite=el('label',null,'public-check-task'),replace=el('input');replace.type='checkbox';overwrite.append(replace,el('span','Replace existing draft values for the fields I selected. Otherwise, only empty fields are filled.'));right.append(overwrite);
   result.notes.forEach(note=>right.append(el('p',note,'public-small')));
   const save=el('button','Save to my supplier draft','public-button');save.type='button';right.append(save);
   save.onclick=async()=>{save.disabled=true;status.hidden=false;status.textContent='Saving your private draft…';try{
     const user=await verifiedUser();if(!user){status.textContent='Your preview is ready. Create a supplier account or sign in, then reopen this page to save. Uploaded details are not stored during sign-up.';const a=el('a','Create supplier account','public-button secondary');a.href=siteUrl('signup/?experience=supplier&returnTo='+encodeURIComponent(new URL(siteUrl('supplier-profile-import/')).pathname));right.append(a);return;}
     const account=await loadAccount(user);if(!account.roles.includes('supplier'))throw new Error('Please use your supplier account to save a business draft.');
     const service=createSupplierWorkspace(user.id),workspace=await service.load();if(service.mode!=='cloud')throw new Error('Connected draft saving is not available. Keep your text or file and try again later.');
     let count=0;for(const {key,check,input} of selected){if(check.checked&&(replace.checked||!String(workspace.storefront[key]||'').trim())){workspace.storefront[key]=input.value.trim();count++;}}
     if(!count)throw new Error('No empty fields were selected. Choose fields to replace or leave your existing draft unchanged.');
     // The checked workspace API preserves account ownership and rejects version conflicts.
     await service.save(workspace);status.textContent=count+' field'+(count===1?'':'s')+' saved to your private draft. Your public page has not changed.';status.classList.remove('public-error');
     const a=el('a','Open my storefront →','public-button secondary');a.href=siteUrl('supplier-account/storefront/');right.append(a);
   }catch(error){status.textContent=error.message;status.classList.add('public-error');}finally{save.disabled=false;}};
 }
}
