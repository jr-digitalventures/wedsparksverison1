# WedSparks public pages and SEO plan

Researched 17 October 2026. Scope: competitor comparison, recommended public pages, homepage positioning and build order. This is a research plan; the website has not been changed by this document. Priorities reflect relevance to the product and visitor intent, not measured search volumes or competitor traffic estimates.

## Approved scope

The user approved all page types in this plan on 17 October 2026, explicitly including Wedding Guides and Real Weddings. This work takes priority over further couple-dashboard development. Build the guide/story hubs and article templates as part of the public site; publish real wedding stories only when genuine submissions and image permissions are available. Supplier profile importing is also planned as an onboarding improvement; see `supplier-profile-import-plan.md`. Signup email/password credentials are for WedSparks only; suppliers provide their existing external business profile link for importing. The target scope is 20 Australian and 20 New Zealand candidate platforms, with source-specific support to be confirmed. Importing lives on a separate page; dashboard integration is later work. Individual supplier pages are deferred to the very end for SEO, design, usability, functional and published-data/privacy review; leave those pages unchanged meanwhile.

## Positioning

### Standing requirement: search and AI discoverability

The user explicitly wants to maximise organic SEO visibility and the chance of being referenced by AI assistants, including ChatGPT and other LLM-based search products. Apply this to every public page and editorial update, and to the individual supplier-page review at the very end of the plan.

- Publish useful, original, crawlable HTML with direct answers, descriptive headings, stable canonical URLs, meaningful internal links and sitemap coverage.
- Explain WedSparks consistently: who it serves, Australia/New Zealand scope where actually supported, what its tools do and the confirmed credit rules. Only money paid through WedSparks payments earns credits; credits are used only through WedSparks payments, with no cash withdrawals.
- Use accurate structured data that matches visible content where appropriate. Clearly identify the business, real authors/reviewers, genuine supplier details and content dates; do not invent credentials, reviews, sources or customer stories.
- Create substantive guides and factual explanations that are useful to cite. Attribute external facts and keep time-sensitive information current. Label generated decorative imagery separately from genuine Real Weddings submissions.
- At launch, review crawler access, indexing controls, canonical domain, sitemap and relevant search/AI crawler guidance using current official documentation. Keep private dashboards, drafts and personal data protected.
- Measure search visibility and referrals over time; record observable AI references when available. Inclusion, rankings and AI citations cannot be guaranteed. Do not add speculative mechanisms as a substitute for helpful content and sound technical SEO.

This records the requirement; it does not claim structured data or crawler-specific launch checks are already implemented.

Lead with the credit programme and support it with supplier discovery and planning tools. Proposed launch wording:

> Your wedding spending gives back.
>
> Earn $1,000 in free wedding credits for every $10,000 of eligible spending through WedSparks.
>
> Find your suppliers and keep your wedding plans together in one place.

Primary CTA: Find wedding suppliers. Secondary CTA: How wedding credits work. Add a separate Start planning CTA to the planning tools section.

Keep the current photography and green/cream design. Place the reward proposition above the fold, followed by a short explanation, spend/credit examples, supplier categories, planning tools, useful guides and FAQs. Avoid repeating generic descriptions of the dashboard across multiple homepage sections.

Use credits terminology consistently. Do not describe credits as cash, cash back or a guaranteed discount on every purchase. Distinguish eligible platform spending from costs typed into the budget tracker. The earning, payment and redemption integrations remain pending; public launch copy must reflect actual availability. Do not introduce expiry, refund treatment, redemption restrictions or listing prices that have not been agreed.

## Competitor comparison

