import {supabase} from './supabase-client.js';
import {requireUser,loadAccount,siteUrl,verifiedUser,onSessionChange} from './auth.js';
import {createSupplierWorkspace} from './supplier-workspace-service.js';
import {renderSupplierProfile,el} from './supplier-profile-view.js';
const root=document.querySelector('[data-supplier-profile]'),params=new URLSearchParams(location.search);
let previewOwner=null,revoked=false;
onSessionChange(({user})=>{if(previewOwner&&previewOwner!==user?.id){revoked=true;root.replaceChildren(el('p','Please sign in again to view your draft.'));document.querySelectorAll('dialog').forEach(d=>d.close());}});
async function start(){
  try{
    if(params.get('preview')==='1'){
      document.title='Storefront preview — WedSparks';
      const user=await requireUser(location.pathname+location.search);if(!user)return;previewOwner=user.id;
      const account=await loadAccount(user);if(!account.roles.includes('supplier'))throw new Error('This preview is available to the supplier who owns the draft.');
      const service=createSupplierWorkspace(user.id),workspace=await service.load();
      const urls=await Promise.all(workspace.storefront.images.map(i=>service.imageUrl(i)));
      if(revoked)return;
      renderSupplierProfile(root,{...workspace.storefront,images:urls},{packages:workspace.packages,preview:true});
      const back=el('a','← Back to your storefront','sp-back');back.href=siteUrl('supplier-account/storefront/');root.prepend(back);return;
    }
    const id=params.get('id');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))throw new Error('This supplier page could not be found.');
    const {data,error}=await supabase.rpc('get_public_supplier_storefront',{p_vendor_id:id});
    if(error)throw new Error('This supplier page could not be loaded. Please try again later.');
    if(!data)throw new Error('This supplier page is currently unavailable.');
    document.title=(data.storefront.name||'Wedding supplier')+' — WedSparks';
    renderSupplierProfile(root,data.storefront,{packages:data.packages||[],reviews:data.reviews||[],chatUrl:siteUrl('dashboard/messages/?vendor='+id),
      onShortlist:async button=>{
        button.disabled=true;
        try{
          const user=await verifiedUser();if(!user){location.href=siteUrl('login/?returnTo='+encodeURIComponent(location.pathname+location.search));return;}
          const account=await loadAccount(user);if(!account.roles.includes('couple')){button.textContent='Shortlists are for couple accounts';return;}
          const existing=await supabase.from('saved_suppliers').select('vendor_id').eq('user_id',user.id).eq('vendor_id',id).maybeSingle();
          if(existing.error)throw existing.error;
          if(!existing.data){const {error}=await supabase.from('saved_suppliers').insert({user_id:user.id,vendor_id:id});if(error&&error.code!=='23505')throw error;}
          button.textContent='✓ Saved to shortlist';
        }catch{button.textContent='Could not save · Try again';button.disabled=false;}
      }});
  }catch(error){root.replaceChildren(el('h1','Your supplier page'),el('p',error.message));const back=el('a','Explore suppliers');back.href=siteUrl('supplier-category/');root.append(back);}
}
void start();
