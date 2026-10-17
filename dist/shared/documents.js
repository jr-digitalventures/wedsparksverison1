import {supabase} from './supabase-client.js';
import {requireUser,loadAccount,siteUrl,onSessionChange} from './auth.js';

const $=id=>document.getElementById(id);
const content=$('doc-content');
const bucket='couple-documents';
const maxBytes=10485760;
const allowed={
  'application/pdf':'pdf',
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp'
};

let owner=null, rows=[], busy=false, loading=false, revoked=false, editing=null;

const escName=value=>String(value||'').replace(/\.[^.]+$/,'').slice(0,160)||'Untitled document';
const dateLabel=value=>value
  ?new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})
  :'';
const sizeLabel=value=>{
  const bytes=Number(value||0);
  return bytes<1048576
    ?`${Math.max(1,Math.round(bytes/1024))} KB`
    :`${(bytes/1048576).toFixed(1)} MB`;
};
function node(tag,text,className){
  const item=document.createElement(tag);
  item.textContent=text;
  if(className)item.className=className;
  return item;
}
function status(message,error=false){
  $('doc-status').textContent=message;
  $('doc-status').dataset.error=String(error);
}
function filtered(){
  const search=$('doc-search').value.trim().toLocaleLowerCase();
  const category=$('doc-category-filter').value;
  return rows.filter(row=>
    (!search||`${row.title} ${row.category} ${row.original_filename}`
      .toLocaleLowerCase().includes(search))&&
    (!category||row.category===category)
  );
}

content.innerHTML=`
  <div class="ct-heading">
    <div>
      <h2>Keep every detail close</h2>
      <p>Quotes, contracts, invoices and plans, in one private place.</p>
    </div>
    <button id="doc-add" class="ct-primary" type="button">+ Add document</button>
  </div>
  <div class="doc-note">
    <strong>Private to you</strong>
    <span>PDF, JPG, PNG or WebP · Up to 10 MB each</span>
  </div>
  <div class="ct-filters">
    <label>Find a document
      <input id="doc-search" type="search" placeholder="Name, category or file name">
    </label>
    <label>Category
      <select id="doc-category-filter"><option value="">All categories</option></select>
    </label>
  </div>
  <div class="ct-toolbar">
    <p id="doc-status" role="status" aria-live="polite"></p>
    <div class="doc-refresh-wrap"><button id="doc-refresh" type="button">Refresh documents</button><span>New file not opening yet? Refresh here.</span></div>
  </div>
  <ul id="doc-list" class="ct-list"></ul>
  <div id="doc-empty" hidden>
    <h2 id="doc-empty-title">Your documents will appear here</h2>
    <p id="doc-empty-text">Add a contract, quote or wedding plan when you are ready.</p>
    <button id="doc-empty-add" class="ct-primary" type="button">Add your first document</button>
  </div>
  <dialog id="doc-dialog" aria-labelledby="doc-dialog-title">
    <form id="doc-form">
      <h2 id="doc-dialog-title">Add document</h2>
      <fieldset id="doc-fields">
        <label id="doc-file-row">Choose a file
          <input id="doc-file" name="file" type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp">
        </label>
        <div class="ct-form-grid">
          <label>Document name
            <input name="title" required maxlength="160" placeholder="e.g. Venue contract">
          </label>
          <label>Category
            <input name="category" required maxlength="80" value="Other"
              list="doc-categories">
          </label>
        </div>
        <datalist id="doc-categories">
          <option value="Contract"></option>
          <option value="Quote"></option>
          <option value="Invoice"></option>
          <option value="Receipt"></option>
          <option value="Plan"></option>
          <option value="Inspiration"></option>
          <option value="Venue"></option>
          <option value="Catering"></option>
          <option value="Photography"></option>
          <option value="Flowers & styling"></option>
          <option value="Attire"></option>
          <option value="Music & entertainment"></option>
          <option value="Transport"></option>
          <option value="Stationery"></option>
          <option value="Celebrant"></option>
          <option value="Other"></option>
        </datalist>
        <p id="doc-form-status" class="ct-help" role="status"></p>
      </fieldset>
      <div class="ct-actions">
        <button id="doc-save" class="ct-primary" type="submit">Upload document</button>
        <button id="doc-close" type="button">Close</button>
      </div>
    </form>
  </dialog>
`;

