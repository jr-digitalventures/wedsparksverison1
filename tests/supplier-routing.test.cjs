const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const routes = require('../dist/supplier-category/supplier-routes.js');

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
  assert.match(html, /<h1 class="marketplace-title">Wedding Venues<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/jr-digitalventures\.github\.io\/wedsparksverison1\/wedding-suppliers\/wedding-venues\/nsw\/"/);
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/supplier-category\/supplier-category\.css\?v=43"/);
  assert.match(html, /src="\.\.\/\.\.\/\.\.\/supplier-category\/supplier-routes\.js\?v=1"/);
  assert.match(html, /--supplier-hero-image:url\('https:\/\/vfdtyxcfrqnqdyuimtho\.supabase\.co\/storage\/v1\/object\/public\/Misc%20Website%20Pictures\/venue\.png'\)/);
  assert.match(html, /background-image:linear-gradient\(180deg,rgba\(9,24,20,\.2\),rgba\(9,24,20,\.08\)\),url\('https:\/\/vfdtyxcfrqnqdyuimtho\.supabase\.co\/storage\/v1\/object\/public\/Misc%20Website%20Pictures\/venue\.png'\)/);
});

test('every configured supplier category has a dedicated hero image', () => {
  routes.categories.forEach(category => assert.match(category.hero, /^https:\/\/vfdtyxcfrqnqdyuimtho\.supabase\.co\//));
  const entertainment = fs.readFileSync(page('wedding-entertainment'), 'utf8');
  assert.match(entertainment, /live%20entertainment\.png/);
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
  assert.equal(locations.length, expected);
  assert.match(sitemap, /wedding-suppliers\/wedding-celebrants\/melbourne-vic\//);
});
