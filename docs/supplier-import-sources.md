# Supplier profile imports: 20 Australian-market target sources

Research date: 17 October 2026. These 20 platforms were identified from their own public websites/search-indexed primary pages as sources serving Australian wedding suppliers or venues. The list is prioritised for product relevance, not a verified ranking by traffic, account numbers or bookings. National, editorial, regional and venue-only platforms are distinguished below. Platform brands are not necessarily independently owned companies.

The user confirmed that email/password fields belong to WedSparks signup. Suppliers then provide a link to their existing external business profile. There is no request to collect competitor credentials or log into their competitor accounts.

## Candidate matrix

Every row currently has status **Candidate: discovery confirmed; import not implemented**. The linked page establishes a relevant public directory/listing offering, not permission to copy its contents. API/OAuth/export support, source terms, an individual profile's extractable fields and approved image reuse must be checked separately before shipping its adapter. No official migration partnership is claimed.

| Source | Public source checked | Scope/type | Proposed rollout |
| --- | --- | --- | --- |
| Easy Weddings | https://www.easyweddings.com.au/business/ | Broad Australian wedding marketplace and supplier storefronts | Batch 1 |
| Wedshed | https://www.wedshed.com.au/how-it-works/vendors/ | Australian wedding venues and vendors | Batch 1 |
| Wedding Diaries | https://www.weddingdiaries.com.au/ | Australian wedding venue/supplier directory and planning resources | Batch 1 |
| ABIA | https://www.abia.com.au/ | Australian wedding supplier directory, reviews and awards | Batch 1; exclude source review scores/awards from native credentials |
| Wedlockers | https://www.wedlockers.com.au/about-us/ | Australian wedding venue/vendor directory | Batch 1 |
| Hello May | https://hellomay.com.au/directory/ | Curated wedding supplier directory and publication | Batch 2; separate supplier-authored material from publisher editorial copy |
| Polka Dot Wedding | https://polkadotwedding.com/directory-locations/australia/ | Australian wedding directory and editorial publication | Batch 2; publisher content/image rights need attention |
| Ivory Tribe | https://ivorytribe.com.au/the-tribe/ | Curated wedding supplier directory focused on Victoria | Batch 2; identify reusable supplier material |
| Wedded Wonderland | https://weddedwonderland.com/vendor?directory_type=vendor | International vendor directory with Australian listings | Batch 2; select the actual Australian business listing |
| One Fine Day | https://onefinedayweddingexpo.com.au/directory | Australian wedding expo and supplier directory | Batch 2 |
| WeddingHero | https://weddinghero.com.au/wedding-vendors | Australian wedding vendor and venue discovery | Batch 3 |
| Wedding & Bride | https://weddingandbride.com.au/ and https://melbourne.weddingandbride.com.au/ | Wedding publication and local supplier features/directories | Batch 3; confirm source-specific profile structures and ownership of text |
| Ideal Bride | https://www.idealbride.com.au/regions/queensland/ | Wedding supplier directory with Queensland coverage | Batch 3 |
| Hunter Valley Wedding Planner | https://huntervalleyweddingplanner.com.au/directory-listing/ | Regional wedding supplier and venue directory | Batch 3 |
| Every Event Australia | https://www.everyeventaus.com.au/find-suppliers/ | Event supplier/venue marketplace, including wedding services | Batch 3; separate business profile from individual hire-product records |
| Venue Crew | https://www.venuecrew.com/au/venues/search/ | Venue discovery and booking enquiries, including weddings | Batch 4: venue suppliers |
| VenueNow | https://venuenow.com/ | Australian/NZ venue and event-supplier marketplace | Batch 4; only relevant Australian business/venue content |
| Tagvenue | https://www.tagvenue.com/au/ | Australian venue discovery/booking within an international platform | Batch 4; map venue vs room-level records carefully |
| Venue Maestro | https://venuemaestro.com/ | Australian function/event venues, including weddings | Batch 4: venue suppliers |
| VENYU | https://venyu.com.au/find-a-venue/ | South Australian wedding venue specialist | Batch 4; agency-curated descriptions and photography need source-specific review |

## Supplier-facing flow

**Create your WedSparks account -> Paste your existing profile link -> Import available details -> Review -> Save draft -> Publish when ready.**

Detect the platform from the profile URL instead of making suppliers navigate a 20-item dropdown. Offer a searchable source selector as optional help. Explain that they need the public business listing link, not their account dashboard URL or account username.

Ask only for missing details after extraction. Allow partial success: a source might supply business name/about/location but omit package prices or reusable images. Display what was found and what still needs adding. Keep an existing populated field unless the supplier chooses to replace it. Never silently publish or duplicate their existing WedSparks business record.

For sources not yet supported or whose approved access is unavailable, provide an honest status and a paste/file alternative. Do not imply that a fallback is an automatic source integration or advertise all 20 as supported in advance.

## Definition of supported

Before changing a source's status from Candidate to Supported, record:

1. A permitted access route and current terms/rights assessment; an official API, export or partnership if required. A supplier's consent does not establish source permission or photographer rights by itself.
2. Representative public profile URLs covering vendor types and, where relevant, multi-room venues. Do not treat a listing's presence in search results as a passed parser test.
3. A maintained source adapter that extracts business-owned plain-text fields and allowed images, with clear category/region/package mappings.
4. Checks for malformed links, source failures, changed layouts, private/internal redirect targets, oversized/unexpected files and imported active content.
5. Owner-only draft saves, existing vendor-ID preservation, field-by-field overwrite control, version conflicts and retry/deduplication behaviour.
6. Accurate supplier-facing support status and a partial/manual fallback.

This plan covers profile prefilling only. It does not migrate private enquiries, customer records, passwords, bookings or invoices, and does not turn external ratings or awards into verified WedSparks reviews.
