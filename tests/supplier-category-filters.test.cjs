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
  nodes = new Map();
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  cloneNode() { return new Element(); }
  addEventListener() {}
  scrollIntoView() {}
  setAttribute(name, value) { this.attributes[name] = value; }
  replaceChildren(...children) { this.children = children; }
  append(child) { this.children.push(child); }
}

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

function supplier(name, overrides = {}) {
  return {
    id: name,
    'Name of Wedding Vendor': name,
    'Wedding Vendor Type': 'Transport',
    Location: 'Adelaide, SA',
    'Highlighted Record': true,
    'Starting Price': 1500,
    'Vendor Style': 'Classic, Modern',
    'Dates Available': '2026-10-20, 21/10/2026',
    ...overrides,
  };
}

const defaultRows = () => [
  supplier('Adelaide Transport'),
  supplier('Second Adelaide Transport'),
  supplier('Sydney Venue', { 'Wedding Vendor Type': 'Venue', Location: 'Sydney, NSW' }),
  supplier('Regular Adelaide Venue', { 'Wedding Vendor Type': 'Venue', 'Highlighted Record': false }),
];

function page({ rows = defaultRows(), random = 0, session = storage() } = {}) {
  const elements = new Map();
  const element = key => {
    if (!elements.has(key)) elements.set(key, new Element());
    return elements.get(key);
  };
  const context = vm.createContext({
    URL, URLSearchParams, console,
    Math: Object.assign(Object.create(Math), { random: () => typeof random === 'function' ? random() : random }),
    sessionStorage: session,
    fixtureRows: rows,
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
    carousel = () => {};
    makeCard = r => r;
    state.rows = fixtureRows;
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
      return card.hidden ? null : card.querySelector('.supplier-card-titleline h2').textContent;
    },
    bullets() {
      return element('.featured-supplier-card').querySelector('.supplier-features').children.map(span => span.children[0].textContent);
    },
    results() { return element('.supplier-results-list').children; },
    count() { return element('#supplier-results-title>span:first-child').textContent; },
    pageLabels() { return element('.supplier-pagination').children.map(b => b.attributes['aria-label']).filter(label => /^Page /.test(label)); },
    goToPage(number) {
      const button = element('.supplier-pagination').children.find(b => b.attributes['aria-label'] === `Page ${number}`);
      assert.ok(button, `Missing page ${number}`);
      button.onclick();
    },
    update(filters) {
      context.newFilters = filters;
      vm.runInContext('Object.assign(state, newFilters); render();', context);
    },
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

test('category-only searches choose a highlight and keep the others as results', () => {
  const p = page();
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Adelaide Transport');
  assert.equal(p.results().length, 1);
  assert.equal(p.results()[0]['Name of Wedding Vendor'], 'Second Adelaide Transport');
});

test('location alone hides the highlight and retains every matching result', () => {
  const p = page();
  p.select('heading-location-options', 'Adelaide, SA');
  assert.equal(p.highlight(), null);
  assert.equal(p.results().length, 3);
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
  assert.equal(p.highlight(), null);
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

test('lowest numeric priority wins regardless of row order or random value', () => {
  const p = page({ random: .99, rows: [
    supplier('Priority 10', { 'Featured Priority': '10' }),
    supplier('Priority 2', { 'Featured Priority': '2' }),
    supplier('Priority 3', { 'Featured Priority': 3 }),
    supplier('Not highlighted', { 'Featured Priority': 1, 'Highlighted Record': false }),
  ] });
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Priority 2');
  assert.equal(p.results().length, 3);
});

test('missing, blank and invalid priorities default to 10', () => {
  for (const priority of [undefined, null, '', '  ', 'invalid']) {
    const p = page({ random: .99, rows: [
      supplier('Default priority', { 'Featured Priority': priority }),
      supplier('Priority 11', { 'Featured Priority': 11 }),
    ] });
    p.select('heading-category-options', 'Transport');
    assert.equal(p.highlight(), 'Default priority');
  }
});

test('ties rotate between visitors and persist across refresh, row reorder and returning searches', () => {
  const session = storage();
  const first = page({ random: .99, session });
  first.select('heading-category-options', 'Transport');
  assert.equal(first.highlight(), 'Second Adelaide Transport');
  first.select('heading-category-options', 'Venue');
  first.select('heading-category-options', 'Transport');
  assert.equal(first.highlight(), 'Second Adelaide Transport');
  const refreshed = page({ random: 0, session, rows: defaultRows().reverse() });
  refreshed.select('heading-category-options', 'Transport');
  assert.equal(refreshed.highlight(), 'Second Adelaide Transport');
  const anotherVisit = page({ random: 0 });
  anotherVisit.select('heading-category-options', 'Transport');
  assert.equal(anotherVisit.highlight(), 'Adelaide Transport');
});

test('remembered choices are revalidated when a priority or eligibility changes', () => {
  const session = storage();
  const rows = [supplier('A', { 'Featured Priority': 1 }), supplier('B', { 'Featured Priority': 2 })];
  const first = page({ session, rows });
  first.select('heading-category-options', 'Transport');
  assert.equal(first.highlight(), 'A');
  rows[1]['Featured Priority'] = 0;
  const updated = page({ session, rows });
  updated.select('heading-category-options', 'Transport');
  assert.equal(updated.highlight(), 'B');
  rows[1]['Highlighted Record'] = false;
  const disabled = page({ session, rows });
  disabled.select('heading-category-options', 'Transport');
  assert.equal(disabled.highlight(), 'A');
});

test('all active price, style and date filters apply before ranking', () => {
  const p = page({ rows: [
    supplier('Expensive', { 'Featured Priority': 1, 'Starting Price': 7000 }),
    supplier('Wrong style', { 'Featured Priority': 2, 'Starting Price': 500, 'Vendor Style': 'Rustic' }),
    supplier('Unavailable', { 'Featured Priority': 3, 'Starting Price': 500, 'Dates Available': '2026-12-01' }),
    supplier('Matching', { 'Featured Priority': 4, 'Starting Price': 500 }),
  ] });
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Expensive');
  p.update({ price: 'Under $1,000' });
  assert.equal(p.highlight(), 'Wrong style');
  p.select('supplier-style-options', 'Classic');
  assert.equal(p.highlight(), 'Unavailable');
  p.update({ date: '2026-10-21' });
  assert.equal(p.highlight(), 'Matching');
  p.update({ date: '2027-01-01' });
  assert.equal(p.highlight(), null);
  p.update({ price: '', style: '', date: '' });
  assert.equal(p.highlight(), 'Expensive');
});

test('page one shows the highlight; all pages keep 15 results and exclude that one supplier', () => {
  const rows = Array.from({ length: 33 }, (_, i) => supplier(`Supplier ${i}`));
  const p = page({ rows, random: 0 });
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Supplier 0');
  const seen = [...p.results()];
  assert.equal(seen.length, 15);
  assert.deepEqual(p.pageLabels(), ['Page 1', 'Page 2', 'Page 3']);
  p.goToPage(2);
  assert.equal(p.highlight(), null);
  assert.equal(p.results().length, 15);
  seen.push(...p.results());
  p.goToPage(3);
  assert.equal(p.highlight(), null);
  assert.deepEqual(p.pageLabels(), ['Page 1', 'Page 2', 'Page 3']);
  assert.equal(p.results().length, 2);
  seen.push(...p.results());
  assert.equal(new Set(seen.map(r => r.id)).size, 32);
  assert.ok(seen.every(r => r.id !== 'Supplier 0'));
  p.goToPage(1);
  assert.equal(p.highlight(), 'Supplier 0');
  assert.equal(p.results()[0].id, 'Supplier 1');
  assert.equal(p.count(), 33);
});

test('a featured-only match does not display a false no-results message', () => {
  const p = page({ rows: [supplier('Only supplier')] });
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Only supplier');
  assert.equal(p.results().length, 0);
  assert.equal(p.count(), 1);
});

test('highlight text uses all six exact feature columns and the 30-character limit', () => {
  const bullets = ['Chauffeur service', 'Ribbon styling', 'Vehicle options', 'Guest shuttles', 'Pickup planning', 'Late-night transfers'];
  const row = supplier('Highlighted supplier', Object.fromEntries(bullets.map((text, i) => [`Highlighted Feature #${i + 1}`, text])));
  const p = page({ rows: [row] });
  p.select('heading-category-options', 'Transport');
  assert.deepEqual(p.bullets(), bullets);
  row['Highlighted Feature #1'] = 'A very long highlighted feature that must be shortened';
  const longer = page({ rows: [row] });
  longer.select('heading-category-options', 'Transport');
  assert.ok(longer.bullets()[0].length <= 30);
  assert.ok(longer.bullets()[0].endsWith('...'));
});

test('disabled session storage still allows a stable in-memory choice', () => {
  let calls = 0;
  const p = page({ random: () => calls++ ? 0 : .99, session: { getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } } });
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Second Adelaide Transport');
  p.select('heading-category-options', 'Venue');
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Second Adelaide Transport');
});
