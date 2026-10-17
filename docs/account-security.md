# Account-security setup and checks

This update adds shared email/password controls to both couple and supplier Profile Settings. It does not change the database schema.

## Supabase Auth configuration — deferred until the end

These checks are pending in `docs/launch-checklist.md`, to complete at the end of the project. In the project’s Authentication settings, check:

- Minimum password length: **10**, matching signup, recovery and profile forms.
- **Require current password when changing password**: enabled.
- **Secure email change**: enabled, so existing and new email addresses must confirm the change.
- Auth redirect allowlist includes the existing callback and reset-password URLs for both local preview and the live website.

The app uses the existing `auth/callback/` page for email-change confirmations and returns users to their profile page. Keep the callback redirect rules used for signup with a `returnTo` query. Live base URL: `https://jr-digitalventures.github.io/wedsparksverison1/`; local preview: `http://127.0.0.1:4173/`.

Do not disable email confirmation to make a test pass. The Supabase project remains responsible for sending confirmation and recovery emails; production email delivery setup is still part of the SendGrid work.

## Implementation

A separate, nonpersistent Auth client verifies the supplied current password and performs the requested update for that verified account. It uses a unique storage key and revokes only its own temporary session afterwards. The normal browser sign-in is kept separate. Passwords are not written to local/session storage or logs.

The displayed sign-in email stays at its current value while the new address awaits confirmation. When Supabase requires a verification code for a password update, the form offers an explicit code request and submission step.

Old supplier `settings/`, `account-settings/` and `profile-health/` URLs still open the consolidated Profile Settings view. The completion checklist now lives in Your Storefront. Couple Leads is a preview: it has no lead-data endpoint and cannot reveal couples or accept subscription payments yet.

## Live checks

Use a test account for each role:

1. Try an incorrect current password: the update must be refused.
2. Submit a new email: verify the existing email remains visible with a pending-confirmation notice.
3. Complete all required confirmation emails, then reopen Profile Settings and verify the new email appears.
4. Change the password, then check that the new password works and the old password is refused.
5. Check mismatched new passwords and verification-code retry handling.
6. Move between dashboard tabs and check that typed passwords are cleared.
7. Confirm the old supplier settings URLs still open Profile Settings and the other dashboard tabs still work.

Local automated checks use mocked Auth responses. They do not verify real email delivery or change any real account credentials.
