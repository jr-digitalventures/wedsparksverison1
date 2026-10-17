
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/shared/messages.js',import.meta.url),'utf8');
async function boot(supplier=false) {
  const ids=new Map(), selectors=new Map();
  class El {
    constructor(tag='div') {
      this.tagName=tag;this.children=[];this.dataset={};this.events={};
      this.hidden=false;this.disabled=false;this.value='';this.open=false;
      this.parentElement={hidden:false};this.classList={toggle(){}};
      this.scrollHeight=500;this.clientHeight=300;this.scrollTop=0;
    }
    set innerHTML(value) {
      this.html=value;
      for (const match of value.matchAll(/id="([^"]+)"/g)) {
        if(!ids.has(match[1]))ids.set(match[1],new El());
        if(match[1]==='msg-status-filter')ids.get(match[1]).value='open';
      }
    }
    get innerHTML(){return this.html||'';}
    append(...items){this.children.push(...items);}
    prepend(...items){this.children.unshift(...items);}
    before(){} after(){} remove(){} focus(){} reset(){}
    replaceChildren(...items){this.children=items;}
    setAttribute(k,v){this[k]=v;}
    removeAttribute(k){delete this[k];}
    addEventListener(k,v){this.events[k]=v;}
    querySelector(sel){
      if(sel[0]==='#')return ids.get(sel.slice(1));
      if(!selectors.has(sel))selectors.set(sel,new El());
      return selectors.get(sel);
    }
    querySelectorAll(){return [];}
    closest(){return {hidden:false};}
    insertAdjacentHTML(position,html){this.innerHTML=html;}
    showModal(){this.open=true;}
    close(){this.open=false;this.events.close?.();}
  }
  const root=new El();root.dataset.messageRole=supplier?'supplier':'couple';
  ids.set('messages-root',root);ids.set('messages-loading',new El());
  const row={id:'conversation',vendor_id:'vendor',business_name:'Sugar Lane Cakes',
    business_category:'Cake',couple_name:'Remi',enquiry_status:'new',
    created_at:new Date().toISOString(),last_message:'Hello'};
  const message={id:'message',conversation_id:row.id,sender_user_id:'couple',
    body:'Hello',created_at:new Date(Date.now()-30000).toISOString()};
  const rpc=async name=>({data:name==='get_message_inbox'?{rows:[row],categories:['Cake'],all_total:1,total:1,unread_total:0}:name==='mark_supplier_conversation_read'?true:[],error:null});
  const client={
    rpc,
    from(table){
      const builder={
        select(){return this;},eq(){return this;},order(){return this;},range(){return this;},or(){return this;},
        maybeSingle:async()=>({data:table==='Vendor Public Profiles'
          ? {'Image #1':'https://example.com/cake.jpg','Destination URL':'https://example.com/cake'}
          : {id:row.id},error:null}),
        then(resolve,reject){return Promise.resolve({data:[message],error:null}).then(resolve,reject);}
      };return builder;
    },
    channel(){return {on(){return this;},subscribe(){return this;}};},
    removeChannel:async()=>{}
  };
  const ctx={
    document:{
      querySelector:sel=>ids.get(sel.slice(1)),
      createElement:tag=>new El(tag),createTextNode:t=>({textContent:t}),
      head:new El(),visibilityState:'visible',addEventListener(){}
    },
    window:{addEventListener(){},dispatchEvent(){}},location:{pathname:'/dashboard/messages/',search:'',href:'https://example.com/dashboard/messages/',replace(){}},
    history:{replaceState(){}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},supabase:client,
    requireUser:async()=>({id:supplier?'supplier':'couple'}),
    loadAccount:async()=>({roles:[supplier?'supplier':'couple']}),
    siteUrl:p=>'https://example.com/'+p,onSessionChange(){},
    setInterval(){},setTimeout(){return 1;},clearTimeout(){},
    URL,Date,console,crypto:{randomUUID:()=> 'uuid'}
  };
  vm.createContext(ctx);
  const code=source.replace(/^import .*\n/gm,'').replace('void start();','globalThis.boot = start();');
  vm.runInContext(code,ctx);
  await ctx.boot;
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(root.hidden,false);
  assert.equal(ids.get('msg-thread-title').textContent,supplier?'Remi':'Sugar Lane Cakes');
  assert(ids.get('msg-history').children.length===1);
  if(!supplier){
    const heading=selectors.get('.msg-workspace');assert(heading);
    const profile=Array.from(ids.values());assert(profile.length>20);
  }
  return ids.size;
}
await boot(false);
await boot(true);
console.log('PASS: full module boots for both couple and supplier roles, loads the inbox and renders the message history.');
