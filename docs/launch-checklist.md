# End-of-project setup and launch checks

These items are deferred until the end of the build. They are pending, not confirmed as configured.

## Supabase Authentication

- [ ] Minimum password length: **10**.
- [ ] Require current password when changing password: **enabled**.
- [ ] Secure email change: **enabled**.
- [ ] Confirm local/live email callback and recovery redirect URLs.
- [ ] Test email changes, confirmation, password changes and recovery for couples and suppliers.

## SendGrid

- [ ] Create the account and authenticate the sending domain.
- [ ] Connect Auth and transactional email delivery and test the final templates.

## Stripe

- [ ] Implement the confirmed 18% supplier commission on invoices paid through WedSparks; confirm tax, processing fees, payout and refund treatment.
- [ ] Connect verified credit progress, payment-only earning/redemption, mixed credit/cash payments and refund reversals. Review the reward economics in `business-model-and-retention.md`.

- [ ] Create/configure the account and connect payment and subscription flows.
- [ ] Configure the $50/month Couple Leads subscription and server-side access checks.
- [ ] Verify webhooks, subscription expiry/cancellation, invoice payments and refunds as applicable.

## Final verification

- [ ] Finalise cancellation/dispute policies and supplier participation terms, including any proportionate off-platform fee-avoidance clause, with legal review for the operating markets.
- [ ] Design and connect notification delivery/read state/preferences for both account types; retain notification requirements in the roadmap.
- [ ] Consider gift registry integration later, after core supplier payment and planning workflows are reliable.

- [ ] Account isolation, opt-in lead privacy, mobile layout and live end-to-end tests.

## Public website launch

- [ ] Review SEO and AI discoverability across public pages: crawlable original content, direct answers, factual business identity, accurate structured data, meaningful internal links, canonical/sitemap consistency and current official crawler guidance. Track search/referral results; no guaranteed AI mentions.

- [ ] Add the genuine business identity, support address and delivery route to Contact; the current enquiry tool only prepares a download.
- [ ] Approve and publish final privacy, platform and credit-programme terms. Draft policy pages stay noindex.
- [ ] Implement and verify payment-only credit earning/redemption for the supported market/currency before launch. Marketing describes the intended launch experience; only money paid through WedSparks earns credits and credits can only be used through WedSparks payments, never withdrawn as cash.
- [ ] Configure the final domain, canonical URLs, sitemap and Google Search Console.
- [ ] Connect supplier publication/unpublication to public-profile rebuilds and cache/index removal. Automatic rebuilding is deferred until the final individual-page review.
- [ ] Collect genuine Real Weddings submissions with couple and photographer permissions; no sample stories are published.
- [ ] Ship and verify permitted automatic import adapters per source before advertising them as supported. The current tool imports supplier-provided text/files only.
- [ ] Connect the separate import page into supplier dashboard navigation later, when requested. Keep importing out of the dashboard for now.

## Final review — individual supplier pages

- [ ] Include discoverability and usefulness as a cited source for ChatGPT and other AI search products in this final review, alongside organic SEO. Preserve the agreed final-review timing.

- [ ] At the very end of the plan, review individual public supplier pages for SEO: unique business content, headings, metadata, canonical URLs, indexability, internal links, image descriptions and publication/unpublication freshness. Leave their content and design unchanged until this review is requested. Also review design consistency with the storefront and couple experience, mobile layout, accessibility, gallery, packages, real reviews, enquiry/quote links, data accuracy, visibility/privacy and loading/error states. Automatic supplier-page rebuilding is deferred too.


## Final task — public-page acceptance testing

Added 18 October 2026. This checklist sits at the very end of the to-do list. Supplier onboarding is built locally. Supplier-dashboard work/testing is now deferred at the user’s request; continue the remaining roadmap and return to that dashboard when requested. Complete these page checks at the final acceptance stage; development checks do not mark them as user-tested.

### Pages and navigation

- [ ] Homepage; Find Suppliers and category/location routes; Spend Less/Wedding Credits; Planning Your Wedding; For Suppliers.
- [ ] All four tools: Budget Planner, Checklist, Guest List & RSVP walkthrough, Wedding-Day Timeline.
- [ ] Wedding Guides hub and all seven individual articles; About, Contact, FAQs, Real Weddings and the separate Supplier Profile Import page. Use `public-site-pages.md` for direct URLs.
- [ ] All five policy pages: Privacy, Platform Terms, Credit Terms, Cancellations & Refunds, Disputes. Related-policy links and contents anchors work.
- [ ] Wedding Guides sits under Plan Your Wedding on desktop/mobile. Spend Less opens the credits page. Dropdown works with mouse, keyboard and touch; Escape/outside clicks close appropriate menus.
- [ ] Header logo is clean white with gold spark over photos/green; favicon is the green W. Footer appears once and every footer/header/CTA link opens the intended destination.
- [ ] Homepage 2 redirects to the selected homepage; old Marketplace Search bookmarks redirect to Find Suppliers. Browser back/forward and nested URLs work on local and deployed base paths.