const style=document.createElement('style');
style.textContent=`
  #doc-content > .ct-heading{
    padding:20px 24px;border-radius:14px;background:#214c3e;margin-bottom:24px
  }
  #doc-content > .ct-heading h2{color:white}
  #doc-content > .ct-heading p{color:#e0ebe2}
  #doc-content > .ct-heading .ct-primary{
    background:#fffaf0;color:#214c3e;border-color:#fffaf0
  }
  #doc-content > .ct-heading .ct-primary:hover{
    background:white;color:#214c3e
  }
  #doc-content .doc-note{
    display:flex;justify-content:space-between;gap:16px;align-items:center;
    padding:14px 18px;margin-bottom:20px;border:1px solid #d7ddd6;
    border-radius:12px;background:#fffaf0;color:#214c3e
  }
  #doc-content .doc-note span{font-size:14px}
  #doc-content .doc-refresh-wrap{
    display:flex;align-items:center;gap:10px;flex-wrap:wrap
  }
  #doc-content .doc-refresh-wrap span{color:#637166;font-size:13px}
  #doc-content .doc-row{padding:13px 14px;align-items:center}
  #doc-content .doc-body{min-width:0;flex:1}
  #doc-content .doc-body strong,
  #doc-content .doc-body p{
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap
  }
  #doc-content .doc-body p{margin:5px 0 0}
  #doc-content #doc-empty{
    padding:24px;border:1px dashed #bdc8be;border-radius:12px;background:white
  }
  #doc-dialog{width:min(620px,calc(100% - 32px))}
  #doc-dialog label{margin-bottom:12px}
  #doc-form-status[data-error="true"]{color:#9b382d}
  @media(max-width:600px){
    #doc-content > .ct-heading{padding:18px}
    #doc-content .doc-note{align-items:flex-start;flex-direction:column}
    #doc-content .doc-row{flex-wrap:wrap}
  }
`;
document.head.append(style);

const dialog=$('doc-dialog');
const form=$('doc-form');
const fields=form.elements;

