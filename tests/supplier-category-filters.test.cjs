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
  classList = { toggle() {}, add() {}, remove() {} };
  listeners = {};
  nodes = new Map();
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  querySelectorAll(selector) {
    const className = selector.startsWith('.') ? selector.slice(1) : '';
    const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
    return descendants(this).filter(node => !className || String(node.className || '').split(/\s+/).includes(className));
  }
  cloneNode() { return new Element(); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  scrollIntoView() {}
  focus() {}
  closest() { return new Element(); }
  style = { setProperty() {} };
  getBoundingClientRect() { return { left: 100, right: 860 }; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
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
    'Location - State': 'South Australia',
    'Location - Suburb/City': 'Adelaide',
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
  supplier('Sydney Venue', { 'Wedding Vendor Type': 'Venue', Location: 'Sydney, NSW', 'Location - State': 'New South Wales', 'Location - Suburb/City': 'Sydney' }),
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
    window: { innerWidth: 1440, addEventListener() {}, matchMedia: () => ({ matches: false }) },
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
  const descendants = node => [node, ...node.children.flatMap(descendants)];
  const locationNodes = () => descendants(element('#heading-location-options'));
  const hasClass = (node, name) => String(node.className || '').split(/\s+/).includes(name);
  const stateButton = region => locationNodes().find(node => hasClass(node, 'supplier-location-state') && node.attributes['data-location-state'] === region);
  return {
    options(id) {
      if (id === 'heading-location-options') return locationNodes().filter(node => hasClass(node, 'supplier-location-state')).map(node => node.textContent);
      return element(`#${id}`).children.map(b => b.textContent);
    },
    cities(region) {
      context.regionName = region;
      vm.runInContext('locationUI.active = regionName; drawLocationMenu();', context);
      return locationNodes().filter(node => node.attributes['data-location-city']).map(node => node.textContent);
    },
    locationPane() { return element('#heading-location-options').attributes['data-pane']; },
    locationAction(name) {
      const button = locationNodes().find(node => node.textContent === name);
      assert.ok(button); button.onclick();
    },
    selectLocation(region = '', city = '') {
      if (city) stateButton(region).onclick();
      const button = city ? locationNodes().find(node => node.attributes['data-location-state'] === region && node.attributes['data-location-city'] === city) : stateButton(region);
      assert.ok(button, `Missing location: ${region} / ${city}`);
      button.onclick();
    },
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
    selectedLocation() {
      return { state: vm.runInContext('state.locationState', context), city: vm.runInContext('state.locationCity', context) };
    },
    locationLabel() {
      return element('[data-heading-filter="heading-location-options"]').querySelector('span').textContent;
    },
    displayedLocation() { return element('.featured-supplier-card').querySelector('.supplier-location span').textContent; },
    categoryFilterConfig() { return JSON.parse(vm.runInContext('JSON.stringify(categoryFilters)', context)); },
    categoryFilterDefinitions() {
      const inner = element('#supplier-category-extra-filters').querySelector('.supplier-category-extra-inner');
      return inner.children.map(wrapper => ({
        label: wrapper.attributes['data-category-filter-label'],
        options: wrapper.children[1].children.map(option => option.textContent),
      }));
    },
    openMoreFilters() {
      element('.supplier-more-filters-trigger').listeners.click({ stopPropagation() {} });
    },
    extraFiltersOpen() { return vm.runInContext('extraFiltersOpen', context); },
    moreFiltersHidden() { return vm.runInContext('moreFiltersWrapper.hidden', context); },
    selectCategoryFilter(label, option) {
      const inner = element('#supplier-category-extra-filters').querySelector('.supplier-category-extra-inner');
      const wrapper = inner.children.find(child => child.attributes['data-category-filter-label'] === label);
      assert.ok(wrapper, `Missing category filter: ${label}`);
      const optionButton = wrapper.children[1].children.find(child => child.textContent === option);
      assert.ok(optionButton, `Missing category option: ${option}`);
      optionButton.onclick({ stopPropagation() {} });
    },
    query(search) {
      context.location.search = search;
      vm.runInContext('initialQuery(); render();', context);
    },
  };
}

test('locations group deduplicated cities within states; only styles split at commas', () => {
  const p = page();
  assert.deepEqual(p.options('heading-location-options'), ['All locations', 'New South Wales', 'South Australia']);
  assert.deepEqual(p.cities('South Australia'), ['Adelaide']);
  assert.deepEqual(p.cities('New South Wales'), ['Sydney']);
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
  p.selectLocation('South Australia', 'Adelaide');
  assert.equal(p.highlight(), null);
  assert.equal(p.results().length, 3);
});

test('both selected criteria must match; clearing them restores the correct highlight', () => {
  const p = page();
  p.select('heading-category-options', 'Transport');
  p.selectLocation('South Australia', 'Adelaide');
  assert.equal(p.highlight(), 'Adelaide Transport');
  p.selectLocation('New South Wales', 'Sydney');
  assert.equal(p.highlight(), null);
  p.select('heading-category-options', 'Venue');
  assert.equal(p.highlight(), 'Sydney Venue');
  p.selectLocation('South Australia', 'Adelaide');
  assert.equal(p.highlight(), null);
  p.select('heading-category-options', 'All wedding categories');
  assert.equal(p.highlight(), null);
  p.selectLocation();
  assert.equal(p.highlight(), null);
});

test('category and full location URL parameters select the highlight', () => {
  const p = page();
  p.query('?category=Transport&location=Adelaide%2C%20SA');
  assert.deepEqual(p.selectedLocation(), { state: 'South Australia', city: 'Adelaide' });
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

test('state selection uses only the structured state and includes every city in it', () => {
  const p = page({ rows: [
    supplier('Adelaide', { Location: 'A custom display address' }),
    supplier('Glenelg', { 'Location - Suburb/City': 'Glenelg' }),
    supplier('Statewide', { 'Location - Suburb/City': '' }),
    supplier('Victoria', { Location: 'Adelaide, South Australia', 'Location - State': 'Victoria' }),
  ] });
  p.selectLocation('South Australia');
  assert.deepEqual(p.results().map(row => row.id), ['Adelaide', 'Glenelg', 'Statewide']);
  assert.equal(p.highlight(), null);
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Adelaide');
  assert.equal(p.displayedLocation(), 'A custom display address');
});

test('state/city values are trimmed and deduplicated without using display text', () => {
  const p = page({ rows: [
    supplier('A'),
    supplier('B', { 'Location - State': ' south australia ', 'Location - Suburb/City': ' adelaide ' }),
    supplier('C', { 'Location - Suburb/City': 'Glenelg' }),
    supplier('D', { 'Location - State': '', 'Location - Suburb/City': 'Display only' }),
  ] });
  assert.deepEqual(p.options('heading-location-options'), ['All locations', 'South Australia']);
  assert.deepEqual(p.cities('South Australia'), ['Adelaide', 'Glenelg']);
  p.selectLocation('South Australia', 'Adelaide');
  assert.deepEqual(p.results().map(row => row.id), ['A', 'B']);
});

test('identically named cities in different states never match each other', () => {
  const p = page({ rows: [
    supplier('Richmond VIC', { 'Location - State': 'Victoria', 'Location - Suburb/City': 'Richmond' }),
    supplier('Richmond NSW', { 'Location - State': 'New South Wales', 'Location - Suburb/City': 'Richmond' }),
    supplier('Mosman NSW', { 'Location - State': 'New South Wales', 'Location - Suburb/City': 'Mosman' }),
  ] });
  p.selectLocation('New South Wales', 'Richmond');
  assert.deepEqual(p.results().map(row => row.id), ['Richmond NSW']);
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Richmond NSW');
  p.selectLocation('Victoria', 'Richmond');
  assert.equal(p.highlight(), 'Richmond VIC');
});

test('state drill-down applies the state; Back preserves it and changing state clears the city', () => {
  const p = page();
  p.selectLocation('South Australia');
  assert.equal(p.locationPane(), 'locations');
  assert.deepEqual(p.selectedLocation(), { state: 'South Australia', city: '' });
  assert.equal(p.count(), 3);
  p.locationAction('← Back');
  assert.equal(p.locationPane(), 'states');
  assert.deepEqual(p.selectedLocation(), { state: 'South Australia', city: '' });
  p.selectLocation('South Australia', 'Adelaide');
  p.selectLocation('New South Wales');
  assert.deepEqual(p.selectedLocation(), { state: 'New South Wales', city: '' });
  assert.deepEqual(p.results().map(row => row.id), ['Sydney Venue']);
  p.selectLocation();
  assert.deepEqual(p.selectedLocation(), { state: '', city: '' });
  assert.equal(p.count(), 4);
});

test('state and city selection reset pagination to page one', () => {
  const p = page({ rows: Array.from({ length: 32 }, (_, i) => supplier(`Supplier ${i}`)) });
  p.select('heading-category-options', 'Transport');
  p.goToPage(2);
  assert.equal(p.highlight(), null);
  p.selectLocation('South Australia');
  assert.equal(p.highlight(), 'Supplier 0');
  p.goToPage(2);
  p.selectLocation('South Australia', 'Adelaide');
  assert.equal(p.highlight(), 'Supplier 0');
  assert.equal(p.results()[0].id, 'Supplier 1');
});

test('state-only and state/city URL parameters use the structured columns', () => {
  const rows = [supplier('A'), supplier('G', { 'Location - Suburb/City': 'Glenelg' })];
  const statewide = page({ rows });
  statewide.query('?state=South%20Australia');
  assert.deepEqual(statewide.selectedLocation(), { state: 'South Australia', city: '' });
  assert.equal(statewide.count(), 2);
  assert.equal(statewide.highlight(), null);
  const city = page({ rows });
  city.query('?category=Transport&state=SA&city=Glenelg');
  assert.deepEqual(city.selectedLocation(), { state: 'South Australia', city: 'Glenelg' });
  assert.equal(city.highlight(), 'G');
});

test('statewide and city searches remember separate eligible priority winners', () => {
  const session = storage();
  const rows = [
    supplier('Adelaide', { 'Featured Priority': 2 }),
    supplier('Glenelg', { 'Featured Priority': 1, 'Location - Suburb/City': 'Glenelg' }),
    supplier('Sydney', { 'Featured Priority': 0, 'Location - State': 'New South Wales', 'Location - Suburb/City': 'Sydney' }),
  ];
  const p = page({ rows, session });
  p.select('heading-category-options', 'Transport');
  assert.equal(p.highlight(), 'Sydney');
  p.selectLocation('South Australia');
  assert.equal(p.highlight(), 'Glenelg');
  p.selectLocation('South Australia', 'Adelaide');
  assert.equal(p.highlight(), 'Adelaide');
  p.selectLocation('South Australia');
  assert.equal(p.highlight(), 'Glenelg');
});

test('All closes the menu, clears only the city and retains the selected state', () => {
  const p = page();
  p.selectLocation('South Australia', 'Adelaide');
  p.locationAction('All');
  assert.deepEqual(p.selectedLocation(), { state: 'South Australia', city: '' });
  assert.equal(p.locationLabel(), 'SA');
  p.selectLocation();
  assert.deepEqual(p.selectedLocation(), { state: '', city: '' });
  assert.equal(p.locationLabel(), 'Australia');
  assert.equal(p.count(), 4);
});

test('selected location heading uses state and territory abbreviations', () => {
  const rows = [
    supplier('ACT supplier', { 'Location - State': 'Australian Capital Territory', 'Location - Suburb/City': 'Civic' }),
    supplier('NSW supplier', { 'Location - State': 'New South Wales', 'Location - Suburb/City': 'Sydney' }),
  ];
  const p = page({ rows });
  p.selectLocation('Australian Capital Territory');
  assert.equal(p.locationLabel(), 'ACT');
  p.selectLocation('Australian Capital Territory', 'Civic');
  assert.equal(p.locationLabel(), 'Civic, ACT');
  p.selectLocation('New South Wales');
  assert.equal(p.locationLabel(), 'NSW');
});

test('category-specific More Filters are config-driven and remain presentation-only', () => {
  const rows = [
    supplier('Photographer', { 'Wedding Vendor Type': 'Photographer' }),
    supplier('Venue', { 'Wedding Vendor Type': 'Venue' }),
  ];
  const p = page({ rows });
  assert.equal(p.moreFiltersHidden(), true);
  const config = p.categoryFilterConfig();
  assert.equal(Object.keys(config).length, 15);
  assert.deepEqual(config.photographer.map(filter => filter.label), ['Photography Style', 'Coverage']);
  assert.deepEqual(config.venue[2], { label: 'Ceremony On-site', options: ['Yes', 'No'] });

  p.select('heading-category-options', 'Photographer');
  assert.equal(p.moreFiltersHidden(), false);
  assert.deepEqual(p.categoryFilterDefinitions(), [
    { label: 'Photography Style', options: ['Documentary', 'Editorial', 'Traditional', 'Fine art', 'Mixed'] },
    { label: 'Coverage', options: ['Up to 4 hours', '4–8 hours', '8+ hours'] },
  ]);
  p.openMoreFilters();
  assert.equal(p.extraFiltersOpen(), true);
  const resultsBefore = p.results().map(row => row.id);
  p.selectCategoryFilter('Photography Style', 'Editorial');
  assert.deepEqual(p.results().map(row => row.id), resultsBefore);

  p.select('heading-category-options', 'Venue');
  assert.equal(p.extraFiltersOpen(), true);
  assert.deepEqual(p.categoryFilterDefinitions().map(filter => filter.label), ['Venue Type', 'Guest Capacity', 'Ceremony On-site']);
});
