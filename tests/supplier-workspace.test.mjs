import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {cleanWorkspace,monthCells,dateRange,missingEssentials,groupBookings,safeWebUrl} from '../dist/shared/supplier-workspace-model.js';

assert.deepEqual(dateRange('2028-02-28','2028-03-01'),['2028-02-28','2028-02-29','2028-03-01']);
assert.throws(()=>dateRange('2026-04-31','2026-05-01'));
assert.throws(()=>dateRange('2026-11-01','2026-10-01'));
assert.throws(()=>dateRange('2026-01-01','2027-03-01'));
const cells=monthCells(2026,9);assert.equal(cells.length,42);assert.equal(cells[3].key,'2026-10-01');assert.equal(cells[3].current,true);
assert.equal(missingEssentials(cleanWorkspace().storefront).length,6);
assert.equal(safeWebUrl('javascript:alert(1)'),'');assert.equal(safeWebUrl('https://name:password@example.test/'),'');
assert.deepEqual(groupBookings([{couple:'A',date:'2026-10-30',status:'Confirmed'},{couple:'B',date:'2026-10-20',status:'Tentative'}],'','all').map(b=>b.couple),['B','A']);
assert.equal(groupBookings([{couple:'Alex',status:'Confirmed'}],'alex','Tentative').length,0);

const source=fs.readFileSync(new URL('../dist/shared/supplier-workspace-service.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
function fixture({missing=false,denied=false}={}){
  const calls=[],cache=new Map();let user='supplier-a',version=0;
  const ctx={cleanWorkspace,crypto:{randomUUID:()=> 'random'},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},
    supabase:{auth:{getUser:async()=>({data:{user:{id:user}}})},
      from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:null,error:null})}),
      rpc:async(name,args)=>{calls.push([name,args]);
        if(denied)return {error:{code:'42501'}};
        if(name==='get_supplier_workspace')return missing?{error:{code:'PGRST202'}}:{data:{version,workspace:cleanWorkspace(),vendor_id:'vendor-a',published:null}};
        if(name==='save_supplier_workspace'){assert.equal(args.p_owner,user);assert.equal(args.p_version,version);return {data:{version:++version}};}
        if(name==='publish_supplier_storefront')return {data:{vendor_id:'vendor-a',published:{published_at:'now'}}};
        return {data:true};
      }}
  };
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return {service:ctx.createSupplierWorkspace('supplier-a'),calls,cache,switchUser:()=>{user='supplier-b';}};
}
{
  const f=fixture(),workspace=await f.service.load();workspace.storefront.name='A private draft';
  await f.service.save(workspace);assert.equal(f.service.published,null);assert.equal(f.calls.some(([name])=>name==='publish_supplier_storefront'),false);
  await f.service.publish(workspace);assert(f.service.published);assert.equal(f.calls.at(-1)[1].p_version,2);assert.equal(f.calls.at(-1)[1].p_owner,'supplier-a');
  await f.service.unpublish();assert.equal(f.service.published,null);assert.equal(workspace.storefront.name,'A private draft');
  f.switchUser();await assert.rejects(()=>f.service.save(workspace),/session changed/);await assert.rejects(()=>f.service.unpublish(),/session changed/);
}
{
  const f=fixture({missing:true}),workspace=await f.service.load();assert.equal(f.service.mode,'local');workspace.storefront.name='My draft';await f.service.save(workspace);
  assert.equal(JSON.parse(f.cache.get('wedsparks.supplier-review.v1.supplier-a')).storefront.name,'My draft');
  await assert.rejects(()=>f.service.publish(workspace),/Supabase setup/);
}
{
  const f=fixture({denied:true});await assert.rejects(()=>f.service.load(),/Could not load/);assert.equal(f.service.mode,'cloud');assert.equal(f.cache.size,0);
}
console.log('PASS: calendar boundaries, booking filters, private drafts, explicit publication, versioned saves, account isolation and restricted offline fallback.');
