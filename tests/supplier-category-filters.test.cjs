const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the page's actual dropdown callbacks and render selection without a network request.
class Element {
  children = [];
  attributes = {};
  hidden = false;
  classList = { toggle() {} };
  querySelector() { return new Element(); }
  cloneNode() { return new Element(); }
  addEventListener() {}
  setAttribute(name, value) { this.attributes[name] = value; }
  replaceChildren(...children) { this.children = children; }
  append(child) { this.children.push(child); }
}

function page() {
  const elements = new Map();
  const element = key => {
    if (!elements.has(key)) elements.set(key, new Element());
    return elements.get(key);
  };
  const context = vm.createContext({
    URL, URLSearchParams, console,
    location: { href: 'http://localhost/supplier-category/', search: '' },
    document: {
      querySelector: element,
      querySelectorAll: () => [],
      getElementById: id => element(`#${id}`),
      createElement: () => new Element(),
      addEventListener() {},
    },
  });
  const source = readFileSync(join(__dirname, '../dist/supplier-category/supplier-category.js'), 'utf8');
  vm.runInContext(source.replace(/load\(\);\s*$/, ''), context);
  vm.runInContext(`
    fillFeatured = r => { featured.hidden = false; featured.record = r; };
    makeCard = r => r;
    state.rows = [
      {'Name of Wedding Vendor':'Adelaide Transport','Wedding Vendor Type':'Transport','Location':'Adelaide, SA','Highlighted Record':true,'Vendor Style':'Classic, Modern'},
      {'Name of Wedding Vendor':'Second Adelaide Transport','Wedding Vendor Type':'Transport','Location':'Adelaide, SA','Highlighted Record':true},
      {'Name of Wedding Vendor':'Sydney Venue','Wedding Vendor Type':'Venue','Location':'Sydney, NSW','Highlighted Record':true},
      {'Name of Wedding Vendor':'Regular Adelaide Venue','Wedding Vendor Type':'Venue','Location':'Adelaide, SA','Highlighted Record':false}
    ];
    setupMenus();
    render();
  `, context);
  return {
    options(id) { return element(`#${id}`).children.map(b => b.textContent); },
    select(id, text) {
      const button = element(`#${id}`).children.find(b => b.textContent === text);
      assert.ok(button, `Missing dropdown option: ${text}`);
      button.onclick();
    },
    highlight() {
      const card = element('.featured-supplier-card');
      return card.hidden ? null : card.record['Name of Wedding Vendor'];
    },
    results() { return element('.supplier-results-list').children; },
    selectedLocation() { return vm.runInContext('state.location', context); },
    query(search) {
      context.location.search = search;
      vm.runInContext('initialQuery(); render();', context);
    },
  };
}

test('locations retain city and state; only styles split comma-separated values', () => {
  const p = page();
  assert.deepEqual(p.options('heading-location-options'), ['All locations', 'Adelaide, SA', 'Sydney, NSW']);
  assert.deepEqual(p.options('supplier-style-options'), ['Any style', 'Classic', 'Modern']);
});

test('no category or location keeps the featured card hidden', () => {
  assert.equal(page().highlight(), null);
});

test('Transport alone selects the first highlighted Transport record', () => {
  const p = page();
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Adelaide Transport');
  assert.equal(p.results().length, 1);
  assert.equal(p.results()[0]['Name of Wedding Vendor'], 'Second Adelaide Transport');
});

test('location alone selects its first highlighted record', () => {
  const p = page();
  p.select('heading-location-options', 'Adelaide, SA');
  assert.equal(p.highlight(), 'Adelaide Transport');
});

test('both selected criteria must match; clearing them restores the correct highlight', () => {
  const p = page();
  p.select('heading-category-options', 'Transport');
  p.select('heading-location-options', 'Adelaide, SA');
  assert.equal(p.highlight(), 'Adelaide Transport');
  p.select('heading-location-options', 'Sydney, NSW');
  assert.equal(p.highlight(), null);
  p.select('heading-category-options', 'Venue');
  assert.equal(p.highlight(), 'Sydney Venue');
  p.select('heading-location-options', 'Adelaide, SA');
  assert.equal(p.highlight(), null);
  p.select('heading-category-options', 'All wedding categories');
  assert.equal(p.highlight(), 'Adelaide Transport');
  p.select('heading-location-options', 'All locations');
  assert.equal(p.highlight(), null);
});

test('category and full location URL parameters select the highlight', () => {
  const p = page();
  p.query('?category=Transport&location=Adelaide%2C%20SA');
  assert.equal(p.selectedLocation(), 'Adelaide, SA');
  assert.equal(p.highlight(), 'Adelaide Transport');
  assert.equal(p.results().length, 1);
});
