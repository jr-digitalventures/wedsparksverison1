import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/shared/messages.js',import.meta.url),'utf8');
const between=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+a.length);assert(start>=0&&end>start);return source.slice(start,end);};
class El{
 constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.dataset={};this.children=[];this.events={};this.scrollHeight=1000;this.scrollTop=700;this.clientHeight=300;this.classList={toggle(){}};}
 append(...els){this.children.push(...els);}
 replaceChildren(...els){this.children=els;}
 addEventListener(k,handler){this.events[k]=handler;}
 setAttribute(){} close(){this.open=false;}
}
const els=new Map();
const $=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
const state={
 $,owner:'couple',revoked:false,selected:null,ready:true,supplier:false,
 inboxBusy:false,inboxPage:0,inboxVersion:0,rows:[],inboxSignature:'',openingRequestedThread:false,
 statusFilter:{value:'open'},categoryFilter:new El(),categorySignature:'',
 inboxMeta:{all_total:0},conversationProgress:{hidden:true},sending:new Set(),
 drafts:new Map(),attempts:new Map(),notices:new Map(),editor:new El(),
 readWatermarks:new Map(),readsInFlight:new Set(),readTimer:null,threadBusy:false,messages:[],
 node:(tag,value)=>{const e=new El();e.textContent=value;return e;},
 notice:(id,text,error)=>{$(id).textContent=text;$(id).error=error;},
 visible:()=>true,loadSupplierDetails:async()=>{},
 renderInbox(){},renderThreadHeading(){},syncConversationEmptyState(){},
 syncClosedChatActions(){},selectConversation(row){state.selected=row;},
 window:{dispatchEvent(){},addEventListener(){}},document:{addEventListener(){}},CustomEvent:class{},clearTimeout(){},setTimeout(){return 1;},
 console,Date,Map,JSON,Number
};
vm.createContext(state);
vm.runInContext(
 between('function isClosed(', 'function syncClosedChatActions(')+
 between('function updateCategoryOptions(', 'function clearSelectedConversation(')+
 between('async function loadInbox()', 'function renderThreadHeading(')+
 between('function syncComposer()', 'function renderInbox(')+
 between('async function sendMessage(', 'async function loadContacts(')+
 between('function scheduleRead()', 'async function openRequestedConversation('),state);
let calls=[];
const inbox=(rows)=>({data:{rows,categories:['Cake','Venue'],all_total:4,total:rows.length,unread_total:2},error:null});
state.supabase={rpc:async(name,args)=>{calls.push({name,args});return inbox([{id:'cake',enquiry_status:'closed'}]);}};
state.statusFilter.value='closed';state.categoryFilter.value='Cake';state.inboxPage=1;
await state.loadInbox();
assert.equal(calls[0].args.p_status,'closed');
assert.equal(calls[0].args.p_category,'Cake');
assert.equal(calls[0].args.p_offset,50);
assert.equal(state.rows[0].id,'cake');
assert.equal(state.categoryFilter.children.length,3);

// A slow previous request must not replace a new filter's results.
let resolveOld;
state.inboxPage=0;state.selected=null;
state.supabase.rpc=()=>new Promise(resolve=>{resolveOld=resolve;});
const oldRequest=state.loadInbox();
state.inboxVersion++;state.inboxBusy=false;state.statusFilter.value='open';
state.supabase.rpc=async()=>inbox([{id:'new',enquiry_status:'new'}]);
await state.loadInbox();
resolveOld(inbox([{id:'old',enquiry_status:'closed'}]));
await oldRequest;
assert.equal(state.rows[0].id,'new');
console.log('PASS: status/category filters reach the server before pagination; stale filter responses are ignored.');

state.selected={id:'closed',enquiry_status:'closed'};
state.editor.value='Cannot send this';
state.syncComposer();
assert.equal($('msg-form').hidden,true);
assert.equal(state.editor.disabled,true);
calls=[];
state.supabase.rpc=async(name,args)=>{calls.push({name,args});return {data:true};};
await state.sendMessage({preventDefault(){}});
assert.equal(calls.length,0);
console.log('PASS: closed chat history can remain visible while composing/sending is disabled.');

state.selected={id:'open',enquiry_status:'new'};
state.messages=[{id:'seen',created_at:new Date().toISOString()}];
state.loadInbox=async()=>{};
state.visible=()=>false;
await state.markReadIfVisible();assert.equal(calls.length,0);
state.visible=()=>true;$('msg-scroll').scrollTop=0;
await state.markReadIfVisible();assert.equal(calls.length,0);
$('msg-scroll').scrollTop=700;
await state.markReadIfVisible();
assert.equal(calls.length,1);
assert.equal(calls[0].args.p_through_message_id,'seen');
await state.markReadIfVisible();assert.equal(calls.length,1);

let resolveRead;
state.messages=[{id:'next'}];
state.supabase.rpc=(name,args)=>{calls.push({name,args});return new Promise(resolve=>{resolveRead=resolve;});};
const reading=state.markReadIfVisible();
state.messages.push({id:'arrived-later'});
resolveRead({data:true,error:null});
await reading;
assert.equal(state.readWatermarks.get('open'),'next');
assert.notEqual(state.readWatermarks.get('open'),'arrived-later');
console.log('PASS: hidden/scrolled-up chats remain unread, repeated reads are deduplicated and messages arriving later are not marked read.');

state.closingId='open';
state.closeDialog=new El();state.closeDialog.open=true;
state.selected={id:'open',enquiry_status:'new'};
state.drafts.set('open','draft');
state.attempts.set('open',{id:'attempt'});
state.notices.set('open',{text:'notice'});
state.clearSelectedConversation=()=>{state.selected=null;};
state.supabase.rpc=async(name,args)=>{calls.push({name,args});return {data:true,error:null};};
vm.runInContext(between("$('msg-confirm-close').addEventListener('click'",'\nfunction scheduleRead()'),state);
await $('msg-confirm-close').events.click();
assert.equal(calls.at(-1).name,'close_supplier_conversation');
assert.equal(calls.at(-1).args.p_conversation_id,'open');
assert.equal(state.selected,null);
assert.equal(state.drafts.has('open'),false);
assert.equal(state.closeDialog.open,false);
console.log('PASS: closing calls the checked API, clears the draft and returns to the filtered inbox.');
