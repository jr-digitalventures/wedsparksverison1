const aliases={name:['name','businessname','nameofweddingvendor','companyname'],category:['category','weddingvendortype','businesscategory'],about:['about','description','aboutparagraph','businessdescription'],tagline:['tagline','shortdescription'],city:['city','suburb','addresslocality','locationsuburbcity'],state:['state','region','addressregion','locationstate'],website:['website','businesswebsite','url'],features:['features','services','inclusions'],startingPrice:['startingprice','price'],faq:['faq','faqs'],cancellation:['cancellation','cancellationpolicy'],privacy:['privacy','privacypolicy']};
const normal=value=>String(value).toLowerCase().replace(/[^a-z]/g,'');
const entities=s=>String(s).replace(/&(?:amp|lt|gt|quot|apos|#39|#x27|nbsp);/gi,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&#x27;':"'",'&nbsp;':' '}[m.toLowerCase()]||m));
export function plainText(value){return entities(String(value??'').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6])>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/\r\n?/g,'\n').trim().slice(0,6000);}
function mapObject(value){const result={};if(!value||typeof value!=='object'||Array.isArray(value))return result;for(const [key,keys] of Object.entries(aliases)){const entry=Object.entries(value).find(([name,v])=>keys.includes(normal(name))&&(typeof v==='string'||typeof v==='number'||Array.isArray(v)));if(entry){const text=plainText(Array.isArray(entry[1])?entry[1].filter(v=>typeof v==='string').join('\n'):entry[1]);if(text)result[key]=text;}}
 if(value.address&&typeof value.address==='object'){if(value.address.addressLocality)result.city=plainText(value.address.addressLocality);if(value.address.addressRegion)result.state=plainText(value.address.addressRegion);}
 if(result.website){try{const u=new URL(result.website);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)delete result.website;}catch{delete result.website;}}
 if(result.startingPrice){const currency=String(value.currency||value.priceCurrency||'').toUpperCase();const n=Number(result.startingPrice.replace(/[$,\s]/g,''));if(currency==='NZD'||!Number.isFinite(n)||n<0)delete result.startingPrice;else result.startingPrice=String(n);}
 return result;
}
function csvRows(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw new Error('The CSV has an unfinished quoted field.');row.push(cell);if(row.some(Boolean))rows.push(row);return rows;}
export function parseProfileImport(text,format='text'){
 if(typeof text!=='string'||!text.trim())throw new Error('Paste your business details or choose a file first.');
 if(text.length>250000)throw new Error('Choose a text, CSV, JSON or HTML file under 250 KB.');
 let fields={},notes=[];
 if(format==='json'||/^[\s\uFEFF]*[\[{]/.test(text)){
   let parsed;try{parsed=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('This JSON file could not be read.');}
   if(Array.isArray(parsed)){notes.push('Only the first business record was read.');parsed=parsed[0];}
   parsed=parsed?.workspace?.storefront||parsed?.storefront||parsed;
   if(parsed?.['@graph']){const graph=parsed['@graph'];parsed=graph.find?.(n=>/LocalBusiness|Organization|Hotel|EventVenue/.test(String(n['@type'])))||graph[0];}
   fields=mapObject(parsed);
 }else if(format==='csv'){
   const rows=csvRows(text);if(rows.length<2)throw new Error('Include a header row and one business record in the CSV.');fields=mapObject(Object.fromEntries(rows[0].map((key,i)=>[key,rows[1][i]||''])));if(rows.length>2)notes.push('Only the first business record was read.');
 }else if(format==='html'||/<(?:html|meta|script|body)\b/i.test(text)){
   for(const match of text.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const parsed=parseProfileImport(match[1],'json');fields={...fields,...parsed.fields};if(fields.name&&fields.about)break;}catch{}}
   const meta={};for(const match of text.matchAll(/<meta\b[^>]*>/gi)){const attrs={};for(const a of match[0].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs))attrs[a[1].toLowerCase()]=a[3];const key=attrs.property||attrs.name;if(key&&attrs.content)meta[key.toLowerCase()]=attrs.content;}
   if(!fields.name&&meta['og:title'])fields.name=plainText(meta['og:title']);if(!fields.about&&(meta.description||meta['og:description']))fields.about=plainText(meta.description||meta['og:description']);
   if(!Object.keys(fields).length)fields.about=plainText(text);notes.push('Images, scripts, external review scores and badges were not imported.');
 }else{
   const data={};let active=null;for(const line of text.split(/\r?\n/)){const match=line.match(/^\s*([^:]{1,45}):\s*(.*)$/);const key=match&&Object.keys(aliases).find(k=>aliases[k].includes(normal(match[1])));if(key){active=key;data[key]=match[2];}else if(active&&!/^\s*(?:password|token|secret)\s*:/i.test(line))data[active]+='\n'+line;}
   fields=Object.keys(data).length?mapObject(data):{about:plainText(text.replace(/^\s*(?:password|token|secret)\s*:.*$/gmi,''))};
 }
 // Hard field whitelist: no imported markup, ownership IDs, ratings or private account data.
 fields=Object.fromEntries(Object.entries(fields).filter(([key,value])=>key in aliases&&value));
 if(!Object.keys(fields).length)throw new Error('No supported business fields were found. Try pasting your name and description.');
 notes.push('Check all imported text and prices. New Zealand dollar prices are omitted until multi-currency supplier publishing is connected.');
 return {fields,notes};
}
