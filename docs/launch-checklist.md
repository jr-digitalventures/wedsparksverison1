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

- [ ] Create/configure the account and connect payment and subscription flows.
- [ ] Configure the $50/month Couple Leads subscription and server-side access checks.
- [ ] Verify webhooks, subscription expiry/cancellation, invoice payments and refunds as applicable.

## Final verification

- [ ] Account isolation, opt-in lead privacy, mobile layout and live end-to-end tests.
