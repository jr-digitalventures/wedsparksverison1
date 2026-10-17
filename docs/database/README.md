# Database changes saved with the dashboard

These SQL scripts preserve the recent messaging changes already applied manually in Supabase. They are incremental updates for the existing WedSparks database, not a complete database backup or a fresh-project setup.

Apply in this order only when bringing another database with the existing messaging schema up to date:

1. `01-message-editing.sql`: message editing with a server-enforced five-minute limit.
2. `02-message-management.sql`: conversation filters, read receipts, unread totals and closing chats.
3. `03-reopen-chats.sql`: reversible closing, restoring the previous conversation status on reopening.
4. `04-supplier-workspace.sql`: private supplier drafts, photo storage, explicit storefront publication, booking/package/calendar workspace and published reviews. The user applied the corrected setup and reported all four setup checks as true on 17 October 2026. Earlier messaging scripts do not need to be rerun for the current project.

The second script temporarily introduces permanent closing; the third replaces that behavior. Run the complete sequence before using the updated website against another database.

Prerequisites include the existing account tables, marketplace profiles, supplier account mappings, conversation/message/read tables, RLS policies, private authorization helper and message-sending RPC. Earlier dashboard, RSVP and storage setup is not included here. Export and retain the full Supabase schema separately before recreating the project.

Pushing website code to GitHub does not apply SQL to Supabase. These scripts also do not back up user records or storage objects.

The messaging scripts contain transactional behavior checks. Test changes to an existing conversation are rolled back before the SQL commits. The supplier workspace setup returns four configuration checks after committing; it does not publish or alter any business content automatically.
