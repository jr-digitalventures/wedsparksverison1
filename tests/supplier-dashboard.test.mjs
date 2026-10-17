import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {supplierSections,supplierPageCopy,supplierIcons,supplierRouteFor,supplierSafeUrl} from '../dist/shared/supplier-dashboard-config.js';
const base='https://example.com/wedsparks/';
assert.deepEqual(supplierSections.map(item=>item.label),[
 'Overview','Inbox & Enquiries','Booking Centre','Availability','Your Storefront','Reviews',
 'Pricing Packages','Couple Leads','Profile Settings'
]);
for(const section of supplierSections){
 assert.equal(supplierRouteFor(base+section.path,base)?.key,section.key);
 assert.equal(supplierRouteFor(base+section.path+'index.html',base)?.key,section.key);
 const html=fs.readFileSync(new URL('../dist/'+section.path+'index.html',import.meta.url),'utf8');
 assert(html.includes('dashboard/dashboard.css'));
 assert(html.includes('supplier-dashboard.css'));
 assert(html.includes('data-supplier-private hidden'));
 assert(!html.includes('account-page.js'));
}
assert.equal(supplierRouteFor('https://other.example/supplier-account/',base),null);
assert.equal(supplierRouteFor(base+'supplier-account/unrecognised/',base),null);
assert.equal(supplierSafeUrl('javascript:alert(1)',base),'');
console.log('PASS: all nine tabs, labels, routes and role-gated page templates.');

const auth=fs.readFileSync(new URL('../dist/shared/auth.js',import.meta.url),'utf8');
const authContext={siteBase:new URL(base),URL};
vm.createContext(authContext);
vm.runInContext(auth.slice(auth.indexOf('export function safeReturnPath'),auth.indexOf('export async function verifiedUser')).replace('export function','function'),authContext);
for(const section of supplierSections){
 const path=new URL(section.path,base).pathname;
 assert.equal(authContext.safeReturnPath(path),path);
 assert.equal(authContext.safeReturnPath(path+'index.html'),path+'index.html');
}
assert.equal(authContext.safeReturnPath('/wedsparks/supplier-account/unknown/'),null);
assert.equal(authContext.safeReturnPath('//other.example'),null);
assert.equal(authContext.safeReturnPath('/wedsparks/dashboard/messages/'),'/wedsparks/dashboard/messages/');
console.log('PASS: supplier login return paths are allowed, unknown/external paths stay blocked and couple messaging paths remain valid.');

const controller=fs.readFileSync(new URL('../dist/shared/supplier-dashboard.js',import.meta.url),'utf8')
 .replace(/^import[\s\S]*?;\n/gm,'')
 .replace("await import('./messages.js');","await fakeMessageImport(page.main);")
 .replace('void start();','globalThis.boot=start();');
