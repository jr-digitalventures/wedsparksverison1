const fs = require('node:fs');
const path = require('node:path');
const routes = require('../dist/supplier-category/supplier-routes.js');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const outputRoot = path.join(distRoot, 'wedding-suppliers');
const templatePath = path.join(distRoot, 'supplier-category', 'index.html');
const liveRoot = 'https://jr-digitalventures.github.io/wedsparksverison1';

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

const render = page => {
  const depth = 1 + page.segments.length;
  const prefix = '../'.repeat(depth);
  const label = pageLabel(page);
  const description = `Discover ${label.toLowerCase()} and compare wedding services, packages and profiles on WedSparks.`;
  const routePath = `/wedsparksverison1/wedding-suppliers/${page.segments.length ? `${page.segments.join('/')}/` : ''}`;
  const canonical = `${liveRoot}/wedding-suppliers/${page.segments.length ? `${page.segments.join('/')}/` : ''}`;
  let html = fs.readFileSync(templatePath, 'utf8');
  html = html
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">\n  <link rel="canonical" href="${canonical}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${label} | WedSparks</title>`)
    .replace('href="../styles.css?v=55"', `href="${prefix}styles.css?v=55"`)
    .replace('href="../marketplace-search/marketplace.css?v=33"', `href="${prefix}marketplace-search/marketplace.css?v=33"`)
    .replace('href="supplier-category.css?v=41"', `href="${prefix}supplier-category/supplier-category.css?v=41"`)
    .replace('src="../marketplace-search/marketplace.js?v=17"', `src="${prefix}marketplace-search/marketplace.js?v=17"`)
    .replace('src="supplier-routes.js?v=1"', `src="${prefix}supplier-category/supplier-routes.js?v=1"`)
    .replace('src="supplier-category.js?v=26"', `src="${prefix}supplier-category/supplier-category.js?v=26"`)
    .replaceAll('href="../marketplace-search/"', `href="${prefix}marketplace-search/"`)
    .replaceAll('href="../wedding-suppliers/" aria-current="page"', `href="${prefix}wedding-suppliers/" aria-current="page"`)
    .replace('href="../" aria-label="WedSparks home"', `href="${prefix}" aria-label="WedSparks home"`)
    .replace('<h1 class="marketplace-title">Vendor Category</h1>', `<h1 class="marketplace-title">${label}</h1>`)
    .replace('<body class="marketplace-search-page supplier-category-page">', `<body class="marketplace-search-page supplier-category-page" data-supplier-route="${routePath}">`);
  return html;
};

fs.rmSync(outputRoot, { recursive: true, force: true });
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
console.log(`Generated ${pages.length} wedding supplier pages.`);
