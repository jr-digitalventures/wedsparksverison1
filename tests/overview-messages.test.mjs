import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/shared/overview-messages.js',import.meta.url),'utf8')
  .replace(/^import .*\n/gm,'').replace('export async function','async function');
class El{
 constructor(){this.children=[];this.hidden=false;this.textContent='';this.attrs={};this.events={};}
 append(...els){this.children.push(...els);}
 replaceChildren(...els){this.children=els;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,v){this.events[k]=v;}
 closest(){return main;}
 remove(){}
}
const main=new El();
const ids=new Map(['list','count','status','link'].map(id=>['overview-message-'+id,new El()]));
ids.set('private-content',new El());
let sessionCallback,calls=0;
const row={id:'11111111-1111-4111-8111-111111111111',business_name:'Sugar Lane Cakes',
 last_message:'A reply',last_message_at:new Date().toISOString(),unread_count:2,
 business_image:'https://example.com/cake.jpg'};
const response=(count,rows=[row])=>({data:{rows,unread_total:count},error:null});
const context={
 document:{head:new El(),getElementById:id=>ids.get(id),createElement:()=>new El(),hidden:false,addEventListener(){}},
 window:{addEventListener(){}},siteUrl:path=>'https://example.com/'+path,
 onSessionChange:callback=>{sessionCallback=callback;},
 supabase:{rpc:async(name,args)=>{calls++;assert.equal(name,'get_message_inbox');assert.equal(args.p_status,'open');return response(2);},
   channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:async()=>{}},
 setInterval(){},setTimeout(){return 1;},clearTimeout(){},URL,Date,Number,JSON,console
};
vm.createContext(context);
vm.runInContext(source,context);
const $=id=>ids.get('overview-message-'+id);
await context.refreshOverviewMessages('me');
assert.equal($('count').textContent,'2');
assert.equal($('list').children.length,1);
const link=$('list').children[0].children[0];
assert.equal(link.target,'_self');
assert.equal(new URL(link.href).searchParams.get('conversation'),row.id);
assert.equal(link.children[1].children[0].textContent,'Sugar Lane Cakes');
assert.equal($('count').href,'https://example.com/dashboard/messages/');

let resolve;
context.supabase.rpc=()=>new Promise(done=>{resolve=done;});
const pending=context.refreshOverviewMessages('me');
assert.equal($('count').textContent,'2');
assert.equal($('list').children[0].children[0],link);
resolve(response(0,[{...row,unread_count:0}]));
await pending;
assert.equal($('count').textContent,'0');
console.log('PASS: overview counts/recent chats link to the right conversation, retain visible values during refresh and update when messages are read.');

const pendingLogout=context.refreshOverviewMessages('me');
sessionCallback({user:null});
resolve(response(9));
await pendingLogout;
assert.equal($('count').textContent,'—');
assert.equal($('list').children.length,0);
assert.equal(ids.get('private-content').hidden,true);
console.log('PASS: logout clears overview messages and ignores an in-flight response.');
