import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {supplierSections,supplierRouteFor} from '../dist/shared/supplier-dashboard-config.js';
for(const key of ['account-settings','profile-health','settings']){
 assert.equal(supplierRouteFor('https://example.test/app/supplier-account/'+key+'/','https://example.test/app/').key,'profile');
}
assert(!supplierSections.some(section=>['settings','account-settings','profile-health'].includes(section.key)));
assert(supplierSections.some(section=>section.key==='leads'));
const controller=fs.readFileSync(new URL('../dist/shared/supplier-dashboard.js',import.meta.url),'utf8');
const workspaceUI=fs.readFileSync(new URL('../dist/shared/supplier-workspace-ui.js',import.meta.url),'utf8');
assert(workspaceUI.includes('Your storefront essentials'));
assert(controller.includes('mountSupplierTool(content,route.key,owner)'));
assert(controller.includes("if(route.key==='profile')"));
assert(controller.includes("mountAccountSecurity(content,account)"));
console.log('PASS: old settings URLs open Profile Settings, completion lives in Storefront and Couple Leads is a separate preview.');

const client=fs.readFileSync(new URL('../dist/shared/supabase-client.js',import.meta.url),'utf8')
 .replace(/^import .*;\n/gm,'').replaceAll('export function','function').replaceAll('export const','const');
let index=0;const instances=[];
const ctx={crypto:{randomUUID:()=>String(++index)},createClient:(url,key,options)=>{
 const instance={options};instances.push(instance);return instance;
}};
vm.createContext(ctx);vm.runInContext(client,ctx);
ctx.createAccountVerifier();ctx.createAccountVerifier();
assert.equal(instances[0].options.auth.persistSession,true);
for(const instance of instances.slice(1)){
 assert.equal(instance.options.auth.persistSession,false);
 assert.equal(instance.options.auth.autoRefreshToken,false);
 assert.equal(instance.options.auth.detectSessionInUrl,false);
}
assert.notEqual(instances[1].options.auth.storageKey,instances[2].options.auth.storageKey);
console.log('PASS: password verification clients use unique, nonpersistent sessions and leave normal login persistence enabled.');

for(const file of ['../dist/signup/index.html','../dist/reset-password/index.html']){
 const html=fs.readFileSync(new URL('./'+file,import.meta.url),'utf8');
 assert(html.includes('minlength="10"'));
 assert(!html.includes('minlength="8"'));
}
for(const file of ['../dist/signup/signup-submit.js','../dist/shared/reset-password.js']){
 const code=fs.readFileSync(new URL('./'+file,import.meta.url),'utf8');
 assert(code.includes('length < 10'));
 assert(!code.includes('length < 8'));
}
console.log('PASS: signup, recovery and profile changes share the ten-character new-password minimum.');
