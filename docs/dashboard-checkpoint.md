# Couple dashboard checkpoint

This checkpoint includes the couple overview, shortlist, checklist/calendar, guests and RSVP invitations, budget, documents, wedding-day schedule, profile/settings and supplier conversations.

Messaging supports supplier photos/profile links, editable quote-request messages, five-minute message editing, sender grouping, category/status filters, closing/reopening chats and overview unread counts. A basic supplier inbox is available for conversation testing.

## Validation

- `npm test` runs the five dashboard/messaging regression files (`tests/*.test.mjs`) against the saved website files.
- Syntax-check changed JavaScript before committing.
- The user tested the dashboard and messaging flows against Supabase during development. Live database access and account-isolation tests are separate from the mocked local tests.

Existing repository limitations: the older `tests/*.test.cjs` supplier tests fail because they require the browser route script as CommonJS while the package declares ES modules; some mock runs also lack `fetch`. The package's `npm run check` command references a missing `scripts/check.mjs`. These issues were not changed as part of this checkpoint.

## Remaining order

1. Finish and verify the couple dashboard before developing supplier quoting/invoicing.
2. Build supplier quotes/invoices, couple acceptance and linked budget expenses, including revision and duplicate handling.
3. Set up SendGrid and Stripe toward the end, including email delivery and payment integration checks.

See `docs/database/README.md` for the scope and order of the SQL scripts saved with this checkpoint.

## Supplier dashboard shell

Supplier accounts now use the couple dashboard design, with Overview, Inbox & Enquiries, Booking Centre, Availability, Your Storefront, Reviews, Pricing Packages, Account Settings, Profile Health and a separate Settings section. Existing messaging remains active. Overview reads live conversation totals, and storefront/account/profile-health views read the linked supplier profile. Booking, availability, review and package tools remain placeholders for later work.
