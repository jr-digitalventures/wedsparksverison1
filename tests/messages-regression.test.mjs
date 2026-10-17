import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../dist/shared/messages.js',import.meta.url),'utf8');
function between(start,end) {
  const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
  assert(a>=0 && b>a,start);
  return source.slice(a,b);
}
class Element {
  constructor(tag,text='',className='') {
    this.tag=tag;this.textContent=text;this.className=className;
    this.children=[];this.dataset={};this.attrs={};this.events={};
    this.scrollHeight=800;this.scrollTop=600;this.clientHeight=300;
    this.classList={toggle(){}};
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,v){this.events[k]=v;}
  querySelectorAll(){return [];}
  close(){this.open=false;}
}
const elements = new Map();
const $ = id => {
  if (!elements.has(id)) elements.set(id,new Element('div'));
  return elements.get(id);
};
const state = {
  messages:[],owner:'me',revoked:false,selected:{id:'conv',business_name:'Cake'},
  isClosed:row=>row?.enquiry_status==='closed',historySignature:'',node:(tag,text,className)=>new Element(tag,text,className),
  $,penIcon:'<svg/>',Date,Number,JSON,Map,URL,siteUrl:p=>'https://wedsparks.test/'+p,
  supplierDetails:new Map(),supplier:false,document:{createElement:t=>new Element(t)},
  renderCalls:0,stamp:value=>value
};
vm.createContext(state);
vm.runInContext(
  between('function sameMessageGroup(', 'function applyMessageEdit(') +
  between('function renderHistory(', 'async function loadInbox(') +
  between('function formatWeddingDate(', "$('msg-quote-form').addEventListener") +
  between('function safeSupplierUrl(', 'async function loadSupplierDetails('),
  state
);
const t=Date.now()-120000;
const msg=(id,sender,minutes)=>({
  id,conversation_id:'conv',sender_user_id:sender,body:id,
  created_at:new Date(t+minutes*60000).toISOString()
});
const items=()=>$('msg-history').children;
function render(messages){
  state.messages=messages;
  state.historySignature='';
  state.renderHistory();
  return items();
}
function timestamp(item){return item.children.some(n=>n.className==='msg-timestamp');}
function editButton(item){return item.children[0].children.some(n=>n.className==='msg-edit');}
let result=render([msg('a','me',0),msg('b','me',1),msg('c','me',2)]);
assert.deepEqual(result.map(timestamp),[false,false,true]);
assert(result[0].className.includes('msg-group-continues'));
assert(result[1].className.includes('msg-group-continues'));
assert(result[2].className.includes('msg-group-end'));

result=render([msg('a','me',0),msg('b','supplier',1)]);
assert.deepEqual(result.map(timestamp),[true,true]);
result=render([msg('a','me',0),msg('b','me',5)]);
assert.deepEqual(result.map(timestamp),[false,true]);
const after=msg('b','me',5);
after.created_at=new Date(Date.parse(after.created_at)+1).toISOString();
result=render([msg('a','me',0),after]);
assert.deepEqual(result.map(timestamp),[true,true]);
result=render([msg('a','me',0),msg('b','me',1),msg('c','supplier',1)]);
assert.deepEqual(result.map(timestamp),[false,true,true]);

const now=Date.now();
const owned={...msg('own','me',0),created_at:new Date(now-299999).toISOString()};
assert.equal(state.canEditMessage(owned,now),true);
assert.equal(state.canEditMessage({...owned,created_at:new Date(now-300000).toISOString()},now),false);
assert.equal(state.canEditMessage({...owned,sender_user_id:'supplier'},now),false);
assert.equal(state.canEditMessage({...owned,created_at:new Date(now+1).toISOString()},now),false);
result=render([msg('own','me',0),msg('theirs','supplier',0)]);
assert.equal(editButton(result[0]),true);
assert.equal(editButton(result[1]),false);
assert.equal(state.safeSupplierUrl('javascript:alert(1)'),'');
assert.equal(state.safeSupplierUrl('https://example.com/supplier'),'https://example.com/supplier');
assert.equal(state.formatWeddingDate('2026-10-17'),'17 October 2026');
console.log('PASS: sender grouping, final timestamps, five-minute boundary, spacing, edit ownership/expiry, safe profile URLs and wedding dates.');

