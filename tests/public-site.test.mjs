import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {publicPages,guides} from '../scripts/public-page-content.mjs';
import {creditMilestone,timelineTime,budgetAllocation} from '../dist/shared/public-tools-model.js';
import {supplierImportSources,importSourcesForCountry,identifyImportSource} from '../dist/shared/supplier-import-sources.js';
import {parseProfileImport} from '../dist/shared/profile-import-parser.js';
assert.equal(creditMilestone(9999),0);assert.equal(creditMilestone(10000),1000);assert.equal(creditMilestone(45000),4000);assert.equal(creditMilestone(-1000),0);
assert.equal(timelineTime('15:00',345),'20:45');assert.equal(timelineTime('00:30',-60),'23:30 · previous day');assert.equal(timelineTime('23:30',60),'00:30 · next day');assert.equal(timelineTime('25:00',0),'');
assert.deepEqual(budgetAllocation(40000,[50,30,20]),[20000,12000,8000]);assert.equal(budgetAllocation(-1,[50]),null);
assert.equal(importSourcesForCountry('AU').length,20);assert.equal(importSourcesForCountry('NZ').length,20);assert.equal(supplierImportSources.length,39);
assert.equal(identifyImportSource('https://www.weddingwise.co.nz/vendor/business').source.id,'weddingwise');
assert.equal(identifyImportSource('https://easyweddings.com.au.fake.example/vendor').source,null);
for(const url of ['http://easyweddings.com.au/','https://user:password@example.com/','https://127.0.0.1/profile','https://localhost/a','https://example.com/?access_token=secret'])assert.throws(()=>identifyImportSource(url));
const json=parseProfileImport(JSON.stringify({name:'My business',description:'Own description',user_id:'someone-else',reviews:[{rating:5}],password:'secret',website:'javascript:alert(1)'}),'json');
assert.deepEqual(json.fields,{name:'My business',about:'Own description'});
const csv=parseProfileImport('Business name,About,City\n"A, B & Co","Hello\nworld",Auckland','csv');assert.equal(csv.fields.name,'A, B & Co');assert.equal(csv.fields.about,'Hello\nworld');
const html=parseProfileImport('<html><meta name="description" content="A &amp; B"><script>alert("bad")</script><script type="application/ld+json">{"@type":"LocalBusiness","name":"My studio","address":{"addressLocality":"Wellington"}}</script></html>','html');assert.equal(html.fields.name,'My studio');assert.equal(html.fields.city,'Wellington');assert.equal(html.fields.about,'A & B');assert(!JSON.stringify(html.fields).includes('alert'));
const nz=parseProfileImport('{"name":"NZ business","startingPrice":"1000","priceCurrency":"NZD"}','json');assert(!('startingPrice' in nz.fields));
assert.equal(parseProfileImport('Business name: Hello\nAbout: First line\nSecond line').fields.about,'First line\nSecond line');
assert.throws(()=>parseProfileImport('"unterminated','csv'));
assert.throws(()=>parseProfileImport('x'.repeat(250001)));
const supplierFiles=fs.readdirSync('dist/suppliers',{withFileTypes:true}).filter(f=>f.isDirectory()).map(f=>path.join('dist/suppliers',f.name,'index.html'));
const supplierBefore=supplierFiles.map(f=>fs.readFileSync(f,'utf8'));
execFileSync(process.execPath,['scripts/generate-public-pages.mjs'],{stdio:'pipe'});
const before=fs.readFileSync('dist/index.html','utf8');
execFileSync(process.execPath,['scripts/generate-public-pages.mjs'],{stdio:'pipe'});
const home=fs.readFileSync('dist/index.html','utf8');assert.equal(home,before,'Generator must be idempotent, including literal dollar values.');
assert.equal((home.match(/<h1\b/g)||[]).length,1);assert(home.includes('$1,000'));assert(home.includes('$10,000'));assert(!home.includes('href="https://www.google.com/"'));
const routes=[...publicPages.map(p=>p.path),'wedding-guides','supplier-profile-import',...guides.map(g=>'wedding-guides/'+g.slug)];
const sitemap=fs.readFileSync('dist/sitemap.xml','utf8');assert(sitemap.includes('<loc>https://jr-digitalventures.github.io/wedsparksverison1/</loc>'));
for(const route of routes){const file=path.resolve('dist',route,'index.html'),html=fs.readFileSync(file,'utf8');assert.equal((html.match(/<h1\b/g)||[]).length,1,route);assert(html.includes('rel="canonical"'),route);assert(!html.includes('Option 3'),route);if(!publicPages.find(p=>p.path===route)?.draft)assert(sitemap.includes('/'+route+'/</loc>'),route);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){const href=match[1];if(/^(?:https?:|data:|mailto:|#)/.test(href))continue;const target=path.resolve(path.dirname(file),href.split(/[?#]/)[0]);assert(fs.existsSync(target),'Missing linked file: '+route+' -> '+href);}
}
assert(!sitemap.includes('/privacy/</loc>'));assert(!sitemap.includes('/terms/</loc>'));assert(!sitemap.includes('/supplier/?'));
assert(fs.readFileSync('dist/supplier/index.html','utf8').includes('noindex,nofollow'),'Dynamic preview template stays protected.');
assert(!fs.readFileSync('dist/shared/supplier-dashboard.js','utf8').includes('profile-import'),'No import UI added to supplier dashboard.');
console.log('PASS: credit boundaries, budget/timeline calculations, AU/NZ source recognition, safe field imports, generated page links, indexability and repeatable homepage builds.');

const withoutFooter=s=>s.replace(/<footer\b[\s\S]*?<\/footer>/,'');
assert.deepEqual(supplierFiles.map(f=>withoutFooter(fs.readFileSync(f,'utf8'))),supplierBefore.map(withoutFooter),'Only the shared footer may change on individual supplier pages.');
assert(!fs.readFileSync('.github/workflows/static.yml','utf8').includes('node scripts/generate-supplier-profiles.mjs'),'Supplier rebuild remains deferred.');

const creditHtml=fs.readFileSync('dist/wedding-credits/index.html','utf8');
assert(creditHtml.includes('Only money spent through the WedSparks payment function counts'));
assert(creditHtml.includes('They cannot be withdrawn as cash.'));
assert(!/programme preview|programme not yet open|rewards launching later|proposed reward/i.test(creditHtml+home));
for(const route of routes){const html=fs.readFileSync(path.join('dist',route,'index.html'),'utf8');assert(html.includes('class="public-photo-banner"'),route+' needs a photo banner');}
assert(home.includes('Create Your Day,'));assert(!home.includes('Your wedding spending</span>'));assert(home.includes('Free Wedding Credits'));
assert(fs.readFileSync('dist/homepage-2/index.html','utf8').includes('http-equiv="refresh"'),'Old comparison link redirects to selected homepage.');

const supplierPitch=fs.readFileSync('dist/for-suppliers/index.html','utf8');
assert(supplierPitch.includes('18%'));assert(supplierPitch.includes('$50/month'));assert(supplierPitch.includes('core tools are free'));
const directory=fs.readFileSync('dist/wedding-suppliers/index.html','utf8');
assert(directory.indexOf('data-discovery-intro')<directory.indexOf('id="supplier-category-content"'));
assert(!directory.includes('Homepage 2'));assert(!directory.includes('<span>467</span>'));
for(const route of ['cancellations','disputes'])assert(!sitemap.includes('/'+route+'/</loc>'));

function checkFooters(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())checkFooters(file);else if(entry.name==='index.html'){const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/<footer\b/g)||[]).length,1,'One shared footer: '+file);}}}
checkFooters('dist');

