import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { vendor, couple } from '../dist/vendor-profile/data.js';
import { renderProfile } from '../dist/vendor-profile/view.js';
import { normaliseVendor, escapeHtml as e } from '../dist/vendor-profile/model.js';
import { header, footer, origin } from './generate-public-pages.mjs';

const profile = normaliseVendor(vendor);
const canonical = `${origin}/vendor-profile/`;
const title = `${profile.name} | ${profile.categoryLabel || profile.category} ${profile.location.city || ''} ${profile.location.state || ''}`.trim();
// Shared navigation markup, with this prototype's own isolated sample sign-in controls.
const pageHeader = header('../').replace('site-header public-header', 'site-header public-header vp-profile-site-header').replaceAll('type="button" disabled', 'type="button" data-action="sign-in"');
const schema = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebPage', '@id': canonical + '#page', name: title, description: profile.summary, url: canonical },
  { '@type': 'LocalBusiness', name: profile.name, description: profile.summary, address: { '@type': 'PostalAddress', addressLocality: profile.location.city, addressRegion: profile.location.state, addressCountry: 'AU' }, areaServed: profile.location.serviceAreas, image: profile.media.gallery.map(photo => new URL(photo.src, canonical).href) },
  { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Wedding vendors', item: origin + '/wedding-suppliers/' }, { '@type': 'ListItem', position: 2, name: profile.categoryLabel, item: origin + '/wedding-suppliers/' + profile.categorySlug + '/' }, { '@type': 'ListItem', position: 3, name: profile.name, item: canonical }] }
] };
const html = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#103e33">
  <meta name="robots" content="noindex,follow">
  <title>${e(title)}</title>
  <meta name="description" content="${e(profile.summary)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/svg+xml" href="../assets/wedsparks-favicon.svg">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(profile.summary)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${new URL(profile.media.heroImage.src, canonical).href}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="../styles.css">
  <link rel="stylesheet" href="../auth.css">
  <link rel="stylesheet" href="../shared/public-site.css">
  <link rel="stylesheet" href="vendor-profile.css?v=1">
  <script type="application/ld+json" data-vendor-seo>${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  <script type="module" src="vendor-profile.js?v=1"></script>
</head>
<body class="vendor-profile-page" data-vendor-profile-page="true">
  <a class="skip-link" href="#vendor-profile-root">Skip to vendor profile</a>
  ${pageHeader}
  <main id="vendor-profile-root" tabindex="-1" aria-label="Wedding Vendor Profile">${renderProfile(profile, couple)}</main>
  ${footer('../')}
</body>
</html>
`;
fs.writeFileSync(fileURLToPath(new URL('../dist/vendor-profile/index.html', import.meta.url)), html);
console.log('Generated the Wedding Vendor Profile at /vendor-profile/ from its sample data.');
