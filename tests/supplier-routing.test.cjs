const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm=require('node:vm');
const routeContext={module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/wedding-suppliers/supplier-routes.js'),'utf8'),routeContext);
const routes=routeContext.module.exports;

const dist = path.join(__dirname, '../dist');
const page = (...segments) => path.join(dist, 'wedding-suppliers', ...segments, 'index.html');

test('supplier route slugs are unique and reversible', () => {
  const categorySlugs = routes.categories.map(item => item.slug);
  const locationSlugs = [...routes.states, ...routes.cities].map(item => item.slug);
  assert.equal(new Set(categorySlugs).size, categorySlugs.length);
  assert.equal(new Set(locationSlugs).size, locationSlugs.length);
  routes.categories.forEach(item => assert.equal(routes.categoryBySlug(item.slug).value, item.value));
  [...routes.states, ...routes.cities].forEach(item => assert.equal(routes.locationBySlug(item.slug).value, item.value));
});

test('generator creates every category, state, city and combination route', () => {
  const expected = 1 + routes.categories.length + routes.states.length + routes.cities.length
    + routes.categories.length * (routes.states.length + routes.cities.length);
  const indexes = [];
  const visit = directory => fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else if (entry.name === 'index.html') indexes.push(target);
  });
  visit(path.join(dist, 'wedding-suppliers'));
  assert.equal(indexes.length, expected);
  assert.ok(fs.existsSync(page('wedding-venues', 'nsw')));
  assert.ok(fs.existsSync(page('wedding-photographers', 'sydney-nsw')));
});

test('generated routes have specific metadata, canonical URLs and working relative assets', () => {
  const html = fs.readFileSync(page('wedding-venues', 'nsw'), 'utf8');
  assert.match(html, /<title>Wedding Venues in New South Wales \| WedSparks<\/title>/);
  assert.ok(html.includes('venue.png'));
  assert.match(html, /<h1 class="marketplace-title">Wedding Venues<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/jr-digitalventures\.github\.io\/wedsparksverison1\/wedding-suppliers\/wedding-venues\/nsw\/"/);
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/wedding-suppliers\/supplier-category\.css\?v=49"/);
  assert.match(html, /src="\.\.\/\.\.\/\.\.\/wedding-suppliers\/supplier-routes\.js\?v=7"/);
});

test('every configured supplier category has a dedicated hero image', () => {
  routes.categories.forEach(category => assert.match(category.hero, /^https:\/\/vfdtyxcfrqnqdyuimtho\.supabase\.co\//));
  const entertainment = fs.readFileSync(page('wedding-entertainment'), 'utf8');
  assert.match(entertainment, /live%20entertainment\.png/);
});

test('supplier hero focal points frame people without cutting off their heads', () => {
  assert.equal(routes.categoryByValue('Cake').heroPosition, '75% 15%');
  assert.equal(routes.categoryByValue('Florist').heroPosition, '75% bottom');
  assert.equal(routes.categoryByValue('Transport').heroPosition, '75% center');
  assert.equal(routes.categoryByValue('Bar Service').heroFlip, true);
  assert.equal(routes.categoryByValue('Photographer').heroFlip, true);
  assert.equal(routes.categoryByValue('Videographer').heroFlip, true);
  assert.match(fs.readFileSync(page('wedding-florists'), 'utf8'), /--supplier-hero-position:75% bottom/);
  assert.match(fs.readFileSync(page('wedding-cakes'), 'utf8'), /--supplier-hero-position:75% 15%/);
  assert.match(fs.readFileSync(page('wedding-transport'), 'utf8'), /--supplier-hero-position:75% center/);
  assert.match(fs.readFileSync(page('bar-services'), 'utf8'), /supplier-hero-image--flipped/);
  assert.match(fs.readFileSync(page('bar-services'), 'utf8'), /transform:scaleX\(-1\)/);
});

test('location-only pages retain the generic supplier heading', () => {
  const statePage = fs.readFileSync(page('nsw'), 'utf8');
  const cityPage = fs.readFileSync(page('sydney-nsw'), 'utf8');
  assert.match(statePage, /<h1 class="marketplace-title">Find Wedding Suppliers<\/h1>/);
  assert.match(cityPage, /<h1 class="marketplace-title">Find Wedding Suppliers<\/h1>/);
});

test('sitemap contains all generated supplier routes', () => {
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  const locations = sitemap.match(/<loc>/g) || [];
  const expected = 1 + routes.categories.length + routes.states.length + routes.cities.length
    + routes.categories.length * (routes.states.length + routes.cities.length);
  assert.ok(locations.length >= expected);
  assert.match(sitemap, /wedding-suppliers\/wedding-celebrants\/melbourne-vic\//);
});

test('directory filter labels retain working Unicode price ranges',()=>{
 const html=fs.readFileSync(page(),'utf8');
 for(const price of ['$1,000–$2,500','$2,500–$5,000'])assert.ok(html.includes('>'+price+'</button>'));
 assert.ok(html.includes('public-photo-banner'));assert.ok(html.includes('public-discovery-intro'));
});
test('marketplace search is a working page with current account entry points',()=>{
 const html=fs.readFileSync(path.join(dist,'marketplace-search/index.html'),'utf8');
 assert.ok(html.includes('id="marketplace-search"'));assert.ok(html.includes('public-photo-banner'));
 assert.ok(html.includes('../signup/?experience=couple'));assert.ok(html.includes('../signup/?experience=supplier'));
 assert.ok(!html.includes('http-equiv="refresh"'));assert.ok(!html.includes('Card Label'));
});