vm.runInContext(between('function applyMessageEdit(', 'function makeFeatureDialog('),state);
state.messages=[owned];
state.applyMessageEdit({...owned,body:'new',edited_at:new Date(now).toISOString()});
assert.equal(state.messages[0].body,'new');
state.applyMessageEdit({...owned,body:'stale',edited_at:new Date(now-1000).toISOString()});
assert.equal(state.messages[0].body,'new');
state.applyMessageEdit({...owned,body:'foreign',conversation_id:'different',edited_at:new Date(now+1000).toISOString()});
assert.equal(state.messages[0].body,'new');
console.log('PASS: live edits update the open conversation and reject stale/other-conversation updates.');

// Execute the actual edit form handler with controlled RPC results.
owned.created_at=new Date(Date.now()-60000).toISOString();
state.editingMessage=owned;
state.editDialog=new Element('dialog');state.editDialog.open=true;
state.notice=(id,text,error)=>{$(id).textContent=text;$(id).error=error;};
state.loadInbox=()=>Promise.resolve();
let calls=[];
state.supabase={rpc:async(name,args)=>{
  calls.push({name,args});
  return {data:{...owned,body:args.p_body,edited_at:new Date().toISOString()},error:null};
}};
state.messages=[owned];
$('msg-edit-body').value='Updated message';
vm.runInContext(between("$('msg-edit-form').addEventListener('submit'",'\nconst quoteDialog ='),state);
await $('msg-edit-form').events.submit({preventDefault(){}});
assert.equal(calls[0].name,'edit_supplier_message');
assert.equal(calls[0].args.p_expected_body,owned.body);
assert.equal(state.messages[0].body,'Updated message');
assert.equal(state.editDialog.open,false);

state.editDialog.open=true;
state.editingMessage={...owned,created_at:new Date(Date.now()-301000).toISOString()};
$('msg-edit-body').value='Too late';
const previousCalls=calls.length;
await $('msg-edit-form').events.submit({preventDefault(){}});
assert.equal(calls.length,previousCalls);
assert.match($('msg-edit-status').textContent,/window has ended/);
console.log('PASS: edits send the expected original body and expired edits never call the API.');

// Quote request text includes the reviewed wedding details; retries keep the message ID.
state.quoteDialog=new Element('dialog');state.quoteDialog.open=true;
state.quoteConversation={id:'conv',business_name:'Cake'};
state.quoteAttempt=null;
state.crypto={randomUUID:()=> 'request-uuid'};
state.loadMessages=async()=>{};
$('msg-quote-date').value='2026-10-17';
$('msg-quote-location').value='Sydney';
$('msg-quote-guests').value='80';
$('msg-quote-body').value='Our amended request';
state.supabase.rpc=async(name,args)=>{calls.push({name,args});return {data:null,error:{message:'network'}};};
vm.runInContext(between("$('msg-quote-form').addEventListener('submit'",'\nfunction closeFeatureDialogs('),state);
await $('msg-quote-form').events.submit({preventDefault(){}});
assert.match(calls.at(-1).args.p_body,/Wedding date: 17 October 2026/);
assert.match(calls.at(-1).args.p_body,/Wedding location: Sydney/);
assert.match(calls.at(-1).args.p_body,/Guest estimate: 80/);
assert.match(calls.at(-1).args.p_body,/Our amended request/);
assert.equal(state.quoteDialog.open,true);
const requestId=calls.at(-1).args.p_message_id;
state.supabase.rpc=async(name,args)=>{calls.push({name,args});return {data:args.p_message_id,error:null};};
await $('msg-quote-form').events.submit({preventDefault(){}});
assert.equal(calls.at(-1).args.p_message_id,requestId);
assert.equal(state.quoteDialog.open,false);
console.log('PASS: quote details and amended text are sent, failed requests retain the draft, retries use the same message ID.');
