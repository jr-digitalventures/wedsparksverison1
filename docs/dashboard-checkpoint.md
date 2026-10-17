# Couple dashboard checkpoint

This checkpoint includes the couple overview, shortlist, checklist/calendar, guests and RSVP invitations, budget, documents, wedding-day schedule, profile/settings and supplier conversations.

Messaging supports supplier photos/profile links, editable quote-request messages, five-minute message editing, sender grouping, category/status filters, closing/reopening chats and overview unread counts. A basic supplier inbox is available for conversation testing.

## Validation

- `npm test` runs the dashboard, messaging and account-security regression files (`tests/*.test.mjs`) against the saved website files.
- Syntax-check changed JavaScript before committing.
- The user tested the dashboard and messaging flows against Supabase during development. Live database access and account-isolation tests are separate from the mocked local tests.

Existing repository limitations: the older `tests/*.test.cjs` supplier tests fail because they require the browser route script as CommonJS while the package declares ES modules; some mock runs also lack `fetch`. The package's `npm run check` command references a missing `scripts/check.mjs`. These issues were not changed as part of this checkpoint.

## Remaining order

1. Finish and verify the couple dashboard before developing supplier quoting/invoicing.
2. Build supplier quotes/invoices, couple acceptance and linked budget expenses, including revision and duplicate handling.
3. Complete the Supabase Auth checks, SendGrid and Stripe setup at the very end. Track these pending tasks in `docs/launch-checklist.md`.

See `docs/database/README.md` for the scope and order of the SQL scripts saved with this checkpoint.

## Supplier dashboard shell

Supplier accounts use the couple dashboard design, with Overview, Inbox & Enquiries, Booking Centre, Availability, Your Storefront, Reviews, Pricing Packages, Couple Leads and Profile Settings. Existing messaging remains active and Overview reads live conversation totals. The supplier workspace now has storefront editing and explicit preview/publication controls, a calendar, manual booking records, private quote drafts and editable packages. Reviews use real published data, with an empty state when there are none. See `docs/supplier-dashboard.md` for database setup and the remaining payment, acceptance and review-submission integrations.

## Shared Profile Settings

Both account types have shared current-password-verified email and password controls. Email updates remain pending until confirmed. New passwords use a ten-character minimum across signup, recovery and profile changes. Supplier legacy settings URLs open the consolidated Profile Settings tab; storefront completeness is shown in Your Storefront. Couple Leads is a locked preview until opt-in discovery and paid access are implemented. See `docs/account-security.md` for Supabase Auth configuration and live checks.
