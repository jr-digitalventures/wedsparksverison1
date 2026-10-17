export const supplierSections = [
  {key:'overview',label:'Overview',path:'supplier-account/',icon:'overview'},
  {key:'messages',label:'Inbox & Enquiries',path:'supplier-account/messages/',icon:'inbox'},
  {key:'bookings',label:'Booking Centre',path:'supplier-account/bookings/',icon:'book'},
  {key:'availability',label:'Availability',path:'supplier-account/availability/',icon:'calendar'},
  {key:'storefront',label:'Your Storefront',path:'supplier-account/storefront/',icon:'store'},
  {key:'reviews',label:'Reviews',path:'supplier-account/reviews/',icon:'review'},
  {key:'pricing-packages',label:'Pricing Packages',path:'supplier-account/pricing-packages/',icon:'tag'},
  {key:'account-settings',label:'Account Settings',path:'supplier-account/account-settings/',icon:'account'},
  {key:'profile-health',label:'Profile Health',path:'supplier-account/profile-health/',icon:'health'},
  {key:'settings',label:'Settings',path:'supplier-account/settings/',icon:'settings',group:'user'}
];
export const supplierPageCopy = {
  overview:['Your business at a glance','Stay close to your enquiries and keep your wedding business moving.'],
  bookings:['Your bookings, beautifully organised','Keep your couples, confirmed bookings and next steps together.'],
  availability:['Make room for your next celebration','Your wedding dates and availability, all in one place.'],
  storefront:['Show couples what makes you special','Bring your business to life with a storefront that feels like you.'],
  reviews:['Let your couples tell your story','A home for the kind words and experiences couples share.'],
  'pricing-packages':['Find the right fit for every couple','Present your services and packages clearly, in your own style.'],
  'account-settings':['Your business details, together','Keep the essentials for your supplier account in one place.'],
  'profile-health':['Make a great first impression','A little care for your storefront goes a long way.'],
  settings:['Your account, your preferences','Your personal account details and settings.']
};
export const supplierIcons = {
 overview:'M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z',
 inbox:'M4 4h16v16H4zM4 13h5l2 3h2l2-3h5M12 7v6M9 10l3 3 3-3',
 book:'M5 3h14v18H5zM9 3v8l3-2 3 2V3',
 calendar:'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2',
 store:'M4 10v11h16V10M3 10l2-7h14l2 7M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M9 21v-7h6v7',
 review:'M3 4h18v14H8l-5 3zM7 8h10M7 12h7',
 tag:'M3 12l9-9h9v9l-9 9zM16 7h.01',
 account:'M4 3h16v18H4zM8 19c0-5 8-5 8 0M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 health:'M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM13 17l3 3 5-7',
 settings:'M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'
};
export function supplierRouteFor(value,base) {
  try {
    const url=new URL(value,base);
    const origin=new URL(base);
    if(url.origin!==origin.origin)return null;
    let path=url.pathname.replace(/index\.html$/,'');
    if(!path.endsWith('/'))path+='/';
    return supplierSections.find(section=>new URL(section.path,origin).pathname===path)||null;
  }catch{return null;}
}
export function supplierSafeUrl(value,base) {
  if(typeof value!=='string'||!value.trim())return '';
  try{
    const url=new URL(value,base);
    return ['https:','http:'].includes(url.protocol)?url.href:'';
  }catch{return '';}
}
