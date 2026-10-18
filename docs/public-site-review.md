# Public website review — recent build

Updated 17 October 2026. Start with [the full page list](public-site-pages.md). All preview links use `http://127.0.0.1:4173/`. No commit, push or deployment has been made in this batch.

## What changed

- Homepage: the original Homepage 2 design is now the main homepage, with the Create Your Day, Your Way headline. Credits appear in the hero, one of the four benefit points and the lower callout. The hero button links to How WedSparks credits work. The alternate homepage is retired; old Homepage 2 bookmarks redirect home. The current logo and shared footer are applied.
- Public site: Wedding Credits, Planning Your Wedding, For Suppliers, four tool pages, About, Contact, FAQs, Wedding Guides and seven articles, Real Weddings hub, separate importing, and five policy/terms drafts. There are 25 generated public pages, plus the selected homepage; the original comparison URL now redirects home.
- Design: green headers; reverse horizontal W-and-gold-spark logo; matching favicon; photographic banners and section/card images. Public content follows the homepage's 135px desktop, 45px tablet and 30px mobile gutters. Content-page and directory photo banners share one fixed height per breakpoint (310px desktop/tablet, 260px mobile). The homepage retains its full-screen search hero; dashboards retain their own layout.
- Find Suppliers: replaced the oversized banner treatment, added an introduction and payment/credits reminder before filters/listings, and replaced the misleading hardcoded 467 placeholder with an empty count until actual data arrives.
- Product wording: one place to organise fragmented wedding planning, payment-only credits, free supplier listings/core tools, 18% supplier commission on paid invoices and an optional $50/month opt-in Couple Leads subscription.
- Couple messaging: concise reminder in the open conversation, with a link to the credit explanation. It does not imply a verified personal progress balance is already connected.
- Search: public HTML content, titles/descriptions/canonical URLs, internal links and sitemap coverage. Private/draft pages keep their indexing protections. Accurate structured data and search/AI crawler launch checks are still planned, not claimed complete.
- Importing: a separate page for supplied text/files and reviewable private draft fields. Twenty AU and twenty NZ candidate sources are recorded (39 unique, VenueNow shared); automatic website adapters remain pending. No import action was added to the supplier dashboard.
- Cancellation/disputes: new noindex review drafts, plus business decisions and official reference sources in `business-model-and-retention.md`.

## Review checklist — appearance and navigation

- [ ] Review the selected original-style homepage: headline, three credits placements, hero button, four benefit points, search card and shared footer.
- [ ] Review the horizontal header logo: W on the left, white WedSparks wordmark, gold spark. Review favicon in the browser tab.
- [ ] Check desktop and mobile header navigation, with the comparison link removed, sign-in/account controls and menu close behaviour.
- [ ] Compare `/wedding-suppliers/`, `/planning-your-wedding/`, `/for-suppliers/` and `/wedding-credits/`: matching content gutters and banner heights, readable headings, useful image crops and no horizontal scrolling.
- [ ] Review category/location filters, list loading, count/empty states and business links after the directory introduction.
- [ ] Review imagery across guides and tools. Generated decorative photographs are not genuine Real Weddings submissions or named supplier portfolio work.

## Review checklist — content and useful tools

- [ ] Confirm the homepage, About, Planning and For Suppliers explain the couple/vendor problems and the same business model.
- [ ] Confirm credit copy: $1,000 per complete $10,000 of money paid through WedSparks; use credits only through WedSparks payments; no cash withdrawals; manual/outside payments excluded.
- [ ] Try the credits calculator around milestone boundaries: $9,000, $10,000, $20,000 and $25,000.
- [ ] Try the public budget calculator, guest count, allocations and AUD/NZD display. This is an illustrative plan, not a verified reward balance.
- [ ] Try checklist ticking/reload/clearing/printing and timeline time changes/editing/printing. Public checklist ticks are separate from personal account tasks.
- [ ] Review the seven guides for clarity and original usefulness. Real Weddings is a hub only; actual stories need submissions and permissions.
- [ ] Review the separate import page with business-owned text/files; amend and deselect fields. External URL recognition does not import a website. Actual cloud draft saving remains a signed-in ownership/version-checked flow.
- [ ] In a couple conversation, check the credits reminder and its link; supplier conversations should not show the couple-only reminder.
- [ ] Contact currently downloads an enquiry draft. Add real delivery/contact details before launch.

