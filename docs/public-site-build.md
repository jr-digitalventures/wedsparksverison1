# Public website build checkpoint

Built 17 October 2026. The changes are local and have not been committed, pushed or deployed in this turn.

## Included

- Updated homepage proposition: $1,000 in credits per complete $10,000 of eligible spending, using the confirmed payment-only earning and redemption rules supplied by the user. Public marketing is written for launch.
- 25 generated public pages: credits, planning hub, supplier acquisition, four tool pages, About, Contact, FAQs, Real Weddings, guide hub, seven original guides, five draft policy/terms pages (including cancellations and disputes) and a separate supplier import page.
- Working ungated credit milestone calculator, editable illustrative budget allocation (AUD/NZD), browser-saved generic checklist and adjustable/printable wedding-day timeline.
- Shared static navigation/footer links; no placeholder navigation options. Homepage category links stay within WedSparks even when directory data has placeholder external destinations.
- Pre-rendered supplier profile builder reads only published public data using the existing public key/API. One published profile was generated from the connected project during this build. This is separate from the dynamic supplier preview template, which retains noindex.
- Sitemap regeneration discovers intended canonical indexable pages rather than replacing the sitemap with directory routes only. The homepage and guides are included; draft policy pages and private previews are excluded.
- The Pages workflow rebuilds public content on deployment. Supplier-page rebuilding is deferred at the user's request; existing individual supplier pages are left unchanged.

## Separate import page

`/supplier-profile-import/` previews supplier-owned pasted content or text/CSV/JSON/HTML files. It never executes imported markup or transfers review badges, private messages or account credentials. Selected text fields can be saved to the signed-in supplier's existing cloud workspace with existing ownership/version checks; there is no automatic publication.

The import screen is not mounted in the supplier dashboard and no import dashboard action was added. Dashboard/onboarding integration is later work per the user's instruction. Public supplier information/footer links can open the separate page.

The registry recognises 20 Australian and 20 New Zealand candidate sources (39 distinct entries, with VenueNow shared). These are not implemented external-fetch adapters or traffic rankings. URL recognition does not fetch a profile. Explicitly NZD prices and prices from recognised NZ-only sources are not put into AUD starting-price fields. Full NZ supplier region/currency publishing remains future work.

## Honest launch boundaries

- Contact currently downloads an enquiry draft; no message delivery or invented support address.
- Real Weddings is a hub with submission guidance, not fabricated case studies. Real features need actual content and permissions.
- Privacy/platform/credit terms are review drafts, not final business policies; they are noindex.
- Public credits marketing now describes the intended launch experience at the user's request. This copy update does not connect payment processing or credit accounting; Stripe, verified earning/redemption, quote/invoice acceptance and paid leads still need implementation/verification before launch.
- Individual public supplier pages are frozen for now. Their generator is not run in the deployment workflow. SEO, design, accessibility, links, data accuracy and publication/unpublication freshness are deferred to the final review; the existing dynamic supplier endpoint continues enforcing live visibility.
- No external-directory API/OAuth permission or export capability is assumed.

## Building

1. `node scripts/generate-public-pages.mjs` regenerates public marketing/editorial/tool pages and static navigation/footer.
2. Deferred until the final individual-supplier-page review: `node scripts/generate-supplier-profiles.mjs` loads public supplier snapshots, writes indexable supplier profiles and updates the sitemap. It fails before replacing previous snapshots if public data cannot be fetched. On Windows with a corporate CA, use Node's `--use-system-ca` flag rather than disabling certificate validation.
3. `node --test tests/*.test.mjs` includes calculations, imports, source registry counts, generated links/indexability, repeated-build behaviour and prior dashboard/account/message regressions.

The content lives in `scripts/public-page-content.mjs`; generated HTML is not the editorial source. `SITE_URL` sets the marketing/profile generator's base URL; update existing directory canonical generation too when moving the whole site to a final domain.

## Homepage comparison

`/homepage-2/` preserves the original homepage HTML from the prior committed version for comparison, with a base URL for shared assets and noindex/nofollow. The public generator deliberately leaves it unchanged. `/` retains the credits-led variant. The header uses white text over the homepage photograph and green on public content pages.

## Photography and credit copy — 17 October 2026

All generated public pages now have dashboard-style photographic banners, plus editorial images within the content and thumbnails on tool/guide cards. The new shared mark is two overlapping rings with WS centred inside; Homepage 2 and frozen individual supplier pages remain unchanged. Only money paid through WedSparks payments earns credits, and credits are used only through WedSparks payments, with no cash withdrawals. See `public-imagery.md` for asset provenance and prompts.

## Latest review batch

The reference W monogram with a gold spark now replaces the ring mark in shared headers, using the horizontal white reverse logo. A matching favicon is generated. Homepage 2 is linked temporarily from desktop/mobile header menus. Directory pages now have the same fixed-height photo banner and an introductory/rewards section before results. Public page gutters match the homepage (135px desktop, 45px tablet, 30px mobile), while the homepage retains its original full-screen search hero and the comparison page stays unchanged. Core supplier acquisition copy now reflects free listings/tools, 18% commission and the optional $50/month Couple Leads subscription. See `public-site-review.md`.

Latest direction: original Homepage 2 design selected as the homepage; alternate variant retired. Shared footer is on every page, including account/auth pages. Supplier commission is **18%**. At $10,000 paid, gross commission is $1,800, leaving $800 after a $1,000 reward milestone before other costs. Earlier comparison/temporary-menu notes are superseded.

18 October: simplified search labels and hero copy; Explore/Connect/Plan/Earn; cash-only credit calculations; photo CTA on credits; product previews and richer supplier/tool layouts; planning dropdown; guest signup card actions; indexable public structured data and inert directory templates. See `seo-ai-discovery.md` and `public-site-review.md`.
