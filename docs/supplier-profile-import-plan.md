# Supplier profile import plan

Planned 17 October 2026. The user wants to reduce supplier onboarding effort by importing an existing business profile, targeting 20 relevant platforms serving Australian weddings. Signup email/password credentials are for the supplier's own WedSparks account only. The import source is their external business profile URL; no competitor password is requested. This document records the flow and research requirements; no importer or external account connection has been built.

## Recommended supplier experience

Use a separate **Import your existing profile** page, linked from public supplier information. The user explicitly asked to keep importing out of the supplier dashboard for now. Add dashboard/onboarding integration to later work only.

1. The supplier creates their own WedSparks supplier account using their email and chosen password, or signs in to an existing account.
2. They provide their business website or a supported public directory profile URL. Alternatively, they upload a business-owned export/file or paste their existing business description.
3. They confirm they represent the business and have permission to reuse the submitted material.
4. The importer fetches supported, permitted content and proposes field mappings.
5. Show an editable preview of detected fields, photos and any missing information. Existing fields are kept unless the supplier explicitly selects replacements.
6. **Import to draft** saves selected fields to the existing supplier's private storefront draft.
7. The supplier can use the existing Preview page and Publish controls when ready.

The aim is one-click prefilling after providing a source, followed by a short review. Do not promise every directory can be imported in one click until its access, terms and actual parser have been checked. The For Suppliers page can advertise import assistance once available and show the exact supported sources.

## Connection methods

| Method | Plan |
| --- | --- |
| Supplier-owned website | First candidate for permitted public extraction of business details and supplier-authorised assets. |
| Supported public directory URL | Site-specific parser only after checking current source rules and technical access. Public accessibility by itself is not permission to copy everything. |
| Supplier-provided export or file | Accept a supported file the supplier provides. Do not assume a particular directory has an export feature. Use CSV/text first; evaluate other document formats separately. |
| Official API/OAuth connection | Preferred for private source data if the source actually offers it and authorises this use. The supplier signs in on the source website; WedSparks receives limited access tokens rather than their password. |
| Unsupported/blocked source | Offer paste/upload/manual assistance. Do not bypass authentication, anti-bot controls or source restrictions. |
| Account credentials | Email and password create/sign in to the WedSparks account only. External source selection asks for a business profile link, not external account credentials. |

An email address may still be collected as the supplier's WedSparks business/contact information where appropriate. It should not be treated as proof that they own an external listing, nor used to automatically connect an unrelated business record.

## Data to prefill

- Business name, description, category and public website.
- Business location and service areas.
- Selected gallery photos where reuse rights are confirmed, preserving supplied photographer attribution.
- Starting price and package descriptions/inclusions, clearly marked for the supplier to verify and update.
- FAQs and supplier-authored policies where reuse is permitted and the supplier confirms they still apply.

Do not import third-party review scores, review counts, testimonials, awards or verification badges as WedSparks-native reviews/credentials. Do not import couple contacts, private messages, leads, bookings, invoices or payment details in the first version. Avoid third-party branding, copyrighted editorial copy and photos the supplier cannot authorise.

## Initial source research

The agreed target is 20 Australian-market sources. The researched candidate list, platform types and rollout priorities are recorded in `supplier-import-sources.md`. Start with Easy Weddings, Wedshed, Wedding Diaries, ABIA and Wedlockers alongside supplier-owned websites, then expand through the remaining source candidates. This is a relevance-based shortlist, not a verified top-20 ranking by traffic or bookings; no source is yet a confirmed supported integration.

The research so far has not established an official cross-platform profile migration API, OAuth flow or supplier export for either directory. Do not infer those capabilities from a login page or a public content endpoint.

- Easy Weddings supplier advertising terms: https://www.easyweddings.com.au/business/legal/
- Wedshed terms: https://www.wedshed.com.au/terms-and-conditions

Wedshed's terms section 2.3 restrict copying/distribution/commercial use of website content except as permitted by law, its terms or consent. Its venue-content terms also identify photographer authorisation as the supplier's responsibility. Review each candidate's current terms and available permission route before implementing automated extraction. Supplier authorisation and source access/reuse permission are separate checks; neither guarantees ownership of all imagery on a listing.

## Implementation requirements

- Keep the existing business/vendor UUID and account mapping. This is an importer for signed-in suppliers, not a profile-claim flow or bulk competitor-directory crawl.
- Use a source adapter per supported website so parsing rules and error messages are testable and can be maintained independently.
- For URL fetching, validate HTTPS destinations, DNS resolutions and every redirect; block private/internal/reserved addresses and credential-bearing URLs. Limit response sizes, timeouts, file types and request rates. Start with explicit source/domain allowlists; expand safely for supplier-owned websites.
- Treat imported HTML and embedded instructions as untrusted data. Extract plain text/approved assets; never execute scripts, follow embedded commands or accept imported markup as executable content.
- Check image signatures, sizes and supported formats before copying permitted images into the supplier's private draft storage. Do not retain hotlinks as the only gallery storage.
- Track source URL, extraction date, selected fields and consent for support/audit purposes. Keep raw source data private and minimise retention. Never put credentials/tokens or private source data in client logs or public snapshots.
- Use the existing workspace version check so an import cannot silently overwrite a newer draft from another tab. Preview diffs and replace only fields selected by the supplier.
- Failed/partial imports preserve the existing draft. Allow retries without duplicating galleries or packages. Provide an understandable manual fallback.
- The import itself must never publish a business or change its existing public page.

## Delivery order

1. Finish the approved public-page structure, including supplier acquisition content.
2. Confirm source permissions/interfaces and implement paste/file import plus a permitted supplier-owned-website adapter.
3. Add specifically supported directory adapters or official connections in the 20-source research/rollout list after source-specific feasibility and permissions are established.
4. Expand supported sources towards 20 per market in Australia and New Zealand, reusing shared platform adapters. Reprioritise according to real supplier demand and observed import quality. Do not label a candidate Supported until its approved route has been implemented and checked.
5. Later, integrate the separate import page into supplier dashboard/onboarding navigation when requested. Do not add an import action inside the dashboard in this build.

SendGrid, Stripe and the deferred Supabase Authentication settings remain at the end of the overall project plan.


## Updated onboarding scope — 18 October 2026

The user now wants an optional import offer in supplier onboarding. This updates the earlier deferral of onboarding integration, but does not add a supplier dashboard tab. See `supplier-onboarding-plan.md` for the proposed flow. The file importer has since been built; automatic URL extraction and photo import remain pending. The paste-details textarea was removed at the user's request and must not be reintroduced as the default fallback. Use supported files or manual storefront entry.
