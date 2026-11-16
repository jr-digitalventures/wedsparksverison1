# Vendor profile URL migration

The individual profile route is `/vendor-profile/`. The old `/supplier/` document is now a redirect only. Deep legacy links preserve their suffix, query and hash, for example `/supplier/barnumber` becomes `/vendor-profile/barnumber`.

Directory links, saved supplier links, messages, supplier dashboard storefront links and login return paths use the new route. `/suppliers/` remains the separate published-profile index.

`vendor-profile/route.js` keeps the sample prototype at the bare route, loads existing live storefronts for `?id=...` and known published slugs, and preserves authenticated draft previews through `?draft=1`. Migrating the route does not rebuild the live storefront with the prototype design.

Generate static pages for published slugs with `node scripts/generate-profile-routes.mjs`. Both profile generators also run this step. The Pages `404.html` handles legacy or otherwise non-generated profile deep links; GitHub Pages serves those fallback documents with HTTP 404 before JavaScript routes them. Published slugs have their own generated HTML and avoid that fallback. Unknown slugs show the unavailable-profile state rather than another vendor's sample data.

Verification: `node --test tests/profile-routes.test.mjs tests/supplier-card-actions.test.mjs tests/supplier-card-favourites.test.mjs tests/messages-regression.test.mjs tests/messages-startup.test.mjs tests/supplier-category-filters.test.cjs tests/vendor-profile.test.mjs`.

Changes are local until explicitly pushed and deployed.
