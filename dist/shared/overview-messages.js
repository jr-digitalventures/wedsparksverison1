import {supabase} from './supabase-client.js';
import {siteUrl,onSessionChange} from './auth.js';

let owner=null,revision=0,inFlight=false,revoked=false,channel=null,timer=null,dirty=false,signature='';
const $=id=>document.getElementById('overview-message-'+id);
const visible=()=>!!$('list') && !$('list').closest('main')?.hidden &&
  !document.getElementById('private-content')?.hidden && !document.hidden;
const node=(tag,value,className)=>{
  const el=document.createElement(tag);
  if(value!=null)el.textContent=value;
  if(className)el.className=className;
  return el;
};
const overviewStyle=document.createElement('style');
overviewStyle.textContent=[
  '#overview-message-list{list-style:none;margin:0 0 16px;padding:0}',
  '#overview-message-list li{border-bottom:1px solid #e4e2dc}',
  '#overview-message-list a{display:flex;align-items:center;gap:12px;padding:11px 0;color:#213e34;text-decoration:none}',
  '#overview-message-list a:hover strong{text-decoration:underline}',
  '#overview-message-list img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0}',
  '#overview-message-list .overview-message-copy{min-width:0;flex:1}',
  '#overview-message-list small{display:block;color:#59645d;font-size:12px}',
  '#overview-message-list .overview-message-preview{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;font-size:13px}',
  '#overview-message-count{color:inherit;text-decoration:none}',
  '#overview-message-count:hover{text-decoration:underline}',
  '#overview-message-status:empty{display:none}',
  '#overview-message-link{display:inline-block;margin-top:8px}'
].join('\n');
document.head.append(overviewStyle);
function stop(){
  clearTimeout(timer);timer=null;
  const previous=channel;channel=null;
  if(previous)try{void supabase.removeChannel(previous).catch(()=>{});}catch{}
}
function queue(){
  if(!owner||revoked||!visible())return;
  if(inFlight){dirty=true;return;}
  if(timer!==null)return;
  timer=setTimeout(()=>{timer=null;void refreshOverviewMessages();},160);
}
function subscribe(){
  if(!owner||revoked||channel)return;
  const liveOwner=owner;
  const changed=()=>{if(owner===liveOwner&&!revoked)queue();};
  try{
    channel=supabase.channel('overview-messages:'+owner)
      .on('postgres_changes',{event:'*',schema:'public',table:'supplier_conversations'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'supplier_messages'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'supplier_conversation_reads'},changed);
    channel.subscribe(state=>{if(state==='SUBSCRIBED')changed();});
  }catch{stop();}
}
export async function refreshOverviewMessages(userId=owner){
  if(!userId||revoked||!$('list'))return;
  if(inFlight){dirty=true;return;}
  owner=userId;subscribe();
  const version=++revision;
  inFlight=true;dirty=false;
  $('count').href=siteUrl('dashboard/messages/');
  $('link').href=siteUrl('dashboard/messages/');
  try{
    const {data,error}=await supabase.rpc('get_message_inbox',{
      p_status:'open',p_category:'',p_limit:3,p_offset:0
    });
    if(revoked||version!==revision||owner!==userId)return;
    if(error||!data||!Array.isArray(data.rows))throw new Error();
    const unread=Number(data.unread_total)||0;
    $('count').textContent=unread.toLocaleString('en-AU');
    $('count').setAttribute('aria-label',unread+' unread messages. Open Messages.');
    $('status').textContent=data.rows.length?'':'Find suppliers you love and start a conversation.';
    const nextSignature=JSON.stringify(data.rows);
    if(signature!==nextSignature){
      signature=nextSignature;
      const items=data.rows.map(row=>{
        const item=node('li');
        const link=node('a');
        const url=new URL(siteUrl('dashboard/messages/'));
        url.searchParams.set('conversation',row.id);
        link.href=url.href;
        // A full navigation retains the requested conversation in the URL.
        link.target='_self';
        if(row.business_image){
          try{
            const imageUrl=new URL(row.business_image,siteUrl(''));
            if(['https:','http:'].includes(imageUrl.protocol)){
              const img=node('img');img.src=imageUrl.href;img.alt='';img.loading='lazy';
              img.addEventListener('error',()=>img.remove());link.append(img);
            }
          }catch{}
        }
        const copy=node('div',null,'overview-message-copy');
        copy.append(node('strong',row.business_name||'Supplier'));
        copy.append(node('span',String(row.last_message||'Start your conversation').slice(0,100),
          'overview-message-preview'));
        const parts=[];
        if(Number(row.unread_count)>0)parts.push(row.unread_count+' unread');
        if(row.last_message_at)parts.push(new Date(row.last_message_at).toLocaleString('en-AU',
          {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}));
        copy.append(node('small',parts.join(' · ')));
        link.append(copy);item.append(link);return item;
      });
      $('list').replaceChildren(...items);
    }
  }catch{
    if(!revoked&&version===revision)$('status').textContent=
      'Messages will reconnect automatically.';
  }finally{
    if(version===revision){
      inFlight=false;
      if(dirty){dirty=false;queue();}
    }
  }
}
window.addEventListener('wedsparks:messages-changed',queue);
window.addEventListener('wedsparks:section-open',event=>{if(event.detail==='overview')queue();});
window.addEventListener('focus',queue);
window.addEventListener('online',queue);
window.addEventListener('pagehide',stop);
window.addEventListener('pageshow',()=>{subscribe();queue();});
document.addEventListener('visibilitychange',queue);
setInterval(queue,12000);
onSessionChange(({user})=>{
  if(owner&&user?.id!==owner){
    revoked=true;revision++;owner=null;stop();
    $('list')?.replaceChildren();
    if($('count'))$('count').textContent='—';
    const content=document.getElementById('private-content');
    if(content)content.hidden=true;
  }
});
