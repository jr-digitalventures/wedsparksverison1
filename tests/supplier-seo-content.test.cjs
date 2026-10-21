const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const supplierRoot = path.join(root, 'dist', 'wedding-suppliers');

function loadUmd(file) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module,
    exports: module.exports,
    globalThis: {}
  });
  return module.exports;
}

test('spreadsheet SEO content covers every category and main location combination', () => {
  const routes = loadUmd(path.join(supplierRoot, 'supplier-routes.js'));
  const content = loadUmd(path.join(supplierRoot, 'supplier-seo-content.js'));
  const defaultKey = 'All wedding suppliers + Any location / no category selected';

  assert.equal(Object.keys(content).length, 256);
  assert.equal(content[defaultKey].title, 'Bring Your Wedding Plans Together with the Right Suppliers');

  for (const category of routes.categories) {
    assert.ok(content[`${category.value} + No Location selected or Location selected that IS NOT state or main city`]);
    for (const location of [...routes.states, ...routes.cities]) {
      assert.ok(content[`${category.value} + ${location.abbreviation || location.label}`]);
    }
  }
});

test('generated pages use spreadsheet SEO content for the default and category-city routes', () => {
  const defaultPage = fs.readFileSync(path.join(supplierRoot, 'index.html'), 'utf8');
  const barSydneyPage = fs.readFileSync(path.join(supplierRoot, 'bar-services', 'sydney-nsw', 'index.html'), 'utf8');

  assert.match(defaultPage, /Bring Your Wedding Plans Together with the Right Suppliers/);
  assert.match(barSydneyPage, /Raise a Glass with Sydney Wedding Bar Services/);
});
