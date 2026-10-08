(function (root, factory) {
  const routes = factory();
  if (typeof module === 'object' && module.exports) module.exports = routes;
  else root.WEDSPARKS_SUPPLIER_ROUTES = routes;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const categories = [
    { value: 'Bar Service', slug: 'bar-services', label: 'Bar Services' },
    { value: 'Cake', slug: 'wedding-cakes', label: 'Wedding Cakes' },
    { value: 'Catering', slug: 'wedding-caterers', label: 'Wedding Caterers' },
    { value: 'Celebrant', slug: 'wedding-celebrants', label: 'Wedding Celebrants' },
    { value: 'Florist', slug: 'wedding-florists', label: 'Wedding Florists' },
    { value: 'Hair Stylist', slug: 'wedding-hair-stylists', label: 'Wedding Hair Stylists' },
    { value: 'Hireage', slug: 'wedding-hire', label: 'Wedding Hire' },
    { value: 'Live Entertainment', slug: 'wedding-entertainment', label: 'Wedding Entertainment' },
    { value: 'Make-up', slug: 'wedding-makeup-artists', label: 'Wedding Makeup Artists' },
    { value: 'Photographer', slug: 'wedding-photographers', label: 'Wedding Photographers' },
    { value: 'Stationary', slug: 'wedding-stationery', label: 'Wedding Stationery' },
    { value: 'Transport', slug: 'wedding-transport', label: 'Wedding Transport' },
    { value: 'Venue', slug: 'wedding-venues', label: 'Wedding Venues' },
    { value: 'Videographer', slug: 'wedding-videographers', label: 'Wedding Videographers' },
    { value: 'Wedding Dress', slug: 'wedding-dresses', label: 'Wedding Dresses' },
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
  return { categories, states, cities, categoryBySlug, categoryByValue, locationBySlug, stateByValue, cityByValues };
}));
