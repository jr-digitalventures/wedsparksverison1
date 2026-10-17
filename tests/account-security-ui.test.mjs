import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../dist/shared/account-security.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.events={};this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.type='';this.autocomplete='';this.name='';this.required=false;this.textContent='';this.classList={toggle(){}};}
 set innerHTML(html){
  this.children=[];const stack=[this];
  for(const match of html.matchAll(/<\/?([a-z0-9]+)\b([^>]*)>/gi)){
   const tag=match[1];if(match[0].startsWith('</')){if(stack.length>1)stack.pop();continue;}
   const el=new Element(tag);
   for(const attr of match[2].matchAll(/([a-zA-Z][\w-]*)(?:="([^"]*)")?/g)){
    const key=attr[1],value=attr[2]??'';
    el.attributes[key]=value;
    if(['name','type','autocomplete'].includes(key))el[key]=value;
    if(key==='hidden')el.hidden=true;if(key==='required')el.required=true;
   }
   stack.at(-1).append(el);
   if(!['input','img','br','hr'].includes(tag))stack.push(el);
  }
 }
 append(...els){for(const el of els){el.parentElement=this;this.children.push(el);}}
 replaceChildren(...els){this.children=[];this.append(...els);}
 querySelectorAll(selector){
  const all=this.children.flatMap(el=>[el,...el.querySelectorAll('*')]);
  if(selector==='*')return all;
  if(selector.includes(','))return all.filter(el=>selector.split(',').includes(el.tagName));
  const attr=selector.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
  return all.filter(el=>attr?attr[1] in el.attributes&&(attr[2]===undefined||el.attributes[attr[1]]===attr[2]):el.tagName===selector);
 }
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(name,handler){this.events[name]=handler;}
 closest(selector){if(this.tagName===selector)return this;return this.parentElement?.closest(selector)||null;}
 get isConnected(){return !!this.closest('main');}
 reportValidity(){return true;}
 reset(){for(const el of this.querySelectorAll('input')){el.value='';el.checked=false;}}
}
let sessionCallback,serviceCalls=[],resolveEmail,serviceError=null;
const service={
 currentUser:async()=>({id:'owner',email:'old@example.test'}),
 changeEmail:async(...args)=>{serviceCalls.push(['email',...args]);return new Promise(resolve=>{resolveEmail=resolve;});},
 changePassword:async(...args)=>{serviceCalls.push(['password',...args]);if(serviceError)throw serviceError;return{id:'owner'};},
 sendVerificationCode:async()=>{serviceCalls.push(['code']);}
};
const docEvents=new Map(),windowEvents=new Map();
const main=new Element('main'),container=new Element();main.append(container);
const ctx={
 document:{head:new Element('head'),body:{dataset:{account:'supplier'}},hidden:false,createElement:tag=>new Element(tag),addEventListener:(event,handler)=>docEvents.set(event,handler)},
 window:{addEventListener:(event,handler)=>windowEvents.set(event,handler)},
 crypto:{randomUUID:()=> 'form-id'},
 supabase:{},createAccountVerifier(){},createAccountSecurity:()=>service,
 siteUrl:path=>'https://example.test/'+path,
 onSessionChange:callback=>{sessionCallback=callback;return()=>{};},
 WeakMap,URL,console
};
vm.createContext(ctx);vm.runInContext(source,ctx);
const account={user:{id:'owner',email:'old@example.test'},profile:{first_name:'Test',last_name:'User'}};
const mounted=ctx.mountAccountSecurity(container,account);
assert.equal(ctx.mountAccountSecurity(container,account),mounted);
assert.equal(container.children.length,1);
const $=selector=>container.querySelector(selector);
const named=name=>$('[name="'+name+'"]');
named('email').value='new@example.test';named('emailPassword').value='private-password';
const emailForm=$('[data-security-form="email"]');
const request=emailForm.events.submit({preventDefault(){}});
assert.equal(named('email').disabled,true);
assert.equal(named('password').disabled,true);
resolveEmail({user:{id:'owner',email:'old@example.test',new_email:'new@example.test'},pending:true});
await request;
assert.equal($('[data-security-email]').textContent,'old@example.test');
assert.match($('[data-security-pending]').textContent,/awaiting email confirmation/);
assert.equal(named('emailPassword').value,'');
assert.equal(named('password').disabled,false);
assert.match($('[data-security-status="email"]').textContent,/until confirmation is complete/);
console.log('PASS: email controls lock while saving, keep the old sign-in email visible and show pending confirmation.');

const passwordForm=$('[data-security-form="password"]');
named('currentPassword').value='old-password';
named('password').value='new-password-123';
named('confirmPassword').value='new-password-123';
serviceError=Object.assign(new Error('Enter a verification code'),{code:'verification_required'});
await passwordForm.events.submit({preventDefault(){}});
assert.equal($('[data-security-code]').hidden,false);
assert.equal(named('nonce').required,true);
await $('[data-security-send-code]').events.click();
assert.equal(serviceCalls.at(-1)[0],'code');
named('nonce').value='123456';serviceError=null;
await passwordForm.events.submit({preventDefault(){}});
assert.equal(named('currentPassword').value,'');
assert.equal(named('password').value,'');
assert.equal(named('confirmPassword').value,'');
assert.equal(named('nonce').required,false);
assert.equal($('[data-security-code]').hidden,true);
assert.match($('[data-security-status="password"]').textContent,/password has been updated/);
console.log('PASS: required verification codes can be requested, entered and submitted; success clears password fields.');

named('currentPassword').value='secret';
ctx.document.hidden=true;
docEvents.get('visibilitychange')();
assert.equal(named('currentPassword').value,'');
sessionCallback({event:'SIGNED_IN',user:{id:'different'}});
assert.equal(container.children[0].children.length,0);
console.log('PASS: hiding the page clears passwords and switching account clears all account controls.');
