export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (amount, currency = 'AUD') => new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
export const dateLabel = value => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : 'Date to be decided';
export function priceLabel(pricing, currency = 'AUD') {
  const amount = pricing.price ?? pricing.startingPrice;
  const type = pricing.pricingType || pricing.startingPriceType;
  if (type === 'custom_quote') return 'Custom quote';
  if (type === 'pricing_guide') return amount > 0 ? `Guide from ${money(amount, currency)}` : 'Request pricing guide';
  if (!(Number(amount) > 0)) return 'Price not provided';
  const value = money(amount, currency);
  return ({ fixed: value, starting: `From ${value}`, starting_price: `From ${value}`, minimum_spend: `Minimum spend ${value}`, per_person: `From ${value} / guest`, per_item: `From ${value} / ${pricing.unit || 'item'}`, per_service: `From ${value} / service` })[type] || `From ${value}`;
}
export function normaliseVendor(input) {
  if (!input || !input.id || !String(input.name || '').trim()) throw new Error('A vendor id and name are required.');
  if (!(Number(input.pricing?.startingPrice) > 0)) throw new Error('A vendor must have a positive starting price.');
  const media = { ...input.media, gallery: input.media?.gallery || [], videos: input.media?.videos || [] };
  if (media.heroImage?.src) media.gallery = [media.heroImage, ...media.gallery.filter(photo => photo.src !== media.heroImage.src)];
  return {
    ...input, location: { ...input.location, serviceAreas: input.location?.serviceAreas || [], serviceCities: input.location?.serviceCities || [] }, pricing: { currency: 'AUD', ...input.pricing },
    styles: input.styles || [], description: input.description || [], highlights: input.highlights || [], services: input.services || [],
    media, packages: input.packages || [], categoryDetails: input.categoryDetails || {},
    availability: { mode: 'unpublished', ...input.availability, dates: input.availability?.dates || [] }, reviews: input.reviews || [], faqs: input.faqs || [], portfolioGalleries: input.portfolioGalleries || [], consultations: input.consultations || []
  };
}
export function reviewStats(reviews = []) { return { count: reviews.length, average: reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : null }; }
export function sortReviews(reviews, order = 'recent') {
  return [...reviews].sort((a, b) => order === 'highest' ? b.rating - a.rating || b.date.localeCompare(a.date) : order === 'lowest' ? a.rating - b.rating || b.date.localeCompare(a.date) : b.date.localeCompare(a.date));
}
export const reviewSources = { confirmed: 'WedSparks-confirmed customer · sample', invited: 'Invited customer review · sample', imported: 'Imported testimonial · sample' };

