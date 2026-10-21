const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const outputRoot = path.join(distRoot, 'wedding-suppliers');
const templatePath = path.join(outputRoot, 'index.html');
const liveRoot = 'https://jr-digitalventures.github.io/wedsparksverison1';
const baseTemplate = fs.readFileSync(templatePath, 'utf8');
const routeModule = { exports: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(outputRoot, 'supplier-routes.js'), 'utf8'),
  { module: routeModule, exports: routeModule.exports, globalThis: {} },
  { filename: 'supplier-routes.js' }
);
const routes = routeModule.exports;
const seoContentModule = { exports: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(outputRoot, 'supplier-seo-content.js'), 'utf8'),
  { module: seoContentModule, exports: seoContentModule.exports, globalThis: {} },
  { filename: 'supplier-seo-content.js' }
);
const seoContent = seoContentModule.exports;

if (path.dirname(outputRoot) !== distRoot || path.basename(outputRoot) !== 'wedding-suppliers') {
  throw new Error(`Refusing to replace unexpected output directory: ${outputRoot}`);
}

const pages = [];
const add = (segments, category = null, location = null) => pages.push({ segments, category, location });
add([]);
routes.categories.forEach(category => add([category.slug], category));
routes.states.forEach(location => add([location.slug], null, location));
routes.cities.forEach(location => add([location.slug], null, location));
routes.categories.forEach(category => {
  routes.states.forEach(location => add([category.slug, location.slug], category, location));
  routes.cities.forEach(location => add([category.slug, location.slug], category, location));
});