assert.equal(creditMilestone(10000,1000),0);assert.equal(creditMilestone(11000,1000),1000);assert.equal(creditMilestone(20000,1000),1000);assert.equal(creditMilestone(22000,2000),2000);assert.equal(creditMilestone(9000,10000),0);
for(const route of routes){const html=fs.readFileSync(path.join('dist',route,'index.html'),'utf8'),raw=html.match(/<script type="application\/ld\+json" data-public-seo>([\s\S]*?)<\/script>/)?.[1];if(publicPages.find(p=>p.path===route)?.draft){assert(!raw);continue;}assert(raw,'Structured data on '+route);const graph=JSON.parse(raw)['@graph'];assert(graph.some(n=>n['@type']==='Organization'));if(route.startsWith('wedding-guides/'))assert(graph.some(n=>n['@type']==='Article'));}
assert(!creditHtml.includes('class="public-photo-break"'));assert(creditHtml.includes('photo-end-cta'));
assert(home.includes('<h3>Earn</h3>'));assert(home.includes('planning-dropdown'));

assert(directory.includes('id="supplier-card-template"'));assert(directory.includes('id="featured-card-template"'));
assert(!directory.replace(/<template[\s\S]*?<\/template>/g,'').includes('THE HARBOUR VIEW'),'Sample cards are inert rather than visible indexable content.');

assert(!creditHtml.includes('credit-funded'));assert(creditHtml.includes('data-purchasing-power'));assert(creditHtml.includes('Amounts covered by credits do not earn more credits.'));
const hero=home.match(/<div class="home-hero-summary">([\s\S]*?)<\/div>/)[1];assert(!/<strong|<br/.test(hero));assert.equal((hero.match(/<p>/g)||[]).length,1);assert(home.includes('$1,000 earned per $10,000 paid'));
for(const route of ['privacy','terms','wedding-credits/terms','cancellations','disputes']){const html=fs.readFileSync('dist/'+route+'/index.html','utf8');assert(html.includes('legal-document'));assert(!html.includes('public-photo-break'));assert(html.includes('Not yet effective'));assert((html.match(/<section id="policy-/g)||[]).length>=8);}
assert(!fs.readFileSync('dist/supplier-profile-import/index.html','utf8').includes('class="public-end-cta"'));

const primary=home.match(/aria-label="Primary navigation">([\s\S]*?)<\/nav><a class="brand"/)[1];
assert(primary.includes('Spend Less'));assert(!primary.includes('Wedding Credits'));
assert(primary.includes('<strong>Wedding Guides</strong>'));assert(primary.indexOf('Wedding Guides')<primary.indexOf('</nav></div>'),'Guides stays inside planning dropdown');
const importerSource=fs.readFileSync('dist/shared/profile-import-page.js','utf8');assert(!importerSource.includes('import-text'));assert(!importerSource.includes('Or paste your business details'));assert(importerSource.includes('parseProfileImport(importedText,loadedFormat)'));