| Competitor | Observed public-page pattern | Application for WedSparks |
| --- | --- | --- |
| Easy Weddings, Australia | Category and regional supplier directories; public explanations of planning tools; tips/advice and real weddings; dedicated business acquisition page. | Connect search-friendly supplier pages, useful planning resources and a clear supplier sign-up path. |
| Wedshed, Australia | Venue/vendor discovery; Advice & Ideas; a planning hub; FAQs and supplier-facing how-it-works content. | Give couples useful information before sign-up and show suppliers what their listing and tools offer. |
| Hello May, Australia | Editorial publication, real wedding inspiration and vendor directory. | Later, publish genuine wedding stories that link to the suppliers involved and relevant location/category pages. |
| WeddingWire, US | Public planning-tool hub with individual tool routes, cost guide, directory and editorial content. Personal planning features require an account. | Give each major tool a useful public entry point; require login for saving personal plans and managing private data. |

Sources inspected:

- Easy Weddings homepage: https://www.easyweddings.com.au/
- Easy Weddings supplier recruitment: https://www.easyweddings.com.au/business/
- Wedshed homepage: https://www.wedshed.com.au/
- Wedshed vendor offering: https://www.wedshed.com.au/how-it-works/vendors/
- Hello May about/publication overview: https://hellomay.com.au/about-us/
- WeddingWire planning hub: https://www.weddingwire.com/wedding-planning.html

These observations concern public content and navigation. They do not establish competitor rankings, performance or the uniqueness of WedSparks' reward programme.

## Recommended page map

All of these page types should be readable without signing in. URL suggestions are relative to the final site domain.

| Priority | Page | Suggested URL | What it should contain |
| --- | --- | --- | --- |
| First | Homepage update | `/` | Reward-led proposition, supplier search, credit explanation, tool overview and routes into the public site. |
| First | Wedding credits | `/wedding-credits/` | How milestones work, eligible spending, when credits become available, how redemption works, examples, calculator and programme FAQs once rules are agreed. |
| First | Planning your wedding | `/planning-your-wedding/` | A single planning hub: budget, checklist/calendar, guests/invitations/RSVPs, supplier shortlist/messages, documents and wedding-day timeline. Use actual product views and useful starter guidance. |
| First | Become a supplier | `/for-suppliers/` | Who can join; public storefront/gallery; packages, enquiries, availability and booking organisation; clear sign-up steps; agreed pricing; optional paid leads explained separately. Mark future sending/payment features accurately. |
| First | FAQs | `/faqs/` | Couple and supplier questions grouped clearly, with links to full credits, planning and supplier pages. |
| First | About WedSparks | `/about/` | Real business story, team, purpose and contact details; explain why the platform exists. |
| First | Contact | `/contact/` | Genuine support/business contact routes. Avoid a form that appears to send when delivery is not connected. |
| First | Published supplier profiles | `/suppliers/business-slug/` | Business-specific indexable content: description, actual photos, location/service areas, packages and real reviews when available. Drafts and preview URLs stay private/noindex. Stable vendor IDs remain underneath the readable URLs. |
| Improve existing | Supplier and venue directories | Existing `/wedding-suppliers/.../` | Keep current category/location routes; improve real listings, local information, page headings and helpful internal links. Give venues a strong discovery entry point. |
| Second | Wedding budget planner | `/planning-your-wedding/budget-planner/` | Useful public calculator, sample allocation clearly labelled as illustrative, guidance and an invitation to save a personal budget. |
| Second | Wedding planning checklist | `/planning-your-wedding/checklist/` | A readable checklist from early planning to the wedding day; ideally a public interactive checklist or printable version. Personal saved tasks remain in the account. |
| Second | Guest list and online RSVPs | `/planning-your-wedding/guest-list-rsvp/` | How invitations, groups, reply permissions and RSVPs work, with a genuine product overview. Never expose real guest lists, invitation tokens or couple data for SEO. |
| Second | Wedding-day timeline | `/planning-your-wedding/wedding-day-timeline/` | A typical, editable/downloadable run-sheet starting point, guidance for different ceremony times and a CTA to save a personal schedule. |
| Later | Wedding advice and cost guides | `/wedding-guides/` plus individual articles | Original Australian advice answering specific questions; costs need current sourced data, assumptions and update dates. |
| Later | Real weddings | `/real-weddings/` plus individual stories | Genuine submissions with permission, photography credits and links to participating suppliers. Launch when there are actual stories to feature. |
| Supporting | Programme terms, general terms and privacy | Footer-linked dedicated pages | Explain the actual service and agreed programme rules. Avoid generic copied text or invented business policies. |