const pageLabel = ({ category, location }) => {
  const locationName = location?.label || location?.value || '';
  if (category && locationName) return `${category.label} in ${locationName}`;
  if (category) return category.label;
  if (locationName) return `Wedding Suppliers in ${locationName}`;
  return 'Wedding Suppliers Australia';
};
const seoKey = ({ category, location }) => {
  const categoryName = category?.value || 'All wedding suppliers';
  const locationName = location ? (location.abbreviation || location.label) : '';
  if (locationName) return `${categoryName} + ${locationName}`;
  if (category) return `${categoryName} + No Location selected or Location selected that IS NOT state or main city`;
  return 'All wedding suppliers + Any location / no category selected';
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

const render = page => {
  const depth = 1 + page.segments.length;
  const prefix = '../'.repeat(depth);
  const supplierAssetPrefix = page.segments.length ? `${prefix}wedding-suppliers/` : '';
  const label = pageLabel(page);
  const heroLabel = page.category?.label || 'Find Wedding Suppliers';
  const seoCopy = seoContent[seoKey(page)] || routes.seoContent(page.category);
  const heroImage = page.category?.hero || routes.mainHero;
  const heroPosition = page.category?.heroPosition || (!page.category && routes.mainHeroPosition) || 'center calc(50% - 50px)';
  const heroClass = page.category?.heroFlip ? ' supplier-hero-image--flipped' : '';
  const heroTransform = page.category?.heroFlip ? 'transform:scaleX(-1);' : '';
  const mobileHeroPosition = page.category?.heroPosition || (!page.category && routes.mainHeroPosition) || '62% center';
  const description = `Discover ${label.toLowerCase()} and compare wedding services, packages and profiles on WedSparks.`;
  const routePath = `/wedsparksverison1/wedding-suppliers/${page.segments.length ? `${page.segments.join('/')}/` : ''}`;
  const canonical = `${liveRoot}/wedding-suppliers/${page.segments.length ? `${page.segments.join('/')}/` : ''}`;
  let html = baseTemplate;
  html = html
    .replace(/<meta name="description" content="[^"]*">\s*(?:<link rel="canonical" href="[^"]*">)?/, `<meta name="description" content="${description}">\n  <link rel="canonical" href="${canonical}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${label} | WedSparks</title>`)
    .replace('href="../styles.css?v=55"', `href="${prefix}styles.css?v=55"`)
    .replace('href="../marketplace-search/marketplace.css?v=33"', `href="${prefix}marketplace-search/marketplace.css?v=33"`)
    .replace(/href="[^"]*supplier-category\.css\?v=\d+"/, `href="${supplierAssetPrefix}supplier-category.css?v=49"`)
    .replace('src="../marketplace-search/marketplace.js?v=18"', `src="${prefix}marketplace-search/marketplace.js?v=18"`)
    .replace(/src="[^"]*supplier-routes\.js\?v=\d+"/, `src="${supplierAssetPrefix}supplier-routes.js?v=7"`)
    .replace(/src="[^"]*supplier-seo-content\.js\?v=\d+"/, `src="${supplierAssetPrefix}supplier-seo-content.js?v=1"`)
    .replace(/src="[^"]*supplier-category\.js\?v=\d+"/, `src="${supplierAssetPrefix}supplier-category.js?v=34"`)
    .replace('href="../shared/../auth.css"', `href="${prefix}auth.css"`)
    .replace('src="../shared/header-auth.js"', `src="${prefix}shared/header-auth.js"`)
    .replace('href="../shared/public-site.css"', `href="${prefix}shared/public-site.css"`)
    .replace(/src="(?:\.\.\/)*shared\/supplier-save-bridge\.js(?:\?v=\d+)?"/, `src="${prefix}shared/supplier-save-bridge.js?v=3"`)
    .replaceAll('href="../marketplace-search/"', `href="${prefix}marketplace-search/"`)
    .replaceAll('href="../wedding-suppliers/" aria-current="page"', `href="${prefix}wedding-suppliers/" aria-current="page"`)
    .replace('href="../" aria-label="WedSparks home"', `href="${prefix}" aria-label="WedSparks home"`)
    .replace('<h1 class="marketplace-title">Find Wedding Suppliers</h1>', `<h1 class="marketplace-title">${heroLabel}</h1>`)
    .replace(/<section class="supplier-seo-dynamic"[\s\S]*?<\/section>/, `<section class="supplier-seo-dynamic" aria-live="polite"><h3 data-seo-dynamic-title>${escapeHtml(seoCopy.title)}</h3><p data-seo-dynamic-paragraph>${escapeHtml(seoCopy.paragraph)}</p></section>`)
    .replace(/(<section class="marketplace-hero public-photo-banner"[^>]*style=")[^"]*(")/, `$1--supplier-hero-position:${heroPosition}$2`)
    .replace(/(<section class="marketplace-hero public-photo-banner"[^>]*><img)(?: class="[^"]*")? src=/, `$1 class="supplier-hero-image${heroClass}" src=`)
    .replace(/(<section class="marketplace-hero public-photo-banner"[^>]*><img(?: class="[^"]*")? src=")[^"]*(" style=")[^"]*(")/, `$1${heroImage}$2object-position:${heroPosition};${heroTransform}$3`)
    .replace(/<body class="marketplace-search-page supplier-category-page"(?: data-supplier-route="[^"]*")?>/, `<body class="marketplace-search-page supplier-category-page" data-supplier-route="${routePath}">`);
  return html;
};

// Preserve the shared directory assets while rebuilding all generated SEO route folders.
fs.mkdirSync(outputRoot, { recursive: true });
for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
  if (entry.isDirectory()) fs.rmSync(path.join(outputRoot, entry.name), { recursive: true, force: true });
}
pages.forEach(page => {
  const directory = path.join(outputRoot, ...page.segments);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), render(page));
});

const sitemap = pages.map(page => {
  const suffix = page.segments.length ? `${page.segments.join('/')}/` : '';
  return `  <url><loc>${liveRoot}/wedding-suppliers/${suffix}</loc></url>`;
}).join('\n');
fs.writeFileSync(path.join(distRoot, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`);
fs.writeFileSync(path.join(distRoot, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${liveRoot}/sitemap.xml\n`);
const legacyRoot = path.join(distRoot, 'supplier-category');
if (path.dirname(legacyRoot) !== distRoot || path.basename(legacyRoot) !== 'supplier-category') {
  throw new Error(`Refusing to remove unexpected legacy directory: ${legacyRoot}`);
}
fs.rmSync(legacyRoot, { recursive: true, force: true });
console.log(`Generated ${pages.length} wedding supplier pages.`);