const htmlByKey=new Map(supplierSections.map(section=>[section.key,fs.readFileSync(new URL('../dist/'+section.path+'index.html',import.meta.url),'utf8')]));
async function app(initialKey='overview',role='supplier',mobile=false){
 const winEvents=new Map(),docEvents=new Map();
 let sessionChange,messageMounts=0,redirect='',rpcCalls=0;
 class El{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.style={};this.events={};this.target='';this.className='';this.textContent='';this.classList={add:name=>{this.className+=' '+name;}};}
  append(...els){for(const el of els){if(el.parentElement)el.remove();el.parentElement=this;this.children.push(el);}}
  before(el){const parent=this.parentElement;if(parent){el.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,el);}}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children=parent.children.filter(el=>el!==this);this.parentElement=null;}}
  replaceChildren(...els){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...els);}
  setAttribute(k,v){this.attrs[k]=v;if(k==='id')this.id=v;}
  removeAttribute(k){delete this.attrs[k];}
  hasAttribute(k){return k in this.attrs;}
  addEventListener(k,handler){this.events[k]=handler;}
  matches(sel){
   if(sel[0]==='#')return this.id===sel.slice(1);
   if(sel[0]==='.')return this.className.split(/\s+/).includes(sel.slice(1));
   const attr=sel.match(/^(\w+)?\[([^\]=]+)(?:="([^"]+)")?\]$/);
   if(attr){const key=attr[2].replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return (!attr[1]||this.tagName===attr[1])&&(attr[2].startsWith('data-')?key in this.dataset:attr[2]==='href'?!!this.href:this.hasAttribute(attr[2]));}
   return this.tagName===sel;
  }
  querySelectorAll(sel){const descendants=this.children.flatMap(el=>[el,...el.querySelectorAll('*')]);return sel==='*'?descendants:descendants.filter(el=>el.matches(sel));}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
  closest(sel){return this.matches(sel)?this:this.parentElement?.closest(sel)||null;}
 }
 const documentBody=new El('body');
 documentBody.dataset.account='supplier';
 function makeMain(key){
  const main=new El('main');main.dataset.supplierPage=key;
  const h=new El('h1');h.textContent=key;
  const loading=new El('p');loading.dataset.supplierLoading='';
  const gate=new El('div');gate.dataset.supplierPrivate='';gate.hidden=true;
  const content=new El('div');content.dataset.supplierContent='';gate.append(content);
  if(key==='messages'){
   const load=new El('p');load.id='messages-loading';
   const root=new El('section');root.id='messages-root';root.dataset.messageRole='supplier';gate.append(load,root);
  }
  main.append(h,loading,gate);return main;
 }
 const first=makeMain(initialKey);documentBody.append(first);
 const location={href:base+supplierSections.find(s=>s.key===initialKey).path,pathname:new URL(base+supplierSections.find(s=>s.key===initialKey).path).pathname,search:'',replace:value=>{redirect=value;},reload(){}};
 const doc={body:documentBody,head:new El('head'),hidden:false,
  querySelector:selector=>documentBody.querySelector(selector),createElement:tag=>new El(tag),
  importNode:el=>el,addEventListener:(event,handler)=>docEvents.set(event,handler),title:''};
 const context={
  supplierSections,supplierPageCopy,supplierIcons,supplierRouteFor,supplierSafeUrl,
  mountAccountSecurity(){},
  mountSupplierTool:async()=>{},mountSupplierLeads(){},
  document:doc,window:{addEventListener:(event,handler)=>winEvents.set(event,handler),dispatchEvent:event=>winEvents.get(event.type)?.(event)},
  matchMedia:()=>({matches:mobile,addEventListener(){}}),
  location,history:{pushState(state,title,url){location.href=url;location.pathname=new URL(url).pathname;}},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  DOMParser:class{parseFromString(html){return{querySelector:()=>makeMain(html.match(/data-supplier-page="([^"]+)"/)[1])};}},
  fetch:async url=>({ok:true,text:async()=>htmlByKey.get(supplierRouteFor(url,base).key)}),
  requireUser:async()=>({id:'supplier-user',email:'supplier@example.test'}),
  loadAccount:async user=>({user,roles:[role],profile:{first_name:'Remi',last_name:'Test'}}),
  onSessionChange:callback=>{sessionChange=callback;},siteUrl:path=>new URL(path,base).href,
  supabase:{
   rpc:async()=>{rpcCalls++;return{data:{rows:[],total:2,unread_total:3},error:null};},
   channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:async()=>{},
   from(table){return{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:table==='supplier_vendor_accounts'?{vendor_id:'vendor'}:{'Name of Wedding Vendor':'Sugar Lane Cakes','Wedding Vendor Type':'Cake','Location':'Sydney','Image #1':'https://example.com/cake.jpg','About Paragraph':'Wedding cakes','Destination URL':'https://example.com/cake'},error:null})};}
  },
  fakeMessageImport:async()=>{messageMounts++;},
  setInterval(){},setTimeout(){return 1;},clearTimeout(){},URL,Number,JSON,console
 };
 vm.createContext(context);vm.runInContext(controller,context);await context.boot;
 const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
 const navigate=async key=>{
  const section=supplierSections.find(item=>item.key===key);
  const anchor=doc.querySelectorAll?null:documentBody.querySelectorAll('a').find(link=>link.dataset.supplierSection===key);
  assert(anchor,section.label);
  docEvents.get('click')({target:anchor,button:0,preventDefault(){},defaultPrevented:false});
  await settle();
 };
 return{doc,first,navigate,settle,session:()=>sessionChange,redirect:()=>redirect,messageMounts:()=>messageMounts,rpcCalls:()=>rpcCalls,El};
}
const supplier=await app();
assert.equal(supplier.first.querySelector('[data-supplier-private]').hidden,false);
assert.equal(supplier.first.querySelector('#sd-open-count').textContent,'2');
assert.equal(supplier.first.querySelector('#sd-unread-count').textContent,'3');
assert.equal(supplier.doc.querySelectorAll,undefined);
await supplier.navigate('messages');
assert.equal(supplier.messageMounts(),1);
await supplier.navigate('bookings');
await supplier.navigate('messages');
assert.equal(supplier.messageMounts(),1);
assert.equal(supplier.doc.body.dataset.page,'messages');
await supplier.navigate('storefront');
await supplier.navigate('storefront');
await supplier.navigate('profile');
await supplier.navigate('overview');
assert.equal(supplier.first.hidden,false);
supplier.session()({user:null});
assert.equal(supplier.first.hidden,true);
assert.equal(supplier.redirect(),base+'login/');
console.log('PASS: authenticated overview loads real counts, tab navigation preserves the inbox instance and logout removes private content.');

const couple=await app('overview','couple');
assert.equal(couple.redirect(),base+'dashboard/');
assert.equal(couple.first.querySelector('[data-supplier-private]').hidden,true);
assert.equal(couple.rpcCalls(),0);
const mobile=await app('bookings','supplier',true);
const navigation=mobile.doc.body.querySelector('.ws-dashboard-navigation');
assert.equal(navigation.open,false);
console.log('PASS: couple-only accounts are redirected before supplier content loads and mobile navigation starts collapsed.');
