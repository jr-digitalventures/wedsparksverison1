import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/shared/messages.js',import.meta.url),'utf8');
const between=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+a.length);assert(start>=0&&end>start);return source.slice(start,end);};
const elements=new Map();
const el=()=>({dataset:{},hidden:false,disabled:false,innerHTML:'',attrs:{},
  setAttribute(k,v){this.attrs[k]=v;}});
const $=id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id);};
const state={
 $,supplier:false,selected:{id:'chat',enquiry_status:'new'},ready:true,
 sending:new Set(),reopeningChats:new Set(),closeChatButton:el(),quoteButton:el(),
 closedNote:el(),archiveChatIcon:'archive-icon',reopenChatIcon:'reopen-icon',
 revoked:false,statusFilter:{value:'closed'},inboxPage:2,inboxVersion:1,inboxBusy:true,
 threadVersion:2,threadBusy:true,
 notice:(id,text,error)=>{$(id).textContent=text;$(id).error=error;},
 renderThreadHeading(){},syncComposer(){},
 loadInbox:async()=>{},loadMessages:async()=>{},
 window:{dispatchEvent(){}},CustomEvent:class{},console
};
vm.createContext(state);
vm.runInContext(
 between('function isClosed(', 'function updateCategoryOptions(')+
 between('async function reopenConversation()', '\nvoid start();'),state);
state.syncClosedChatActions();
assert.equal(state.closeChatButton.hidden,false);
assert.equal(state.closeChatButton.innerHTML,'archive-icon');
assert.equal(state.closeChatButton.attrs['aria-label'],'Close chat');
state.selected.enquiry_status='closed';
state.syncClosedChatActions();
assert.equal(state.closeChatButton.hidden,false);
assert.match(state.closeChatButton.innerHTML,/reopen-icon.*Reopen chat/);
assert.equal(state.closeChatButton.attrs['aria-label'],'Reopen chat');
assert.equal(state.quoteButton.hidden,true);
state.supplier=true;state.syncClosedChatActions();
assert.equal(state.closeChatButton.hidden,true);
state.supplier=false;
console.log('PASS: open chats show the archive icon, closed chats show Reopen chat, and supplier accounts do not control reopening.');

let calls=[],resolve;
state.supabase={rpc:(name,args)=>{calls.push({name,args});return new Promise(done=>{resolve=done;});}};
const task=state.reopenConversation();
assert.equal(state.closeChatButton.disabled,true);
await state.reopenConversation();
assert.equal(calls.length,1);
resolve({data:'booked',error:null});
await task;
assert.equal(calls[0].name,'reopen_supplier_conversation');
assert.equal(calls[0].args.p_conversation_id,'chat');
assert.equal(state.selected.enquiry_status,'booked');
assert.equal(state.statusFilter.value,'open');
assert.equal(state.inboxPage,0);
assert.equal(state.inboxBusy,false);
assert.equal(state.threadBusy,false);
assert.equal(state.reopeningChats.size,0);
assert.equal(state.closeChatButton.attrs['aria-label'],'Close chat');
console.log('PASS: reopening restores the server-returned status, switches to Open, invalidates stale fetches and prevents duplicate requests.');

state.selected.enquiry_status='closed';
state.supabase.rpc=async()=>({data:null,error:{message:'Unavailable'}});
await state.reopenConversation();
assert.equal(state.selected.enquiry_status,'closed');
assert.match($('msg-thread-status').textContent,/Could not reopen/);
assert.equal(state.reopeningChats.size,0);
assert.equal(state.closeChatButton.disabled,false);
console.log('PASS: a failed reopen keeps the chat closed and leaves the action available for retry.');

assert(!source.includes('Close chat permanently'));
assert(!source.includes('this cannot be undone'));
assert(source.includes('background:transparent'));
console.log('PASS: permanent-close copy is removed.');
