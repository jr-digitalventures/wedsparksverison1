(function (root, factory) {
  const routes = factory();
  if (typeof module === 'object' && module.exports) module.exports = routes;
  else root.WEDSPARKS_SUPPLIER_ROUTES = routes;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const imageRoot = 'https://vfdtyxcfrqnqdyuimtho.supabase.co/storage/v1/object/public/Misc%20Website%20Pictures/';
  const hero = name => `${imageRoot}${encodeURIComponent(name)}.png`;
  const mainHero = hero('Garden Wedding Through the Foliage');
  const mainHeroPosition = 'center top';
  const categories = [
    { value: 'Bar Service', slug: 'bar-services', label: 'Bar Services', hero: hero('bar service'), heroPosition: '75% 58%' },
    { value: 'Cake', slug: 'wedding-cakes', label: 'Wedding Cakes', hero: hero('cake'), heroPosition: '75% 58%' },
    { value: 'Catering', slug: 'wedding-caterers', label: 'Wedding Caterers', hero: hero('catering'), heroPosition: '75% 58%' },
    { value: 'Celebrant', slug: 'wedding-celebrants', label: 'Wedding Celebrants', hero: hero('celebrant'), heroPosition: '75% 58%' },
    { value: 'Florist', slug: 'wedding-florists', label: 'Wedding Florists', hero: hero('florist'), heroPosition: '75% 72%' },
    { value: 'Hair Stylist', slug: 'wedding-hair-stylists', label: 'Wedding Hair Stylists', hero: hero('hair stylist'), heroPosition: '75% 58%' },
    { value: 'Hireage', slug: 'wedding-hire', label: 'Wedding Hire', hero: hero('hireage'), heroPosition: '75% 58%' },
    { value: 'Live Entertainment', slug: 'wedding-entertainment', label: 'Wedding Entertainment', hero: hero('live entertainment'), heroPosition: '75% 58%' },
    { value: 'Make-up', slug: 'wedding-makeup-artists', label: 'Wedding Makeup Artists', hero: hero('makeup'), heroPosition: '75% 58%' },
    { value: 'Photographer', slug: 'wedding-photographers', label: 'Wedding Photographers', hero: hero('photographer'), heroPosition: '75% 58%' },
    { value: 'Stationary', slug: 'wedding-stationery', label: 'Wedding Stationery', hero: hero('stationary'), heroPosition: '75% 58%' },
    { value: 'Transport', slug: 'wedding-transport', label: 'Wedding Transport', hero: hero('transport'), heroPosition: '75% 58%' },
    { value: 'Venue', slug: 'wedding-venues', label: 'Wedding Venues', hero: hero('venue'), heroPosition: '75% 58%' },
    { value: 'Videographer', slug: 'wedding-videographers', label: 'Wedding Videographers', hero: hero('videographer'), heroPosition: '75% 58%' },
    { value: 'Wedding Dress', slug: 'wedding-dresses', label: 'Wedding Dresses', hero: hero('wedding dress'), heroPosition: '75% 58%' },
  ];
  const states = [
    { value: 'New South Wales', slug: 'nsw', abbreviation: 'NSW' },
    { value: 'Victoria', slug: 'vic', abbreviation: 'VIC' },
    { value: 'Queensland', slug: 'qld', abbreviation: 'QLD' },
    { value: 'Western Australia', slug: 'wa', abbreviation: 'WA' },
    { value: 'South Australia', slug: 'sa', abbreviation: 'SA' },
    { value: 'Tasmania', slug: 'tas', abbreviation: 'TAS' },
    { value: 'Australian Capital Territory', slug: 'act', abbreviation: 'ACT' },
    { value: 'Northern Territory', slug: 'nt', abbreviation: 'NT' },
  ];
  const cities = [
    { value: 'Sydney', state: 'New South Wales', slug: 'sydney-nsw', label: 'Sydney, NSW' },
    { value: 'Melbourne', state: 'Victoria', slug: 'melbourne-vic', label: 'Melbourne, VIC' },
    { value: 'Brisbane', state: 'Queensland', slug: 'brisbane-qld', label: 'Brisbane, QLD' },
    { value: 'Adelaide', state: 'South Australia', slug: 'adelaide-sa', label: 'Adelaide, SA' },
    { value: 'Perth', state: 'Western Australia', slug: 'perth-wa', label: 'Perth, WA' },
    { value: 'Canberra', state: 'Australian Capital Territory', slug: 'canberra-act', label: 'Canberra, ACT' },
    { value: 'Hobart', state: 'Tasmania', slug: 'hobart-tas', label: 'Hobart, TAS' },
    { value: 'Darwin', state: 'Northern Territory', slug: 'darwin-nt', label: 'Darwin, NT' },
  ];
  const normalise = value => String(value || '').trim().toLowerCase();
  const categoryBySlug = slug => categories.find(item => item.slug === normalise(slug));
  const categoryByValue = value => categories.find(item => normalise(item.value) === normalise(value));
  const locationBySlug = slug => states.find(item => item.slug === normalise(slug)) || cities.find(item => item.slug === normalise(slug));
  const stateByValue = value => states.find(item => normalise(item.value) === normalise(value));
  const cityByValues = (city, state) => cities.find(item => normalise(item.value) === normalise(city) && normalise(item.state) === normalise(state));
  return { mainHero, mainHeroPosition, categories, states, cities, categoryBySlug, categoryByValue, locationBySlug, stateByValue, cityByValues };
}));
// Canonical wedding supplier category, state, city, and combined route definitions.