export const categoryFields = {
  'Bar Service': { packageOptions: 'Package options', guestLimits: 'Guest limits', licensedService: 'Licensed service', rsaStaffing: 'RSA staffing', equipment: 'Equipment', inclusions: 'Drinks & service', setup: 'Setup requirements' },
  Cake: { servingSizes: 'Serving sizes', flavours: 'Flavour options', dietary: 'Dietary requirements', customDesigns: 'Custom designs', tastings: 'Tastings', delivery: 'Delivery', setup: 'Setup', minimumNotice: 'Minimum notice' },
  Catering: { pricePerGuest: 'Price per guest', minimumGuests: 'Minimum guests', maximumGuests: 'Maximum guests', cuisine: 'Cuisine', servingStyles: 'Serving styles', dietaryOptions: 'Dietary options', staffing: 'Staffing', equipment: 'Equipment', cleanup: 'Setup & cleanup' },
  Celebrant: { ceremonyTypes: 'Ceremony types', personalisation: 'Personalisation', rehearsals: 'Rehearsals', paperwork: 'Legal paperwork', travel: 'Travel', planning: 'Ceremony planning' },
  Florist: { floralStyles: 'Floral styles', minimumSpend: 'Minimum spend', customDesigns: 'Custom designs', bridalFlorals: 'Bridal florals', ceremonyInstallations: 'Ceremony flowers', receptionInstallations: 'Reception flowers', delivery: 'Delivery', setup: 'Setup', packDown: 'Pack-down', serviceRadius: 'Where we work' },
  'Hair Stylist': { bridalServices: 'Bridal services', weddingParty: 'Wedding-party services', trials: 'Trials', groupCapacity: 'Group capacity', preparation: 'Preparation', travel: 'Travel', additionalStylists: 'Additional stylists' },
  Hireage: { items: 'Hireable items', quantities: 'Inventory', minimumHire: 'Minimum hire', delivery: 'Delivery', setup: 'Setup', collection: 'Collection', damage: 'Damage conditions', equipment: 'Equipment requirements' },
  'Live Entertainment': { styles: 'Performance styles', genres: 'Genres', configurations: 'Group configurations', sound: 'Sound equipment', setup: 'Setup requirements', examples: 'Performance examples', additionalPerformers: 'Additional performers' },
  'Make-up': { bridalServices: 'Bridal makeup', weddingParty: 'Wedding-party makeup', trials: 'Trials', groupCapacity: 'Group capacity', products: 'Product options', travel: 'Travel', additionalArtists: 'Additional artists' },
  Photographer: { coverage: 'Coverage options', photographers: 'Photographers', secondPhotographer: 'Second photographer', deliverables: 'Deliverables', editingTurnaround: 'Editing turnaround', digitalGalleries: 'Digital galleries', printProducts: 'Print products', fullGalleries: 'Full galleries' },
  Stationery: { products: 'Product types', personalisation: 'Personalisation', design: 'Design options', printMethods: 'Print methods', minimumQuantity: 'Minimum quantities', leadTime: 'Production lead time', samples: 'Sample packs', delivery: 'Delivery' },
  Transport: { vehicles: 'Vehicle types', capacity: 'Passenger capacity', options: 'Vehicle options', pickup: 'Pickup & drop-off', routes: 'Routes', fleet: 'Fleet availability', inclusions: 'Service inclusions', travel: 'Travel conditions' },
  Venue: { guestCapacity: 'Guest capacity', ceremonySpaces: 'Ceremony spaces', receptionSpaces: 'Reception spaces', indoorOutdoor: 'Indoor & outdoor', accommodation: 'Accommodation', cateringArrangements: 'Catering', accessibility: 'Accessibility', parking: 'Parking', wetWeather: 'Wet-weather plan', facilities: 'Facilities' },
  Videographer: { coverage: 'Coverage options', deliverables: 'Deliverables', filmLengths: 'Film lengths', turnaround: 'Delivery timeframe', videographers: 'Videographers', drone: 'Drone services', rawFootage: 'Raw footage', formats: 'Delivery formats' },
  'Wedding Dress': { designers: 'Designers', sizes: 'Available sizes', styles: 'Dress styles', madeToOrder: 'Made to order', fittings: 'Fittings', alterations: 'Alterations', customisation: 'Customisation', leadTime: 'Ordering lead time', appointments: 'Appointments' }
};
export function quickFacts(vendor) {
  const aliases = { Stationary: 'Stationery', Makeup: 'Make-up', Hire: 'Hireage' };
  const fields = categoryFields[vendor.category] || categoryFields[aliases[vendor.category]] || {};
  return Object.entries(fields).filter(([key]) => vendor.categoryDetails[key] !== undefined && vendor.categoryDetails[key] !== null && vendor.categoryDetails[key] !== '').map(([key, label]) => ({ key, label, value: Array.isArray(vendor.categoryDetails[key]) ? vendor.categoryDetails[key].join(', ') : String(vendor.categoryDetails[key]) }));
}
export function availabilityOn(vendor, date) {
  if (!date || vendor.availability.mode !== 'live') return 'unknown';
  return vendor.availability.dates.find(entry => entry.date === date)?.status || 'unknown';
}
export function estimatePackage(pkg, { quantity = 1, manual = null, currency = 'AUD' } = {}) {
  const type = pkg.pricingType || pkg.startingPriceType;
  const base = Number(pkg.price ?? pkg.startingPrice);
  if (['custom_quote', 'pricing_guide'].includes(type)) return { amount: Number.isFinite(Number(manual)) && Number(manual) > 0 ? Number(manual) : null, isEstimate: true };
  const qty = Number(quantity);
  if (['per_person', 'per_item'].includes(type) && (!(qty > 0) || !Number.isInteger(qty) || qty < (pkg.minQuantity || 1) || (pkg.maxQuantity && qty > pkg.maxQuantity))) return { amount: null, isEstimate: true, error: `Enter a whole quantity from ${pkg.minQuantity || 1}${pkg.maxQuantity ? ` to ${pkg.maxQuantity}` : ' or more'}.` };
  return { amount: ['per_person', 'per_item'].includes(type) ? base * qty : base, isEstimate: type !== 'fixed', currency };
}
export function budgetProjection({ allocated = 0, committed = 0, additions = 0, estimate = 0 }) {
  const remaining = allocated - committed - additions - estimate;
  return { remaining, over: Math.max(0, -remaining), total: committed + additions + estimate };
}
export function weddingMatches(vendor, couple) {
  if (!couple?.isLoggedIn || !couple.wedding) return [];
  const w = couple.wedding, matches = [];
  if (w.city) {
    const location = [...vendor.location.serviceCities, ...vendor.location.serviceAreas].some(area => area.toLowerCase() === w.city.toLowerCase());
    matches.push({ state: location ? 'match' : vendor.location.travelsOutsideServiceArea ? 'potential' : 'no', icon: 'pin', title: location ? `Works in ${w.city}` : `Travel to ${w.city} needs confirming`, detail: location ? 'Your wedding location is in the listed service area.' : 'Ask the vendor about your location and any travel costs.' });
  }
  const shared = (w.styles || []).filter(style => vendor.styles.some(tag => tag.toLowerCase() === style.toLowerCase()));
  if (w.styles?.length && vendor.styles.length) matches.push({ state: shared.length ? 'match' : 'potential', icon: 'spark', title: shared.length ? `${shared.join(' & ')} feels like you` : 'Explore their style together', detail: shared.length ? 'These styles match your saved wedding preferences.' : 'Your saved styles differ from their listed tags.' });
  const budget = w.categoryBudgets?.[vendor.category];
  if (budget > 0) {
    const type = vendor.pricing.startingPriceType;
    const needsQuantity = ['per_person', 'per_item'].includes(type);
    const estimate = type === 'per_person' && w.guestCount ? vendor.pricing.startingPrice * w.guestCount : needsQuantity ? null : vendor.pricing.startingPrice;
    matches.push({ state: estimate === null ? 'unknown' : estimate <= budget ? 'match' : 'no', icon: 'wallet', title: estimate === null ? 'Your estimate needs a quantity' : estimate <= budget ? 'A starting point within your budget' : 'Starting estimate above your budget', detail: estimate === null ? 'Item quantities are needed before comparing the starting price.' : `${money(estimate, vendor.pricing.currency)} starting estimate against your ${money(budget, vendor.pricing.currency)} ${vendor.category.toLowerCase()} budget. Your final quote may be higher.` });
  }
  if (w.guestCount && vendor.capacity) matches.push({ state: w.guestCount >= (vendor.capacity.min || 0) && w.guestCount <= vendor.capacity.max ? 'match' : 'no', icon: 'people', title: `Your ${w.guestCount} guests`, detail: `The vendor lists capacity for ${vendor.capacity.min || 1}–${vendor.capacity.max} guests.` });
  if (w.date) { const status = availabilityOn(vendor, w.date); matches.push({ state: status === 'available' ? 'match' : ['unavailable', 'blackout'].includes(status) ? 'no' : 'unknown', icon: 'calendar', title: status === 'available' ? 'Available in the sample calendar' : ['unavailable', 'blackout'].includes(status) ? 'Your date is not available' : 'Your date still needs confirming', detail: `${dateLabel(w.date)} · ${status === 'unknown' ? 'No confirmed availability is published for your day.' : 'Illustrative availability only; no booking is held.'}` }); }
  return matches;
}
export function recommendedPackage(vendor, couple) {
  if (!couple?.isLoggedIn) return null;
  const budget = couple.wedding?.categoryBudgets?.[vendor.category];
  if (!budget) return null;
  const candidates = vendor.packages.map(pkg => ({ pkg, estimate: estimatePackage(pkg, { quantity: couple.wedding.guestCount || 1 }) })).filter(({ estimate }) => estimate.amount > 0 && estimate.amount <= budget);
  return candidates.sort((a, b) => b.estimate.amount - a.estimate.amount)[0]?.pkg.id || null;
}
export function monthCells(month) {
  const [year, index] = month.split('-').map(Number), days = new Date(year, index, 0).getDate();
  const offset = (new Date(year, index - 1, 1).getDay() + 6) % 7;
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
}
export function shiftMonth(month, amount) { const [y, m] = month.split('-').map(Number); const value = new Date(y, m - 1 + amount, 1); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`; }
export const enquiryTypes = { general: 'General enquiry', quote: 'Request a custom quote', package: 'Enquire about a package', guide: 'Request pricing guide', availability: 'Check date availability', consultation: 'Request a consultation' };
export function validateEnquiry(draft) {
  const errors = {};
  if (!enquiryTypes[draft.type]) errors.type = 'Choose an enquiry type.';
  if (!draft.name?.trim()) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email || '')) errors.email = 'Enter a valid email address.';
  if (draft.type === 'availability' && !draft.date) errors.date = 'Choose your wedding date.';
  if (['quote', 'package', 'availability'].includes(draft.type) && !draft.location?.trim()) errors.location = 'Enter the wedding city or region.';
  if (draft.type === 'package' && !draft.packageId) errors.packageId = 'Select a package.';
  if (draft.type === 'consultation' && !draft.consultationDate) errors.consultationDate = 'Choose your preferred consultation date.';
  for (const key of ['date', 'consultationDate']) {
    const value = draft[key];
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value + 'T12:00:00').getTime()) || new Date(value + 'T12:00:00').toISOString().slice(0, 10) !== value)) errors[key] = 'Enter a valid date.';
  }
  if (draft.guestCount && (!Number.isInteger(Number(draft.guestCount)) || Number(draft.guestCount) < 1)) errors.guestCount = 'Enter a positive whole guest count.';
  if ((draft.message || '').trim().length < 15) errors.message = 'Please add at least 15 characters about what you need.';
  return errors;
}
