import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {vendorProfileUrl} from '../dist/shared/profile-url.js';
const base='https://jr-digitalventures.github.io/wedsparksverison1/';
assert.equal(vendorProfileUrl(base+'supplier/barnumber?x=1#gallery',base),base+'vendor-profile/barnumber?x=1#gallery');
assert.equal(vendorProfileUrl(base+'supplier/?id=123',base),base+'vendor-profile/?id=123');
assert.equal(vendorProfileUrl('https://other.test/supplier/a',base),'https://other.test/supplier/a');
assert.equal(vendorProfileUrl('javascript:alert(1)',base),'');
const source=fs.readFileSync('dist/shared/profile-route-fallback.js','utf8');
for(const prefix of ['', '/wedsparksverison1']) {
 for(const suffix of ['','/','/barnumber','/barnumber/','/index.html']) {
  let destination;
  const href='https://example.test'+prefix+'/supplier'+suffix+'?id=123#photos';
  const ctx={URL,location:{href,replace:v=>destination=v}};
  await vm.runInNewContext('(async()=>{'+source+'})()',ctx);
  assert.equal(destination,'https://example.test'+prefix+'/vendor-profile/'+suffix.replace(/^\//,'')+'?id=123#photos');
 }
 let written='',replaced=false;
 await vm.runInNewContext('(async()=>{'+source+'})()',{URL,location:{href:'https://example.test'+prefix+'/vendor-profile/barnumber',replace:()=>replaced=true},fetch:async url=>{assert.equal(url,prefix+'/vendor-profile/index.html');return {ok:true,text:async()=>'<html><head></head><body></body></html>'}},document:{open(){},write:html=>written=html,close(){}}});
 assert(written.includes('<base href="https://example.test'+prefix+'/vendor-profile/">'));assert.equal(replaced,false);
}
let destination;
await vm.runInNewContext('(async()=>{'+source+'})()',{URL,location:{href:base+'supplier/?preview=1',replace:v=>destination=v}});
assert.equal(destination,base+'vendor-profile/?draft=1');
const auth=fs.readFileSync('dist/shared/auth.js','utf8');
const safe=auth.slice(auth.indexOf('export function safeReturnPath'),auth.indexOf('export async function verifiedUser')).replace('export ','');
const ctx={URL,siteBase:new URL(base)};vm.createContext(ctx);vm.runInContext(safe,ctx);
assert.equal(ctx.safeReturnPath('/wedsparksverison1/supplier/barnumber?x=1'),'/wedsparksverison1/vendor-profile/barnumber?x=1');
assert.equal(ctx.safeReturnPath('//evil.test/vendor-profile/'),null);
assert.equal(ctx.safeReturnPath('/wedsparksverison1/supplier-account/'),'/wedsparksverison1/supplier-account/');
const routes=JSON.parse(fs.readFileSync('dist/shared/published-supplier-routes.json'));
for(const slug of Object.values(routes)){const html=fs.readFileSync('dist/vendor-profile/'+slug+'/index.html','utf8');assert(html.includes('<base href="../">'));assert(html.includes('src="route.js?v=1"'));}
console.log('PASS: root/subpath redirects, slugs, queries, hashes, drafts, deep-link rendering, auth return paths and generated profiles.');
