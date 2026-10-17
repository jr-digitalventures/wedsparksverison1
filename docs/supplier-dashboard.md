# Supplier dashboard review build

The actual supplier dashboard uses the shared couple-dashboard design. There is no separate sample-data review page.

## Available screens

- Overview: real enquiry and unread-message counts and shortcuts.
- Inbox & Enquiries: existing live conversation flow, filters, message grouping and editing.
- Booking Centre: manual booking records, search/status filters and private quote drafts using saved packages.
- Availability: month navigation, individual/range selection, Available/Tentative booking/Booked/Blocked and daily capacity.
- Your Storefront: business details, custom/selectable categories including venue types, private gallery, policies, FAQs, completion progress, Save draft, Preview page, Publish and Unpublish.
- Reviews: real published review summaries, rating filters and an empty state. Vendors cannot manufacture couple reviews.
- Pricing Packages: editable prices, pricing basis, descriptions, inclusions and storefront visibility.
- Couple Leads: locked $50/month subscription presentation with no exposed couple information.
- Profile Settings: existing shared account-security forms.

## Database setup

Apply `docs/database/04-supplier-workspace.sql` once in Supabase SQL Editor. This adds owner-checked workspace APIs, private draft photo storage, explicit publication snapshots and public business-photo storage. It also removes old broad marketplace write grants (including TRUNCATE) and limits marketplace visibility to linked, complete, active suppliers. Supplier UUIDs stay unchanged, including Sugar Lane Cakes' existing connection.

The user applied the corrected SQL in Supabase and reported all four setup checks as true on 17 October 2026. These confirm setup, not full live workflow testing. The script does not publish, rename or create any business automatically.

Until that setup is applied, missing new APIs put the actual dashboard into clearly labelled browser-only save mode. Those drafts stay on that browser/account and cannot be published or shared across devices. Permission/auth/network errors do not silently fall back. Browser-only photos are limited to 650 KB because browser storage is small; connected uploads allow 5 MB each. Existing public business content seeds a fresh draft.

Draft photo files are private. Choosing Publish creates immutable public copies and transactionally updates the public snapshot and marketplace fields. Unpublish removes listing/page access, while preserving conversations and drafts. Previously published photos already downloaded or shared cannot be recalled; storage cleanup is deferred. Save draft and package edits never update a live page automatically.

## Deliberately pending

Quotes are private drafts, not sent offers. Couple acceptance, invoice delivery, payment collection, automatic couple-budget entries, booking-to-availability synchronisation, verified review submission and paid lead access remain later integration work. Manually marking a booking Confirmed does not charge anyone or imply a couple accepted an offer. Availability is saved for the supplier; the public date-checking widget is still pending.

SendGrid, Stripe, and the three Supabase Authentication configuration checks stay on the end-of-project launch checklist. Pushing the working branch to GitHub does not deploy it; the Pages workflow deploys changes to main.