Do not create separate promotional pages for every dashboard tab. Documents, messaging and shortlisting can be demonstrated within the planning hub until there is enough distinct helpful content to justify another page. Keep supplier acquisition under one canonical main page rather than near-duplicate Become a Supplier, Join Us and List Your Business pages.

## First useful guide topics

- How to start planning a wedding in Australia.
- A 12-month wedding planning checklist.
- Building a wedding budget and allowing for unexpected expenses.
- Questions to ask a wedding venue before booking.
- How to compare wedding supplier quotes.
- When to send wedding invitations and request RSVPs.
- Building a wedding-day timeline around your ceremony time.

Later location/venue themes can include garden, waterfront, barn/farm, winery, restaurant and intimate wedding venues where there are suitable real listings. Do not generate all combinations in advance.

## What already exists and what needs attention

Local source inspection found:

- The sitemap contains 272 supplier directory URLs, including category, state, city and combined routes. The generator largely reuses one template with changed titles/descriptions and route context. Those pages are a foundation, not evidence of search traffic or indexed coverage.
- The homepage has no credit-programme wording. Its main pitch is general supplier discovery and wedding planning.
- `dist/supplier/index.html` includes `noindex,nofollow` for both public and preview use. Published pages need a separate indexable output; previews should retain noindex. Do not remove the directive indiscriminately and expose private previews.
- The dynamic supplier page initially supplies a generic title and loading message, with business content fetched by JavaScript. Prefer pre-rendered published supplier HTML with business-specific title, description, canonical URL and share metadata. Rebuild or invalidate public output when a supplier unpublishes.
- The current sitemap does not include the homepage or future planning/editorial/public profile pages. Update sitemap generation so it includes intended indexable URLs rather than overwriting the file with directories only.
- The homepage has a Browse all suppliers link pointing to Google and placeholder navigation entries. Connect real destinations and replace disabled placeholder options as part of the navigation update.
- Some initial directory HTML includes a hard-coded supplier count; serve a real count or omit it until actual results are available.

Google can render JavaScript, but recommends ensuring important content is available to search and documents limitations around initial noindex tags. Useful pre-rendered content is the recommended direction here, not a claim that JavaScript pages can never rank.

Google references:

- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/essentials/spam-policies

Local pages should offer actual relevant suppliers and meaningful regional guidance. Near-identical city/category pages created only to capture searches add little value; review empty or weak combinations before expanding the directory. More URLs do not by themselves produce more useful search visibility.

## Navigation and visitor flow

Recommended main navigation: Find Suppliers; Plan Your Wedding; Wedding Credits; For Suppliers; Log in / Sign up. Add Wedding Guides when it has useful content. Keep About, Contact, FAQs and terms in a substantial linked footer.

Public flow: useful guide/tool/directory -> relevant supplier or planning page -> account creation when the visitor wants to save or manage their own plans. Do not require an account to read explanations, browse published suppliers or use the proposed basic public calculators/templates.

## Build order

1. Fix public indexability, placeholder links and sitemap coverage; update homepage messaging; add Wedding Credits, Planning Your Wedding and For Suppliers; add shared public navigation/footer and essential trust/FAQ pages.
2. Add the four planning-tool pages with useful ungated content and basic interactive/printable tools. Improve published supplier profiles and the directory pages supported by real inventory.
3. Publish original practical guides; add real wedding stories when available; expand meaningful location and venue-type coverage.

Use unique titles, descriptions, a clear H1, internal links, mobile-friendly layouts and accurate structured data where applicable. Use the final business domain consistently in canonical URLs and sitemap, then connect Google Search Console at launch. Do not promise rankings or FAQ rich results.
