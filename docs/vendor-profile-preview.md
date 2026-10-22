# Wedding Vendor Profile

Route: `/vendor-profile/`. The page is a fictional, browser-only prototype and stays `noindex,follow` while using sample business details.

Run the local preview with `node scripts/preview-vendor-profile.mjs`, then open `http://127.0.0.1:8765/vendor-profile/`.

## Data and future integration

- `dist/vendor-profile/data.js` exports the main `vendor` and a separate sample `couple`. It also provides venue, photographer and caterer presets.
- `dist/vendor-profile/model.js` normalises inputs and contains pricing, budget, availability, review and compatibility rules.
- `dist/vendor-profile/view.js` renders one reusable profile template.
- `dist/vendor-profile/vendor-profile.js` exports `mountVendorProfile(root, {vendor, couple})`. Its returned controller also has `setVendor(nextVendor)` and `destroy()`.
- A future adapter can map the existing public vendor record into this data shape and pass it to that entry point. The database does not need to copy the sample object’s schema.
- `node scripts/generate-vendor-profile.mjs` regenerates the static, readable initial HTML and metadata from the same data and renderer.

## Preview controls

The small **Profile preview** control appears on localhost, or with `?preview=1`. It switches account mode, vendor category and availability presentation, adjusts the sample location/category budget, and shows local interaction events. `?preview=1&example=venue` also opens a category preset directly.

Favourites, enquiry drafts, conversation additions and budget estimates use the isolated browser key `wedsparks.vendorProfile.demo.v1`. No real account records are read or written. Enquiry completion is a preview; no vendor receives a message, no appointment is confirmed and no vendor is booked. The only optional external embed is OpenStreetMap, loaded when **Explore map** is clicked. Private addresses are not shown.

## Verification

Run `node --test tests/vendor-profile.test.mjs tests/public-site.test.mjs`.

Browser checks covered mobile (375px), tablet (768px) and desktop (1440px), galleries and keyboard navigation, favourites, share/copy, guest enquiry preservation through simulated sign-in, package and consultation validation, conversation previews, budget calculations, comparison, availability modes, reviews, FAQs, portfolio credits and video loading.

## Media

Gallery photography is downloaded from Unsplash into `dist/assets/vendor-profile/`. Photo IDs: `1563241527-3004b7be0ffd`, `1519225421980-715cb0215aed`, `1523438885200-e635ba2c371e`, `1519741497674-611481863552`, `1515934751635-c81c6bc9a2d8`, `1511795409834-ef04bbd61622`, `1561181286-d3fee7d55364`.

`floral-study.mp4` is the CC0 flower example from `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4`. The vendor, review text, comparisons and wedding stories are fictional; these images are illustrative stock, not evidence of that fictional vendor’s work.
