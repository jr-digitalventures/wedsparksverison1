import {supabase} from './supabase-client.js';
import {cleanWorkspace} from './supplier-workspace-model.js';
const missingApi=error=>['PGRST202','PGRST205','42883','42P01'].includes(error?.code);
export function createSupplierWorkspace(owner){
  const key='wedsparks.supplier-review.v1.'+owner;
  let revision=0,mode='cloud',published=null,vendorId=null;
  async function identity(){const {data,error}=await supabase.auth.getUser();if(error||data.user?.id!==owner)throw new Error('Your session changed. Please reload this page.');}
  function readLocal(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  return {
    get mode(){return mode;},get published(){return published;},get vendorId(){return vendorId;},
    async load(){
      await identity();
      const {data,error}=await supabase.rpc('get_supplier_workspace');
      await identity();
      if(error&&!missingApi(error))throw new Error('Could not load your workspace. Please try again.');
      if(error){
        mode='local';const cached=readLocal();
        if(cached)return cleanWorkspace(cached);
        // Reuse the supplier's connected business while the new database setup is pending.
        const mapping=await supabase.from('supplier_vendor_accounts').select('vendor_id').eq('user_id',owner).maybeSingle();
        if(mapping.error)throw new Error('Could not load your connected business.');
        if(mapping.data){
          vendorId=mapping.data.vendor_id;
          const row=await supabase.from('Vendor Public Profiles').select('*').eq('vendor_id',vendorId).maybeSingle();
          if(row.error)throw new Error('Could not load your connected business.');
          if(row.data){const v=row.data;return cleanWorkspace({storefront:{name:v['Name of Wedding Vendor'],category:v['Wedding Vendor Type'],about:v['About Paragraph'],city:v['Location - Suburb/City']||v.Location,state:v['Location - State'],startingPrice:v['Starting Price'],features:[1,2,3,4].map(i=>v['Showcased Feature #'+i]).filter(Boolean).join('\n'),images:Array.from({length:10},(_,i)=>v['Image #'+(i+1)]).filter(Boolean).map(url=>({url}))}});}
        }
        return cleanWorkspace();
      }
      if(!data||typeof data.workspace!=='object')throw new Error('The workspace response was incomplete.');
      revision=data.version;published=data.published;vendorId=data.vendor_id;
      return cleanWorkspace(data.workspace);
    },
    async save(workspace){
      await identity();
      if(mode==='local'){try{localStorage.setItem(key,JSON.stringify(workspace));}catch{throw new Error('This browser is full. Remove a photo or connect Supabase before saving.');}return;}
      const {data,error}=await supabase.rpc('save_supplier_workspace',{p_workspace:workspace,p_version:revision,p_owner:owner});
      if(error?.code==='40001')throw new Error('This workspace changed in another tab. Reload before saving again.');
      if(error)throw new Error('Could not save. Your changes are still here; please try again.');
      revision=data.version;
    },
    async upload(file){
      await identity();
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose a JPG, PNG or WebP photo under 5 MB.');
      if(mode==='local'){
        if(file.size>650000)throw new Error('For browser review mode, choose a photo under 650 KB. Full-size uploads unlock after the database setup.');
        const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});return {url};
      }
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],path=owner+'/'+crypto.randomUUID()+'.'+ext;
      const {error}=await supabase.storage.from('supplier-storefront-drafts').upload(path,file,{contentType:file.type,upsert:false});
      if(error)throw new Error('The photo could not be uploaded. Please try again.');
      return {path};
    },
    async imageUrl(image){
      if(image.path){const {data,error}=await supabase.storage.from('supplier-storefront-drafts').createSignedUrl(image.path,3600);return error?'':data.signedUrl;}
      return image.url||'';
    },
    async publish(workspace){
      if(mode==='local')throw new Error('Publishing is available after the Supabase setup. You can save and preview your draft now.');
      await identity();await this.save(workspace);
      const images=[];
      for(const image of workspace.storefront.images){
        if(!image.path){images.push({url:image.url});continue;}
        const download=await supabase.storage.from('supplier-storefront-drafts').download(image.path);
        if(download.error)throw new Error('Could not prepare a photo for publishing. Your draft is safe.');
        // Immutable, unique public copies are created only when Publish is chosen.
        const path=owner+'/'+crypto.randomUUID()+'.'+image.path.split('.').pop();
        const upload=await supabase.storage.from('supplier-storefront-public').upload(path,download.data,{contentType:download.data.type,upsert:false});
        if(upload.error)throw new Error('Could not publish a photo. Your draft is safe.');
        images.push({public_path:path});
      }
      const {data,error}=await supabase.rpc('publish_supplier_storefront',{p_version:revision,p_images:images,p_owner:owner});
      if(error?.code==='23505')throw new Error('This business name is already in use. Please choose a distinct name.');
      if(error)throw new Error(error.code==='40001'?'Another tab changed your draft. Reload before publishing.':'Could not publish. Check the required fields and try again.');
      vendorId=data.vendor_id;published=data.published;
      return data;
    },
    async unpublish(){
      await identity();const {error}=await supabase.rpc('unpublish_supplier_storefront',{p_owner:owner});
      if(error)throw new Error('Could not take the page offline. Please try again.');published=null;
    }
  };
}