### Design, content and accessibility

- [ ] Top photo banners are present, have consistent heights and readable titles, and crop acceptably on wide/medium/mobile screens.
- [ ] Section content/outer frames match homepage gutters across public pages. Dashboard layouts remain separate. No horizontal scrolling, clipped buttons or unexpected narrow sections.
- [ ] Tool preview boundaries, titles and buttons align. Budget columns align at the top. Closing CTA buttons have visible text and hover/focus states.
- [ ] Homepage summary is one paragraph without bold amounts or forced line breaks; benefit copy says earned rather than back. Explore, Connect, Plan, Earn content is consistent.
- [ ] About accurately explains simpler planning, credits and supplier pricing. FAQs are grouped Couples first, Suppliers second with alternating images.
- [ ] Real Weddings has the intended editorial layout; publish only approved genuine stories with image permissions, photographer/supplier credits and correct dates. Planning articles are labelled as guides.
- [ ] Keyboard navigation, focus visibility, skip links, headings, labels, accordion operation, image descriptions and readable contrast. Check long text, large fonts and narrow screens.

### Discovery, account links and tools

- [ ] Homepage search route, category/location choices, back/forward and no-match results. Specifically review the remaining multi-category, budget and availability search work before advertising full matching.
- [ ] Directory loads actual published complete suppliers; no inert template/sample suppliers appear as real listings. Check filters, pagination, image navigation, loading, network failure and empty states.
- [ ] View profile and Start a chat are equal-width, non-overlapping buttons. Guests enter signup with the correct return path; signed-in couples open the intended supplier/profile/chat.
- [ ] Credit calculator: 0, 9,999, 10,000, 25,000 and 50,000 qualifying money (where the control accepts the value). $50,000 produces $5,000 credits and $55,000 combined. No recursive earning on credit-funded amounts; no cash-withdrawal claim.
- [ ] Verify actual earning/redemption against implemented payment records, not only the illustrative public calculator. Outside payments and manually entered expenses do not qualify; refund adjustments are covered in the payment test plan.
- [ ] Budget input, currency and guest-count changes; percentage allocations including under/over allocation; malformed/negative values and printed output.
- [ ] Public checklist ticks, refresh/browser storage, reset and printing. Verify public ticks are not silently presented as saved dashboard tasks.
- [ ] Timeline time changes, editable moments, previous/next-day labels and printing. Guest/RSVP page accurately distinguishes its walkthrough from private invitation management.

### Import, contact and unfinished integrations

- [ ] Import page has no paste-details field. Supported text/CSV/JSON/HTML file uploads, unsupported/oversized/unreadable files, file changes while reading and clear partial/no-data errors.
- [ ] Imported fields can be reviewed/edited/selected; existing values are protected unless explicit replacement is chosen. Nothing publishes automatically; sign-in return and unsaved-file handling are clear.
- [ ] External source links are identified accurately; unsupported website extraction is not presented as a functioning connection. Never ask for a competitor password or import third-party reviews as native ratings.
- [ ] Contact: configure and test the actual approved inbox/delivery route before launch, including success/failure/retry/spam controls. Until connected, confirm the download-only wording is honest and the form does not claim to send.
- [ ] No placeholder legal identity, support contacts or operational payment promises remain at launch. Confirm 18% commission, tax/processing/refund rules and optional $50/month lead access across every relevant page.

### SEO, release and handover

- [ ] Unique meaningful titles/descriptions, one H1, correct canonical and social previews, crawlable article content, factual structured data and useful internal links.
- [ ] Final domain/base path, sitemap and robots; private accounts/invitation links and unapproved policy drafts are not indexed. Approved policy indexability is an explicit publication decision.
- [ ] Category/location content reflects real inventory, with useful unique information rather than duplicated keyword pages. Individual supplier page review remains the final content-review item.
- [ ] Optimised image loading, broken links/assets, console errors and page speed on a real mobile connection; no claims of guaranteed Google/AI placement.
- [ ] Complete the individual supplier page review listed above, including storefront/public-profile consistency and publication/unpublication freshness.
- [ ] Before any GitHub push/live release, check the business partner's latest remote work, review overlaps and ask the user for approval of the concrete integration/release. Do not overwrite or force-push their work.
- [ ] After an approved deployment, smoke-test the final public URLs and signup returns; record business partner feedback and remaining launch blockers.


#### Restored supplier discovery review
- [ ] Review `/marketplace-search/` and `/wedding-suppliers/`, category pages, location pages and combined category/location routes with the shared photo banner and credits introduction.
- [ ] Check category/location/price/date/style filtering, empty results, carousel controls, profile/signup links and saved suppliers on desktop/mobile.
- [ ] With eligible highlighted records in a test environment, check spotlight priority, rotation, persistence and exclusion from regular results.
- [ ] Connect category-specific More Filters to stored supplier attributes; the restored controls currently remain presentation-only.
