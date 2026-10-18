# Couple dashboard checkpoint

This checkpoint includes the couple overview, shortlist, checklist/calendar, guests and RSVP invitations, budget, documents, wedding-day schedule, profile/settings and supplier conversations.

Messaging supports supplier photos/profile links, editable quote-request messages, five-minute message editing, sender grouping, category/status filters, closing/reopening chats and overview unread counts. A basic supplier inbox is available for conversation testing.

## Validation

- `npm test` runs the dashboard, messaging and account-security regression files (`tests/*.test.mjs`) against the saved website files.
- Syntax-check changed JavaScript before committing.
- The user tested the dashboard and messaging flows against Supabase during development. Live database access and account-isolation tests are separate from the mocked local tests.

Existing repository limitations: the older `tests/*.test.cjs` supplier tests fail because they require the browser route script as CommonJS while the package declares ES modules; some mock runs also lack `fetch`. The package's `npm run check` command references a missing `scripts/check.mjs`. These issues were not changed as part of this checkpoint.

## Remaining order

Updated 18 October 2026 at the user's request.

1. Finish the current public-page changes locally. Keep individual supplier page content and rebuilding deferred to the final review.
2. Review the locally built supplier onboarding described in `supplier-onboarding-plan.md`, including its optional import entry point, then complete signed-in acceptance checks. Importing remains a separate page, not a supplier dashboard tab. Reuse existing accounts, business IDs and private drafts.
3. **Defer supplier-dashboard work and its acceptance pass for now**, as requested on 18 October 2026. Retain the checklist below for when the user returns to it.
4. Resume and finish the couple dashboard, including changes from the business partner's review.
5. Build supplier quotes/invoices, couple acceptance and linked budget expenses, including revision and duplicate handling.
6. Complete notifications and the pending Supabase Auth, SendGrid and Stripe work. Follow `launch-checklist.md` for configuration, payment/credit verification, optional Couple Leads entitlements and policy decisions.
7. Review individual supplier pages at the very end for SEO, AI discovery, design/mobile/accessibility, gallery/packages/reviews, enquiry/quote links, accuracy and visibility/privacy. Rebuild them only when this final review is authorised.
8. **Final public-page acceptance testing comes last:** complete the full checklist at the very end of `launch-checklist.md`, across local and release-candidate URLs. This includes all pages, forms, navigation, images, responsive widths, accessibility, policies, credits and SEO.

### GitHub and live-release checkpoint — explicit approval required

- On 18 October 2026 the user explicitly approved committing and pushing this completed batch to `website-updates`; they will create the pull request themselves. Do not create/merge the pull request or deploy `main`. Future pushes/releases require their approval.
- Before preparing that approval, inspect current local changes and fetch the actual remote branch state. Review the business partner's commits and any overlap with this work; the currently cached remote state is not proof that no one else has changed it.
- Preserve both people's work; show the proposed integration and changed files. Resolve overlapping changes in a reviewable way and rerun relevant checks.
- Ask approval for the concrete branch/commit and release action. Push only after approval. No force-push or reset of the partner's work.

### Supplier dashboard acceptance — deferred at the user’s request

- [ ] Supplier registration, email verification, login, logout and return destinations; couple accounts cannot enter supplier-only screens.
- [ ] New suppliers see setup; existing suppliers retain their linked vendor ID, storefront and conversations. No claim flow or duplicate business creation.
- [ ] Setup saves/resumes; skipping optional import, packages or availability does not discard completed fields.
- [ ] Overview shows real counts and opens the intended enquiry; no sample customer data.
- [ ] Inbox loads the correct couple; incoming messages appear live; unread counts and read state work; five-minute editing and sender grouping remain correct.
- [ ] Booking Centre creates/edits manual bookings and filters correctly. Clearly distinguish drafts/manual records from a paid, accepted booking.
- [ ] Availability handles available, tentative, booked and blocked dates, date ranges and capacity without timezone/date shifts.
- [ ] Storefront editing, main-photo selection, gallery ordering/removal, packages, private preview and explicit publish/unpublish; only complete, published businesses appear publicly.
- [ ] A draft stays private across reloads and devices; another account cannot read or alter it. Conflicting saves from two tabs are reported.
- [ ] Reviews display genuine records and an appropriate empty state; imported third-party ratings are not presented as WedSparks reviews.
- [ ] Pricing Packages create/edit/delete/save reliably. Quotes, invoices, acceptance and budget updates remain pending until implemented and tested separately.
- [ ] Profile Settings email/password changes, verification and recovery preserve the correct account/session.
- [ ] Couple Leads is optional; no charge or private couple data access without implemented billing entitlement and explicit couple opt-in.
- [ ] Desktop/mobile navigation, keyboard operation, loading/error/retry states and business partner review.

See `docs/database/README.md` for the scope and order of the SQL scripts saved with this checkpoint.

## Supplier dashboard shell

Supplier accounts use the couple dashboard design, with Overview, Inbox & Enquiries, Booking Centre, Availability, Your Storefront, Reviews, Pricing Packages, Couple Leads and Profile Settings. Existing messaging remains active and Overview reads live conversation totals. The supplier workspace now has storefront editing and explicit preview/publication controls, a calendar, manual booking records, private quote drafts and editable packages. Reviews use real published data, with an empty state when there are none. See `docs/supplier-dashboard.md` for database setup and the remaining payment, acceptance and review-submission integrations.

## Shared Profile Settings

Both account types have shared current-password-verified email and password controls. Email updates remain pending until confirmed. New passwords use a ten-character minimum across signup, recovery and profile changes. Supplier legacy settings URLs open the consolidated Profile Settings tab; storefront completeness is shown in Your Storefront. Couple Leads is a locked preview until opt-in discovery and paid access are implemented. See `docs/account-security.md` for Supabase Auth configuration and live checks.

## Business model and public review — 17 October 2026

The confirmed model is a free supplier listing and core tools, with 18% supplier commission on invoices paid through WedSparks; Couple Leads is an optional $50/month opt-in discovery subscription. Couple conversations now contain a payment/credit reminder. Cancellation and dispute policy drafts, notification planning, later gift registry exploration and off-platform retention ideas are recorded in `business-model-and-retention.md`. See `public-site-review.md` for the page inventory and complete current review checklist.
