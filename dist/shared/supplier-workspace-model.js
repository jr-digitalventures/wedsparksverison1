export const availabilityStates=['Available','Tentative booking','Booked','Blocked'];
export const defaultCategories=['Cake','Catering','Celebrant','Entertainment','Floristry','Hair & makeup','Photography','Stationery','Transport','Venue','Venue · Barn & farm','Venue · Garden','Venue · Hotel','Venue · Restaurant','Venue · Waterfront','Videography','Wedding hire','Wedding planning'];
export const emptyStorefront=()=>({name:'',category:'',tagline:'',about:'',city:'',state:'',serviceAreas:'',startingPrice:'',website:'',features:'',faq:'',cancellation:'',privacy:'',images:[]});
export const emptyWorkspace=()=>({storefront:emptyStorefront(),packages:[],availability:[],capacity:1,bookings:[],quoteDrafts:[]});
export function cleanWorkspace(value){
  const base=emptyWorkspace(),v=value&&typeof value==='object'?value:{};
  return {...base,...(v.onboarding&&typeof v.onboarding==='object'&&!Array.isArray(v.onboarding)?{onboarding:v.onboarding}:{}),storefront:{...base.storefront,...v.storefront,images:Array.isArray(v.storefront?.images)?v.storefront.images.slice(0,10):[]},
    packages:Array.isArray(v.packages)?v.packages:[],availability:Array.isArray(v.availability)?v.availability:[],
    capacity:Math.min(20,Math.max(1,Number(v.capacity)||1)),bookings:Array.isArray(v.bookings)?v.bookings:[],quoteDrafts:Array.isArray(v.quoteDrafts)?v.quoteDrafts:[]};
}
export const money=value=>new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(typeof value==='string'?value.replace(/[$,\s]/g,''):value)||0);
export function missingEssentials(profile){return [['Business name',profile.name],['Supplier category',profile.category],['About your business',profile.about],['City or suburb',profile.city],['State',profile.state],['Main photo',profile.images?.length]].filter(([,v])=>!String(v||'').trim()).map(([label])=>label);}
export function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function monthCells(year,month){const first=new Date(year,month,1,12),offset=(first.getDay()+6)%7;return Array.from({length:42},(_,i)=>{const date=new Date(year,month,i-offset+1,12);return {key:dateKey(date),day:date.getDate(),current:date.getMonth()===month};});}
export function dateRange(start,end){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw new Error('Choose a valid date range.');
  const keys=[],d=new Date(start+'T12:00:00'),last=new Date(end+'T12:00:00');
  if(Number.isNaN(d.getTime())||dateKey(d)!==start||Number.isNaN(last.getTime())||dateKey(last)!==end)throw new Error('Choose a valid date.');
  while(dateKey(d)<=end){keys.push(dateKey(d));if(keys.length>366)throw new Error('Please select up to one year at a time.');d.setDate(d.getDate()+1);}
  return keys;
}
export function groupBookings(rows,query='',status='all'){
  const term=query.trim().toLowerCase();
  return rows.filter(row=>(status==='all'||row.status===status)&&[row.couple,row.venue,row.title].join(' ').toLowerCase().includes(term)).sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
}
export function safeWebUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:'';}catch{return '';}}