// Documents category picker
(() => {
  const input=fields.category;
  input.removeAttribute('list');
  input.removeAttribute('value');
  input.value='';
  input.autocomplete='off';
  input.placeholder='Type or choose a category';
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');

  const wrapper=document.createElement('div');
  wrapper.className='doc-category-picker';
  input.parentNode.insertBefore(wrapper,input);
  wrapper.append(input);

  const arrow=document.createElement('span');
  arrow.className='doc-category-arrow';
  arrow.textContent='⌄';
  arrow.setAttribute('aria-hidden','true');

  const menu=document.createElement('div');
  menu.id='doc-category-options';
  menu.hidden=true;
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label','Document category suggestions');
  wrapper.append(arrow,menu);

  input.setAttribute('aria-controls',menu.id);

  const pickerStyle=document.createElement('style');
  pickerStyle.textContent=`
    #doc-dialog .doc-category-picker{position:relative}
    #doc-dialog .doc-category-picker input{margin:0;padding-right:42px}
    #doc-dialog .doc-category-arrow{
      position:absolute;right:14px;top:50%;transform:translateY(-50%);
      color:#214c3e;font-size:17px;pointer-events:none
    }
    #doc-dialog #doc-category-options{
      position:absolute;z-index:20;top:calc(100% + 6px);left:0;right:0;
      max-height:210px;overflow:auto;padding:5px;
      border:1px solid #b7c4bc;border-radius:9px;background:#fffdf9;
      box-shadow:0 5px 16px #173e3314
    }
    #doc-dialog #doc-category-options[hidden]{display:none}
    #doc-dialog #doc-category-options [role=option]{
      padding:10px 12px;border-radius:5px;color:#214c3e;cursor:pointer
    }
    #doc-dialog #doc-category-options [role=option]:hover,
    #doc-dialog #doc-category-options [aria-selected=true]{
      background:#214c3e;color:white
    }
    #doc-dialog .doc-category-help{
      display:block;margin-top:5px;color:#536158;font-size:11px;line-height:1.5
    }
  `;
  document.head.append(pickerStyle);

  const defaultOptions=[...$('doc-categories').options].map(option=>option.value);
  let choices=[],selected=-1;

  function close(){
    menu.hidden=true;
    selected=-1;
    input.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-activedescendant');
  }
  function highlight(index){
    selected=index;
    [...menu.querySelectorAll('[role="option"]')].forEach((option,itemIndex)=>{
      option.setAttribute('aria-selected',String(itemIndex===index));
    });
    const active=menu.querySelectorAll('[role="option"]')[index];
    if(active){
      input.setAttribute('aria-activedescendant',active.id);
      active.scrollIntoView({block:'nearest'});
    }else{
      input.removeAttribute('aria-activedescendant');
    }
  }
  function choose(index){
    if(!choices[index])return;
    input.value=choices[index].value;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    close();
  }
  function show(){
    if(busy||!dialog.open)return;

    const typed=input.value.trim();
    const search=typed.toLocaleLowerCase('en-AU');
    const names=new Map();

    defaultOptions.concat(rows.map(row=>row.category)).forEach(value=>{
      const name=String(value||'').trim();
      const key=name.toLocaleLowerCase('en-AU');
      if(name&&!names.has(key))names.set(key,name);
    });

    choices=[...names.values()]
      .sort((a,b)=>a.localeCompare(b,'en-AU',{numeric:true}))
      .filter(name=>name.toLocaleLowerCase('en-AU').includes(search))
      .map(value=>({value,label:value}));

    if(typed&&!names.has(search)){
      choices.push({
        value:typed,
        label:`Use “${typed}” — new`,
        isNew:true
      });
    }

    menu.replaceChildren();
    selected=-1;
    input.removeAttribute('aria-activedescendant');

    choices.forEach((choice,index)=>{
      const option=document.createElement('div');
      option.id=`doc-category-option-${index}`;
      option.setAttribute('role','option');
      option.setAttribute('aria-selected','false');
      option.textContent=choice.label;
      option.addEventListener('pointerdown',event=>event.preventDefault());
      option.addEventListener('click',()=>choose(index));
      menu.append(option);
    });

    if(!choices.length){
      const empty=document.createElement('div');
      empty.textContent='No saved categories yet. Type one to get started.';
      empty.style.cssText='padding:10px 12px;color:#536158';
      menu.append(empty);
    }

    menu.hidden=false;
    input.setAttribute('aria-expanded','true');
  }

  input.addEventListener('focus',show);
  input.addEventListener('click',show);
  input.addEventListener('input',show);
  input.addEventListener('blur',close);

  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(menu.hidden)show();
      if(!choices.length)return;
      const direction=event.key==='ArrowDown'?1:-1;
      const next=selected<0
        ?(direction>0?0:choices.length-1)
        :(selected+direction+choices.length)%choices.length;
      highlight(next);
    }else if(event.key==='Enter'&&!menu.hidden){
      event.preventDefault();
      if(selected>=0)choose(selected);
      else if(input.value.trim())close();
    }else if(event.key==='Escape'&&!menu.hidden){
      event.preventDefault();
      close();
    }else if(event.key==='Tab'){
      close();
    }
  });
})();
function lock(value){
  busy=value;
  $('doc-fields').disabled=value;
  $('doc-save').disabled=value;
  $('doc-close').disabled=value;
  $('doc-add').disabled=value;
  $('doc-empty-add').disabled=value;
  $('doc-refresh').disabled=value||loading;
}
function refreshCategories(){
  const selected=$('doc-category-filter').value;
  $('doc-category-filter').replaceChildren(new Option('All categories',''));
  [...new Set(rows.map(row=>row.category))].sort((a,b)=>a.localeCompare(b))
    .forEach(category=>$('doc-category-filter').add(new Option(category,category)));
  if([...$('doc-category-filter').options].some(option=>option.value===selected)){
    $('doc-category-filter').value=selected;
  }
}
function render(){
  if(revoked)return;
  const visible=filtered();
  $('doc-list').replaceChildren(...visible.map(documentRow));
  $('doc-empty').hidden=visible.length>0;
  $('doc-empty-title').textContent=rows.length
    ?'No matching documents'
    :'Your documents will appear here';
  $('doc-empty-text').textContent=rows.length
    ?'Try a different name or category.'
    :'Add a contract, quote or wedding plan when you are ready.';
}
function documentRow(row){
  const item=node('li','','ct-row doc-row');
  const body=node('div','','doc-body');
  body.append(
    node('strong',row.title),
    node('p',`${row.category} · ${row.original_filename} · ${sizeLabel(row.size_bytes)} · ${dateLabel(row.created_at)}`)
  );

  const actions=node('div','','ct-actions');
  const open=node('button','Open');
  open.type='button';
  open.setAttribute('aria-label',`Open ${row.title}`);
  open.disabled=busy||loading;
  open.addEventListener('click',()=>void openDocument(row));

  const download=node('button','Download');
  download.type='button';
  download.setAttribute('aria-label',`Download ${row.title}`);
  download.disabled=busy||loading;
  download.addEventListener('click',()=>void downloadDocument(row));

  const edit=node('button','Edit');
  edit.type='button';
  edit.setAttribute('aria-label',`Edit ${row.title}`);
  edit.disabled=busy||loading;
  edit.addEventListener('click',()=>openEditor(row));

  const remove=node('button','Delete');
  remove.type='button';
  remove.setAttribute('aria-label',`Delete ${row.title}`);
  remove.disabled=busy||loading;
  remove.addEventListener('click',()=>{
    if(confirm(`Delete “${row.title}”? This removes the file permanently.`)){
      void removeDocument(row);
    }
  });

  actions.append(open,download,edit,remove);
  item.append(body,actions);
  return item;
}
async function refresh(){
  if(loading||revoked||!owner)return;
  loading=true;
  $('doc-refresh').disabled=true;
  try{
    const all=[];
    for(;;){
      const {data,count,error}=await supabase.from('couple_documents')
        .select('*',{count:'exact'})
        .eq('user_id',owner)
        .order('created_at',{ascending:false})
        .range(all.length,all.length+499);
      if(error||!Array.isArray(data)||count===null)throw new Error();
      all.push(...data);
      if(all.length>=count)break;
      if(!data.length)throw new Error();
    }
    if(revoked)return;
    rows=all;
    refreshCategories();
    render();
    status(`${rows.length} ${rows.length===1?'document':'documents'} saved.`);
  }catch{
    if(!revoked)status('Could not load your documents. Refresh to try again.',true);
  }finally{
    loading=false;
    if(!revoked){
      lock(false);
      render();
    }
  }
}
function openEditor(row=null){
  if(busy||loading)return;
  editing=row;
  form.reset();
  $('doc-form-status').textContent='';
  $('doc-form-status').dataset.error='false';
  $('doc-file-row').hidden=!!row;
  fields.title.value=row?.title||'';
  fields.category.value=row?.category||'';
  $('doc-dialog-title').textContent=row?'Edit document':'Add document';
  $('doc-save').textContent=row?'Save changes':'Upload document';
  dialog.showModal();
  (row?fields.title:$('doc-file')).focus();
}
function closeDialog(){
  if(!busy)dialog.close();
}
async function openDocument(row){
  const {data,error}=await supabase.storage.from(bucket)
    .createSignedUrl(row.object_path,120);
  if(error||!data?.signedUrl){
    status('Could not open that document. Please try again.',true);
    return;
  }
  window.open(data.signedUrl,'_blank','noopener');
}
async function downloadDocument(row){
  const {data,error}=await supabase.storage.from(bucket).download(row.object_path);
  if(error||!data){
    status('Could not download that document. Please try again.',true);
    return;
  }
  const url=URL.createObjectURL(data);
  const link=document.createElement('a');
  link.href=url;
  link.download=row.original_filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function removeDocument(row){
  lock(true);
  try{
    const file=await supabase.storage.from(bucket).remove([row.object_path]);
    if(file.error)throw new Error();
    const result=await supabase.from('couple_documents').delete()
      .eq('id',row.id).eq('user_id',owner);
    if(result.error)throw new Error();
    rows=rows.filter(item=>item.id!==row.id);
    refreshCategories();
    render();
    status('Document deleted.');
  }catch{
    status('Could not delete that document. Please try again.',true);
  }finally{
    lock(false);
  }
}
async function save(event){
  event.preventDefault();
  if(busy||!form.reportValidity())return;
  const title=fields.title.value.trim();
  const category=fields.category.value.trim();
  if(!title||!category)return;

  lock(true);
  $('doc-form-status').textContent='';
  try{
    if(editing){
      const {error}=await supabase.from('couple_documents').update({title,category})
        .eq('id',editing.id).eq('user_id',owner);
      if(error)throw new Error();
      editing.title=title;
      editing.category=category;
      refreshCategories();
      render();
      dialog.close();
      status('Document details updated.');
      return;
    }

    const file=$('doc-file').files[0];
    if(!file)throw new Error('Choose a file first.');
    if(!allowed[file.type]){
      throw new Error('Choose a PDF, JPG, PNG or WebP file.');
    }
    if(file.size<1||file.size>maxBytes){
      throw new Error('Files must be 10 MB or smaller.');
    }

    const id=crypto.randomUUID();
    const path=`${owner}/${id}.${allowed[file.type]}`;
    const record={
      id,user_id:owner,title,category,
      original_filename:file.name.slice(0,255),
      object_path:path,mime_type:file.type,size_bytes:file.size
    };

    const inserted=await supabase.from('couple_documents').insert(record).select().single();
    if(inserted.error||!inserted.data)throw new Error();

    const uploaded=await supabase.storage.from(bucket).upload(path,file,{
      contentType:file.type,upsert:false
    });
    if(uploaded.error){
      await supabase.from('couple_documents').delete()
        .eq('id',id).eq('user_id',owner);
      throw new Error('Could not upload the file. Please try again.');
    }

    rows.unshift(inserted.data);
    refreshCategories();
    render();
    dialog.close();
    status('Document uploaded. If it does not open straight away, select Refresh documents.');
  }catch(error){
    $('doc-form-status').dataset.error='true';
    $('doc-form-status').textContent=error.message||
      'Could not save that document. Please try again.';
  }finally{
    lock(false);
  }
}

$('doc-add').addEventListener('click',()=>openEditor());
$('doc-empty-add').addEventListener('click',()=>openEditor());
$('doc-close').addEventListener('click',closeDialog);
dialog.addEventListener('cancel',event=>{
  if(busy)event.preventDefault();
});
form.addEventListener('submit',save);
$('doc-refresh').addEventListener('click',()=>void refresh());
$('doc-search').addEventListener('input',render);
$('doc-category-filter').addEventListener('change',render);
$('doc-file').addEventListener('change',()=>{
  const file=$('doc-file').files[0];
  if(file&&!fields.title.value.trim())fields.title.value=escName(file.name);
});
window.addEventListener('wedsparks:section-open',event=>{
  if(event.detail==='documents'&&!loading)void refresh();
});
window.addEventListener('focus',()=>{
  if(owner&&!loading&&!dialog.open&&!document.hidden)void refresh();
});

onSessionChange(({user})=>{
  if(owner&&user?.id!==owner){
    revoked=true;
    rows=[];
    dialog.close();
    content.replaceChildren();
    content.hidden=true;
    location.replace(siteUrl('login/'));
  }
});

(async()=>{
  try{
    const user=await requireUser();
    if(!user||revoked)return;
    owner=user.id;
    const account=await loadAccount(user);
    if(!account.roles.includes('couple')){
      location.replace(siteUrl('supplier-account/'));
      return;
    }
    $('doc-loading').hidden=true;
    content.hidden=false;
    await refresh();
  }catch{
    if(!revoked)$('doc-loading').textContent=
      'Couldn’t load your account. Refresh the page to try again.';
  }
})();
// Documents upload access fixes
(() => {
  const style=document.createElement('style');
  style.textContent=`
    #doc-content .ct-list button:disabled{cursor:wait}
  `;
  document.head.append(style);
})();