## Business decisions and work still needed

- [ ] Confirm the 18% commission tax basis, processing fees, payouts, deposits/instalments and refund treatment. Free listing/core tools and optional $50/month leads are confirmed pricing direction.
- [ ] Review reward funding and mixed cash/credit payments. A gross $10,000 payment gives $1,800 commission and a $1,000 credit milestone before tax/processing/support costs. Decide how redemption and refund reversals affect this model.
- [ ] Review cancellation, dispute, privacy, platform and credit policy drafts; finalise legal entity, markets, support procedure and refund/commission/credit rules. Have final policies reviewed against the actual operating/payment arrangements.
- [ ] Review the retention ideas: better payments/receipts/reminders, milestone progress, verified booking history, reporting off-platform requests and fair supplier terms. Do not assume automatic penalties or guaranteed payment protection.
- [ ] Build the notification system for messages, quote/invoice changes, due dates, bookings and credits, with both account types' preferences and read state.
- [ ] Consider gift registry links later. A hosted cash/gift registry and any reward eligibility need separate product/payment decisions; no registry has been built.
- [ ] Connect and test Stripe, server-side 18% collection, paid-lead entitlements, verified reward earning/redemption and refunds. Quote/invoice sending, acceptance and budget integration remain pending.
- [ ] Complete SendGrid/domain delivery and the deferred Supabase Auth settings and live account-isolation checks in `launch-checklist.md`.
- [ ] Before launch, finalise domain/canonical URLs, accurate structured data and current search/AI crawler access checks; submit/monitor indexing and referrals.
- [ ] Keep individual supplier pages unchanged until their final review for SEO/AI discovery, design, gallery/packages/reviews, enquiry links, accessibility and publication freshness.

Local automated checks do not replace live payment/webhook, policy, accessibility and account-isolation verification. The build is ready for partner review; pending backend integrations are not marked complete.

Latest direction: original Homepage 2 design selected as the homepage; alternate variant retired. Shared footer is on every page, including account/auth pages. Supplier commission is **18%**. At $10,000 paid, gross commission is $1,800, leaving $800 after a $1,000 reward milestone before other costs. Earlier comparison/temporary-menu notes are superseded.

## 18 October refinement

Search fields now have one concise visible label, and the homepage uses matched intro/credit typography, a short credit benefit and Explore/Connect/Plan/Earn. Planning and supplier pages now use product previews, a feature/story split and pricing panels; tool-page endings use practical steps and related tools. Guests/RSVPs is explicitly a walkthrough, not an ungated guest database. Credits exclude credit-funded amounts in both the calculator and copy; the middle image is removed and the closing CTA has a photo background. Supplier cards have equal adjacent profile/chat actions: visitors sign up, signed-in couples keep normal access. A planning tools dropdown and public structured data are added. See `seo-ai-discovery.md` for the recommendations and remaining launch work.

Review this refinement in order: homepage search/hero/Explore-Connect-Plan-Earn; credits calculator and closing photo CTA; Planning tool previews; For Suppliers story/pricing layout; all four tool-page endings; floating planning navigation; guest signup buttons in the directory. Other pages remain About, Contact, FAQs, seven guides, Real Weddings hub, separate importing and the five policy drafts. All 12 automated test files pass after this batch; browser checks cover the refined homepage, cash-only calculator, dropdown keyboard access, supplier story layout and mobile planning width. Final-domain indexing, live payment/account checks and genuine inventory pre-rendering remain launch work.


## Review update — 18 October 2026

