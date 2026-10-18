# New Zealand import source research

Researched 17 October 2026. The user requested coverage of 20 relevant New Zealand wedding planning/booking sources in addition to the Australian list. This is a relevance-based candidate list, not a verified top-20 ranking by traffic or bookings. Regional/editorial directories and broader event-venue platforms are labelled below. All remain candidates for automatic link extraction; profile presence does not establish access or reuse permission.

| Source | Primary reference | Coverage/type |
| --- | --- | --- |
| My Wedding Guide | https://www.myweddingguide.co.nz/directory | NZ wedding supplier directory |
| WeddingWise | https://weddingwise.co.nz/directory | NZ/Pacific wedding supplier directory |
| Bride & Groom | https://www.brideandgroom.co.nz/venues | Wedding publication and supplier directories |
| Together Journal | https://togetherjournal.com/directory/ | NZ-based international editorial/vendor directory |
| Auckland Weddings | https://www.aucklandweddings.co.nz/ | Auckland wedding supplier and venue directory |
| Canterbury Bride | https://www.canterburybride.co.nz/wedding-directory | Canterbury/South Island supplier directory |
| Christchurch Weddings | https://christchurchweddings.net/directory-hub | Canterbury wedding directory |
| The Wellington Wedding Show | https://www.thewellingtonweddingshow.co.nz/ | Wedding show with online regional directory |
| My Wedding Magazine NZ | https://myweddingmag.co.nz/directory/ | Wedding publication and directory |
| Getting Hitched | https://www.gettinghitched.co.nz/ | NZ wedding vendor directory |
| WedPro | https://wedpro.co.nz/nz-wedding-directory | NZ wedding directory |
| Wedding Vendors NZ | https://weddingvendors.co.nz/ | NZ wedding vendor marketplace/directory |
| Wedding Venues NZ | https://weddingvenues.co.nz/ | NZ wedding venue directory |
| NZ Venues | https://nzvenues.co.nz/suppliers | Broader event venue/supplier directory |
| Queenstown Wedding Association | https://queenstownweddings.org/explore/ | Queenstown regional wedding directory |
| First Look | https://www.firstlook.nz/ | NZ wedding inspiration and curated vendor directory |
| Savoro | https://savoro.co.nz/weddings/ | Broader NZ directory with wedding services |
| Sharedspace | https://www.sharedspace.co.nz/blog/33-other-news/124-top-wedding-venue.html | Broader space-hire platform with NZ wedding venues |
| Eventfinda | https://support.eventfinda.co.nz/hc/en-gb/articles/202979844-How-do-I-add-a-venue-listing-to-the-Eventfinda-database | Broader event/venue database; lower wedding-specific priority |
| VenueNow | https://venuenow.com/ | AU/NZ venue platform; shared with the Australian list |

The machine-readable registry in `dist/shared/supplier-import-sources.js` holds 20 candidates for each market and 39 distinct platform entries because VenueNow is shared. This recognises source links; it is not a set of 39 working network import adapters. No confirmed OAuth/export integration is assumed.

Wild Hearts and New Zealand Weddings were investigated but their current sites could not be verified through the available research tool; they were not silently counted as confirmed active directory targets. Revisit if suppliers request them.

## Country-specific handling

- Preserve NZ place names, country and region rather than converting them into Australian state codes.
- Never label an NZD price as AUD. The first text/file importer omits explicitly NZD prices, and omits starting prices for NZ-only recognised sources. Full multi-currency storefront publishing, regional selectors and reward eligibility for NZ need separate product/schema work before promising those features.
- Research-list inclusion does not mean the platform authorises extraction, that its directory lets suppliers self-manage accounts or that its photographs belong to the supplier.
- Reuse shared adapters across markets; do not count country domains as independent integrations without checking their actual platform structure.

## Current implementation boundary

Importing is on a standalone public page, not inside the supplier dashboard. Suppliers can preview their own pasted business details or supported text/CSV/JSON/HTML files. Signed-in supplier accounts can save selected text fields to their existing private workspace with version checks. No external account passwords, automatic external URL fetching, review transfers or automatic publication are implemented.

Later work: source-by-source permitted network adapters; image import with reuse permissions; NZ region/currency publishing; integrate import access into the dashboard only when requested. SendGrid, Stripe and deferred Auth configuration remain end-of-project tasks.
