# Supplier onboarding — proposed flow

Prepared 18 October 2026 after inspecting signup, auth destinations, the supplier workspace model/service, storefront editor and the separate importer. The first wizard implementation is now built locally. Automatic website extraction remains pending. The proposal below records the intended direction; the implementation notes describe what is currently available.

## Experience and delivery order

Keep setup short, reuse the couple-dashboard visual language, save a private draft and let suppliers choose when to publish. No profile claim flow, no duplicate vendor account, no forced lead subscription or payment details just to list. Importing is offered during onboarding and remains available on its separate page; do not add a new supplier-dashboard import tab.

1. **Create your account.** Reuse existing first name, last name, email and password signup, then email verification. Returning users sign in. Explain the business model before asking for a commitment: listing/core tools free, 18% supplier commission on invoices paid through WedSparks, optional $50/month Couple Leads. Final acceptance must use approved terms and disclosed fee details, not make the current draft policies effective automatically.
2. **Start your business profile.** Offer Import an existing profile or Start from scratch, with Skip for now. The import path asks for a public business profile/website link and confirmation of authority to reuse the business content. Never request competitor credentials. Supported business-owned files remain a working fallback; the removed paste-details textarea is not reintroduced.
3. **Your business essentials.** Business display name, primary category, country, city/suburb, state/region and service areas. Prefill from reviewed import results or an existing draft. Website is optional; personal account email is not automatically published as a business contact. Country/region handling must support the intended AU/NZ markets explicitly.
4. **Show couples what you do.** Short introduction, about text, main photo and optional gallery. Imported fields remain editable. One main photo is needed to publish; up to 10 images match the current workspace. Offer optional key features, FAQs and business policies without making suppliers complete every field on the first visit. Preserve photo permissions and attribution.
5. **Your services, at your pace.** Optional starting price, pricing packages and a first availability setup. Clearly show price currency; the current storefront price/publishing path is AUD, so NZD requires a coordinated data/UI/payment change before being offered. Packages, detailed calendar setup and booking capacity can be completed later in the dashboard. Do not collect bank/payout credentials here; use the payment provider's dedicated process when payments are implemented.
6. **Preview and choose.** Show the actual draft supplier-page preview and a clear list of missing publication requirements. Actions: Publish my profile when complete, or Save draft and go to dashboard. Never publish just because an import or onboarding step completed. A supplier can keep the profile private while preparing it.

## Existing fields and when to collect them

| Information | Existing storage | Setup treatment |
| --- | --- | --- |
| First name, last name, email, password | Existing shared signup/Auth | Required to create account; keep personal sign-in details private |
| Business name, category | storefront.name/category | Core setup and publication essentials |
| City/suburb, state | storefront.city/state | Core setup and current publication essentials |
| Country/region and currency | No complete AU/NZ storefront model yet | Implement deliberately; do not label AUD prices NZD or force an NZ supplier into an Australian state |
| Service areas | storefront.serviceAreas | Ask early so location matching is useful; permit later refinement |
| About, tagline and features | storefront.about/tagline/features | About is essential to publish; tagline/features optional |
| Main photo and gallery | storefront.images | One main photo to publish; optional extra images up to existing limit of 10 |
| Website | storefront.website | Optional, validate safe HTTP(S) links |
| Public business email/phone | No dedicated storefront fields in current model | Optional later addition only with explicit public/private labelling; don't expose personal account email by default |
| Starting price | storefront.startingPrice | Optional, explicit currency/inclusions; not a mandatory package |
| Packages | workspace.packages | Optional setup step; editable later |
| FAQs, cancellation and privacy | storefront.faq/cancellation/privacy | Optional initial setup; final booking terms required before taking a paid booking |
| Availability/capacity | workspace.availability/capacity | Optional initial setup; fuller setup in dashboard |
| Payout identity, tax and banking | Payment provider integration pending | Defer to dedicated provider onboarding before accepting/settling payments |

Current `missingEssentials()` requires business name, category, about, city, state and main photo. The server's publication validation must remain aligned; completing onboarding is distinct from meeting publication requirements.

## Import experience and implementation gap

The existing separate importer recognises AU/NZ source links, imports supported text/CSV/JSON/HTML files, previews selected fields and saves to an authenticated supplier draft with version checks. It does not fetch external websites or import photographs automatically. The 20-per-market candidate list is research scope, not 40 working connectors.

For one-click website imports, build and verify a server-side adapter for each permitted source before displaying it as supported. Start with supplier-owned websites and the highest-priority researched directory sources for which access/reuse is permitted. Show unsupported URLs a clear file/manual alternative; don't pretend pressing Review has fetched a website.

Import review must show detected fields, omissions and any replacements before saving. Keep the existing business UUID and user mapping. Never import third-party review scores, private leads/messages, bookings, invoices or competitor login information. Imported material is data, not instructions or executable HTML.

