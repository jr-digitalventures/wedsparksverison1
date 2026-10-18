// These are researched candidates, not active external-fetch integrations.
const entry=(id,name,hosts,countries,url)=>({id,name,hosts,countries,url,status:'candidate'});
export const supplierImportSources=[
 entry('easy-weddings','Easy Weddings',['easyweddings.com.au'],['AU'],'https://www.easyweddings.com.au/business/'),
 entry('wedshed','Wedshed',['wedshed.com.au'],['AU'],'https://www.wedshed.com.au/how-it-works/vendors/'),
 entry('wedding-diaries','Wedding Diaries',['weddingdiaries.com.au'],['AU'],'https://www.weddingdiaries.com.au/'),
 entry('abia','ABIA',['abia.com.au'],['AU'],'https://www.abia.com.au/'),
 entry('wedlockers','Wedlockers',['wedlockers.com.au'],['AU'],'https://www.wedlockers.com.au/about-us/'),
 entry('hello-may','Hello May',['hellomay.com.au'],['AU'],'https://hellomay.com.au/directory/'),
 entry('polka-dot-wedding','Polka Dot Wedding',['polkadotwedding.com'],['AU'],'https://polkadotwedding.com/directory-locations/australia/'),
 entry('ivory-tribe','Ivory Tribe',['ivorytribe.com.au'],['AU'],'https://ivorytribe.com.au/the-tribe/'),
 entry('wedded-wonderland','Wedded Wonderland',['weddedwonderland.com'],['AU'],'https://weddedwonderland.com/vendor?directory_type=vendor'),
 entry('one-fine-day','One Fine Day',['onefinedayweddingexpo.com.au'],['AU'],'https://onefinedayweddingexpo.com.au/directory'),
 entry('weddinghero','WeddingHero',['weddinghero.com.au'],['AU'],'https://weddinghero.com.au/wedding-vendors'),
 entry('wedding-bride','Wedding & Bride',['weddingandbride.com.au','melbourne.weddingandbride.com.au'],['AU'],'https://weddingandbride.com.au/'),
 entry('ideal-bride','Ideal Bride',['idealbride.com.au'],['AU'],'https://www.idealbride.com.au/regions/queensland/'),
 entry('hunter-valley','Hunter Valley Wedding Planner',['huntervalleyweddingplanner.com.au'],['AU'],'https://huntervalleyweddingplanner.com.au/directory-listing/'),
 entry('every-event','Every Event Australia',['everyeventaus.com.au'],['AU'],'https://www.everyeventaus.com.au/find-suppliers/'),
 entry('venue-crew','Venue Crew',['venuecrew.com'],['AU'],'https://www.venuecrew.com/au/venues/search/'),
 entry('venuenow','VenueNow',['venuenow.com','site.venuenow.com'],['AU','NZ'],'https://venuenow.com/'),
 entry('tagvenue','Tagvenue',['tagvenue.com'],['AU'],'https://www.tagvenue.com/au/'),
 entry('venue-maestro','Venue Maestro',['venuemaestro.com'],['AU'],'https://venuemaestro.com/'),
 entry('venyu','VENYU',['venyu.com.au'],['AU'],'https://venyu.com.au/find-a-venue/'),
 entry('my-wedding-guide','My Wedding Guide',['myweddingguide.co.nz'],['NZ'],'https://www.myweddingguide.co.nz/directory'),
 entry('weddingwise','WeddingWise',['weddingwise.co.nz'],['NZ'],'https://weddingwise.co.nz/directory'),
 entry('bride-groom','Bride & Groom',['brideandgroom.co.nz'],['NZ'],'https://www.brideandgroom.co.nz/venues'),
 entry('together-journal','Together Journal',['togetherjournal.com'],['NZ'],'https://togetherjournal.com/directory/'),
 entry('auckland-weddings','Auckland Weddings',['aucklandweddings.co.nz'],['NZ'],'https://www.aucklandweddings.co.nz/'),
 entry('canterbury-bride','Canterbury Bride',['canterburybride.co.nz'],['NZ'],'https://www.canterburybride.co.nz/wedding-directory'),
 entry('christchurch-weddings','Christchurch Weddings',['christchurchweddings.net'],['NZ'],'https://christchurchweddings.net/directory-hub'),
 entry('wellington-show','The Wellington Wedding Show',['thewellingtonweddingshow.co.nz'],['NZ'],'https://www.thewellingtonweddingshow.co.nz/'),
 entry('my-wedding-mag','My Wedding Magazine NZ',['myweddingmag.co.nz'],['NZ'],'https://myweddingmag.co.nz/directory/'),
 entry('getting-hitched','Getting Hitched',['gettinghitched.co.nz'],['NZ'],'https://www.gettinghitched.co.nz/'),
 entry('wedpro','WedPro',['wedpro.co.nz'],['NZ'],'https://wedpro.co.nz/nz-wedding-directory'),
 entry('wedding-vendors-nz','Wedding Vendors NZ',['weddingvendors.co.nz'],['NZ'],'https://weddingvendors.co.nz/'),
 entry('wedding-venues-nz','Wedding Venues NZ',['weddingvenues.co.nz'],['NZ'],'https://weddingvenues.co.nz/'),
 entry('nz-venues','NZ Venues',['nzvenues.co.nz'],['NZ'],'https://nzvenues.co.nz/suppliers'),
 entry('queenstown-association','Queenstown Wedding Association',['queenstownweddings.org'],['NZ'],'https://queenstownweddings.org/explore/'),
 entry('first-look','First Look',['firstlook.nz'],['NZ'],'https://www.firstlook.nz/'),
 entry('savoro','Savoro',['savoro.co.nz'],['NZ'],'https://savoro.co.nz/weddings/'),
 entry('sharedspace','Sharedspace',['sharedspace.co.nz'],['NZ'],'https://www.sharedspace.co.nz/blog/33-other-news/124-top-wedding-venue.html'),
 entry('eventfinda','Eventfinda',['eventfinda.co.nz'],['NZ'],'https://support.eventfinda.co.nz/hc/en-gb/articles/202979844-How-do-I-add-a-venue-listing-to-the-Eventfinda-database')
];
export const importSourcesForCountry=country=>supplierImportSources.filter(s=>s.countries.includes(country));
export function identifyImportSource(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.hostname==='localhost'||!url.hostname.includes('.')||/^[\d.]+$/.test(url.hostname)||url.hostname.includes(':')||/\.(?:local|internal|test|invalid)$/.test(url.hostname))throw new Error('Use an HTTPS link to your public business profile.');
 if([...url.searchParams.keys()].some(k=>/^(?:access_token|token|password|session|code|auth)$/i.test(k)))throw new Error('Use your public listing link, without login or session details.');
 const hostname=url.hostname.toLowerCase().replace(/^www\./,'');
 const source=supplierImportSources.find(s=>s.hosts.includes(hostname));
 return {url:url.origin+url.pathname,source:source||null};
}