Applied locally, without a commit or push:
- Homepage summary is one flowing paragraph, no bold currency figures or forced line break. Benefit copy now says “earned”.
- Header uses the supplied horizontal logo treatment, white on green with gold spark. Favicon has a green background and white W/gold spark.
- Supplier card actions have matching widths and the label Start a chat. Guests go to signup with the intended profile/chat return path. Live Sugar Lane Cakes links verified against its published route, without rebuilding the profile.
- Planning preview panels have equal 370px desktop heights; extra planning FAQs and a prominent full-guide link were added. Budget tool columns align at the top; dark closing banners have readable secondary buttons.
- Credit calculator has one planned-money input and a credits/combined-purchasing-power result. $50,000 yields $5,000 and $55,000 combined. Credit-funded spending never earns further credits.
- About explains simpler planning, extra purchasing power for couples and free supplier listings. FAQs have separate couple/supplier sections with alternating photographs. Contact contains only its enquiry form and signup banner.
- Real Weddings now has an editorial feature, latest planning reads and submission invitation. No real wedding stories have been fabricated; genuine posts still require copy, photography rights and permissions.
- Five policies are substantial original review drafts with contents links, text sections and one signup banner. Cancellation/dispute detail remains on linked standalone pages incorporated by reference into platform terms. They remain noindex and not effective.
- Import page no longer has the candidate-count sentence or closing Make it yours banner. Review imported details only parses supplied text/files; it does not register an account. Saving requires a supplier account; unsaved text does not persist through registration.
- Marketplace Search was an older standalone search page still used by some fallback links. Those fallbacks now use Find Suppliers; the old URL redirects for compatibility. Homepage search now opens the supplier directory, with its first selected category and recognised location. Multi-category matching, budget and live availability search need a separate complete search-flow review; no availability guarantee is implied.

Before launch: connect Contact to an approved receiving address and delivery service (currently download only); supply legal entity/address/privacy/support contacts; approve GST, processor charges, commission base and refund/credit adjustment rules; verify Stripe, ledger, lead entitlements and supplier settlement; approve policy drafts with appropriate legal review. Keep individual supplier page content/design/SEO and rebuilding at the very end of the plan.

Verification: automated suite plus desktop/mobile visual checks. Screenshots are saved in the task visualization folder.


## Navigation and content frame follow-up — 18 October 2026

- Wedding Guides is nested under Plan Your Wedding on desktop and mobile; the credit navigation label is Spend Less (the URL remains /wedding-credits/).
- Every generated public page now has the common top photo banner, including FAQs, Contact, Real Weddings and all five policy documents. Titles are moved into the banner so each page retains one H1.
- Public section frames use the homepage gutters: 135px on wide screens, 45px on medium screens and 30px on mobile. Contact, policy, About and journal wrappers no longer have independent narrower maximum widths. Dashboard content is excluded.
- The paste-details textarea has been removed from the separate importer. File uploads remain available, with Review disabled until a supported file has been read. Website-link extraction is still pending; no competitor credentials are requested.


### Supplier directory restoration (18 October 2026)

Restored the marketplace search page from merge #24 (`7f781f0`), retaining the current logo, header, footer and shared banner height. Category/location directories retain Jakob's carousels, category photos, location drill-down and spotlight priority/rotation; the introduction and credits panel remain above the filters. Corrected damaged price-range characters and profile fallback links. Empty category routes now correctly show no matches instead of unrelated businesses. Marketplace search carries category, location, date and price to the directory.

Spotlights require a public supplier's highlighted flag. Sugar Lane Cakes is currently the only public supplier and its flag is false; no promotion or database record was changed. More Filters retains the reference implementation's presentation-only category options; those options still need database-backed filtering before launch. Merge #24 contains no separate individual supplier-profile document; it links through each record's Destination URL. Individual supplier pages were left unchanged.

Review locally: `/wedding-suppliers/`, `/supplier-category/`, `/wedding-suppliers/wedding-cakes/`, `/wedding-suppliers/sydney-nsw/`, `/wedding-suppliers/wedding-cakes/sydney-nsw/`, `/marketplace-search/`. Check mobile search overlay, no-match categories/locations, saved suppliers, signup-return links and spotlight rotation with eligible test records. Nothing pushed in this restoration.