A permitted fetch service needs HTTPS destination/redirect validation, protection against private-network fetching, size/time/rate limits, safe text parsing and clear failures. Imported images require explicit reuse rights and safe private storage; don't silently hotlink them or copy directory editorial material. Source URLs, consent and selected-field provenance need deliberate private storage and retention.

## Build sequence

1. Reuse the existing verified supplier account and workspace service; establish a supplier-onboarding route and a minimal, resumable wizard state.
2. Persist progress server-side with owner isolation and existing version-conflict protection. Add a database change only if needed after checking the workspace API's accepted fields; do not invent a browser-only completion flag as the permanent source of truth.
3. Integrate import review inside the onboarding journey while preserving the separate importer URL. Unsaved upload contents must not be silently lost if account verification interrupts the journey; either collect after verification or explicitly ask the supplier to reselect the file.
4. Implement core business/profile/photo steps using the existing draft service and safe category/location values. Preserve unknown existing categories and supplier data rather than overwriting them with defaults.
5. Add optional services/availability setup and the actual storefront preview. Publish only on an explicit action through the checked publication API; missing fields produce a clear checklist.
6. Route newly verified suppliers to setup. Existing suppliers with linked businesses must retain their data and receive an appropriate resume/skip path rather than creating a second business or being trapped in onboarding.
7. Test new, returning and existing linked suppliers; refresh/resume; back/skip; partial imports; ownership and session changes; conflicting tabs; failed uploads/saves; explicit publication and mobile/keyboard use. Then test the supplier dashboard before resuming the remaining roadmap.

## GitHub and release gate

No push or deployment without the user's approval. Before that approval, inspect the actual remote changes from the business partner, review overlap, preserve both people's work and make the proposed integration concrete. No force-push, reset or automatic merge of their work. The final public-page acceptance checklist is at the very end of `launch-checklist.md`.


## Implemented locally — 18 October 2026

- `/supplier-onboarding/` uses the same sidebar, progress, typography and action layout as couple onboarding. Existing signup/email verification remains the account step.
- Six setup screens: optional import/start fresh, business, location, storefront/photos, optional AUD starting price, then review. Every screen can be skipped. Skip all and finish later also finishes without required business fields.
- New supplier default login/verification destinations enter setup; existing linked businesses bypass first-run setup, completed setups bypass it, and an explicit visit can review/resume the flow. Valid return destinations are retained.
- Normal progress and draft fields use the existing owner-checked, versioned workspace RPC. `cleanWorkspace()` preserves private onboarding metadata. The existing SQL accepts the extra root JSON object; no new table or migration is required. The metadata is not an authorisation role or public profile-claim mechanism.
- Starting from scratch is the default. Optional file import uses the existing safe parser, editable selected fields, a reuse-permission confirmation and protection against silently replacing existing draft values. Website links can be recorded but are not fetched; NZ-source prices are not copied into AUD fields.
- Main photo/gallery upload uses the existing private draft service. Continuing saves draft fields; skipping discards edits to the current unsaved text fields. Back retains in-progress form values in the current visit. Photo uploads are saved independently and are not undone by Skip.
- Review displays missing publication essentials and opens the actual supplier profile renderer in a dialog. Finishing saves a draft; publication only happens through the explicitly chosen, checked Publish action. Existing published listings stay unchanged when ordinary setup fields are saved.
- Country (AU/NZ), region and service areas are optional. Starting price is explicitly AUD; NZD packages/payments and broader country-aware supplier discovery remain separate work.
- `/supplier-onboarding/?preview=1` runs the same UI using empty, in-memory details only. It cannot save to Supabase or publish. There is no separate sample-data design-review page. Reloading clears preview inputs.
- If the workspace API is missing, the existing service's browser-review fallback is visibly labelled and publication is disabled. Shared/device-independent progress requires the connected cloud workspace.

### Verification and next actions

Automated checks cover six-step skipping, progress preservation, linked-account entry behaviour, input validation, preview save/publish isolation and allowed auth return routes. Browser checks cover skipping all six screens, invalid website handling, Back preserving text, final missing-photo guidance, actual profile preview and responsive layout.

Signed-in cloud saves/resume across devices, uploads, live publication and account isolation still require the supplier-account acceptance pass. Do not treat local/mocked checks as completion of those live tests. Supplier dashboard acceptance is retained but deferred at the user’s request on 18 October 2026. Continue other roadmap work next.

Before any GitHub push or live release: inspect the partner's current remote work, review/integrate overlap without overwriting it, show the proposed commit/branch and ask the user for approval.


Release checkpoint: on 18 October 2026 the user approved pushing the completed batch to `website-updates` and will create the pull request themselves. The refreshed remote showed only the prior PR merge on main, with no newer partner file changes. Do not create or merge their PR. Future release actions still require authorisation.
