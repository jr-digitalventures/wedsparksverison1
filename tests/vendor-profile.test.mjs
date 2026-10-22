import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { vendor, couple, getVendorPreset } from '../dist/vendor-profile/data.js';
import { normaliseVendor, priceLabel, estimatePackage, budgetProjection, weddingMatches, availabilityOn, reviewStats, sortReviews, quickFacts, monthCells, shiftMonth, validateEnquiry } from '../dist/vendor-profile/model.js';
import { renderProfile } from '../dist/vendor-profile/view.js';

test('every category preset uses the same renderer with one H1 and a mandatory price', () => {
  for (const name of ['florist', 'venue', 'photographer', 'caterer']) {
    const v = normaliseVendor(getVendorPreset(name)), html = renderProfile(v, couple);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(v.name.replaceAll('&', '&amp;')));
    assert.ok(html.includes(priceLabel(v.pricing).replaceAll('&', '&amp;')));
    if (name !== 'florist') assert.ok(!html.includes('wedding floral minimum'));
  }
  assert.throws(() => normaliseVendor({ id: 'missing-price', name: 'No price' }));
});
test('unit pricing, fixed pricing, starting estimates and custom quotes calculate correctly', () => {
  assert.equal(estimatePackage({ price: 115, pricingType: 'per_person' }, { quantity: 100 }).amount, 11500);
  assert.equal(estimatePackage({ price: 9, pricingType: 'per_item' }, { quantity: 80 }).amount, 720);
  assert.equal(estimatePackage({ price: 8500, pricingType: 'fixed' }).isEstimate, false);
  assert.equal(estimatePackage({ price: 3500, pricingType: 'starting' }).isEstimate, true);
  assert.equal(estimatePackage({ pricingType: 'custom_quote' }, { manual: 4600 }).amount, 4600);
  assert.equal(estimatePackage({ pricingType: 'custom_quote' }, { manual: '' }).amount, null);
  assert.equal(estimatePackage({ price: 115, pricingType: 'per_person', minQuantity: 40 }, { quantity: 25 }).amount, null);
  assert.equal(estimatePackage({ price: 10, pricingType: 'per_item' }, { quantity: 2.5 }).amount, null);
  assert.deepEqual(budgetProjection({ allocated: 4000, committed: 250, additions: 500, estimate: 3500 }), { remaining: -250, over: 250, total: 4250 });
  for (const [type, expected] of [['minimum_spend', 'Minimum spend $1,500'], ['per_person', 'From $1,500 / guest'], ['per_item', 'From $1,500 / item'], ['per_service', 'From $1,500 / service']]) assert.equal(priceLabel({ startingPrice: 1500, startingPriceType: type }), expected);
});
test('matching is transparent, handles quantity prices and never treats unknown dates as available', () => {
  const v = normaliseVendor(vendor), matches = weddingMatches(v, couple);
  assert.equal(matches.find(m => m.icon === 'pin').state, 'match');
  assert.equal(matches.find(m => m.icon === 'calendar').state, 'unknown');
  assert.equal(weddingMatches(v, { isLoggedIn: false }).length, 0);
  assert.equal(weddingMatches(v, { isLoggedIn: true }).length, 0);
  const caterer = normaliseVendor(getVendorPreset('caterer'));
  const c = structuredClone(couple); c.wedding.categoryBudgets.Catering = 10000;
  assert.equal(weddingMatches(caterer, c).find(m => m.icon === 'wallet').state, 'no');
  v.availability.mode = 'live'; assert.equal(availabilityOn(v, '2027-10-16'), 'available'); assert.equal(availabilityOn(v, '2027-10-17'), 'unavailable'); assert.equal(availabilityOn(v, '2027-10-18'), 'blackout'); assert.equal(availabilityOn(v, '2027-10-19'), 'unknown');
  v.availability.mode = 'unpublished'; assert.equal(availabilityOn(v, '2027-10-16'), 'unknown');
});
test('optional empty sections stay absent, and quick facts exclude irrelevant categories', () => {
  const v = normaliseVendor(getVendorPreset('photographer')), html = renderProfile(v, couple);
  assert.ok(!html.includes('id="faqs"')); assert.ok(!html.includes('id="portfolio"'));
  assert.ok(html.includes('No reviews published yet')); assert.ok(!html.includes('sample reviews'));
  assert.ok(html.includes('does not publish a calendar')); assert.ok(html.includes('rather than publishing set packages'));
  v.categoryDetails.guestCapacity = 200;
  assert.ok(!quickFacts(v).some(f => f.key === 'guestCapacity'));
  const loggedOut = renderProfile(normaliseVendor(vendor), { ...couple, isLoggedIn: false });
  assert.ok(!loggedOut.includes('Works in Bowral')); assert.ok(loggedOut.includes('Explore with sample wedding details'));
  const minimal = normaliseVendor({ id: 'minimal', name: 'A minimal profile', category: 'Celebrant', pricing: { startingPrice: 500 }, media: { gallery: null, videos: null }, availability: { dates: null } });
  assert.doesNotThrow(() => renderProfile(minimal, { isLoggedIn: false }));
});
test('review totals and sorting are derived from the actual supplied sample reviews', () => {
  assert.deepEqual(reviewStats([]), { count: 0, average: null });
  assert.equal(reviewStats(vendor.reviews).average, 4.8);
  assert.equal(sortReviews(vendor.reviews, 'lowest')[0].rating, 4);
  assert.equal(sortReviews(vendor.reviews)[0].id, 'r1');
});
test('calendar handles leap months and year boundaries', () => {
  assert.equal(monthCells('2028-02').filter(Boolean).length, 29);
  assert.equal(monthCells('2027-02').filter(Boolean).length, 28);
  assert.equal(shiftMonth('2027-12', 1), '2028-01'); assert.equal(shiftMonth('2027-01', -1), '2026-12');
});
test('enquiry validation enforces contextual information without requiring irrelevant fields', () => {
  const d = { type: 'general', name: 'Alex', email: 'alex@example.test', message: 'We would love to hear about your services.' };
  assert.deepEqual(validateEnquiry(d), {});
  assert.deepEqual(Object.keys(validateEnquiry({ ...d, type: 'availability' })).sort(), ['date', 'location']);
  assert.ok(validateEnquiry({ ...d, email: 'bad' }).email);
  assert.ok(validateEnquiry({ ...d, message: 'short' }).message);
  assert.ok(validateEnquiry({ ...d, type: 'consultation' }).consultationDate);
  assert.ok(validateEnquiry({ ...d, type: 'package' }).packageId);
  assert.ok(validateEnquiry({ ...d, guestCount: '-1' }).guestCount);
});
test('generated document contains static content, usable local media and no fictional rating schema or backend imports', () => {
  const html = fs.readFileSync('dist/vendor-profile/index.html', 'utf8');
  assert.ok(html.includes('noindex,follow')); assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes('Bloom &amp; Co. Florals')); assert.ok(!html.includes('aggregateRating'));
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|data:|#)/.test(match[1])) continue;
    const local = match[1].split(/[?#]/)[0]; assert.ok(fs.existsSync(path.resolve('dist/vendor-profile', local)), `Missing ${local}`);
  }
  for (const file of ['vendor-profile.js', 'view.js', 'data.js', 'model.js']) {
    const source = fs.readFileSync('dist/vendor-profile/' + file, 'utf8');
    assert.ok(!/supabase-client|createClient\(|fetch\(/.test(source), 'Prototype does not connect to a backend');
  }
});
