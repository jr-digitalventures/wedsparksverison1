# Public website imagery

Created 17 October 2026 using the built-in image-generation tool. These are decorative generated editorial images, not customer wedding submissions or photographs of a named supplier's work. No individual supplier profile images were replaced.

## Garden reception

Project asset: `dist/assets/wedding-garden.webp`. Source: `C:/Users/marce/.codex/generated_images/01a10a68-5794-7e63-940f-453bcbae8957/exec-6d2e9a0d-331c-434c-9102-54ead20d9759.png`.

Final prompt:

> Create one wide landscape editorial wedding photograph for WedSparks, a refined Australian wedding planning website in deep forest green and warm cream. Photorealistic natural-light scene of an intimate outdoor wedding reception in an Australian garden: long ivory linen tables, restrained white flowers and soft green foliage, glassware, candles, timber chairs, golden late-afternoon light. No people, no text, no lettering, no logos, no collage. Natural believable materials and elegant unforced styling, not excessive luxury. Landscape composition approximately 3:2 with enough context to crop into a wide horizontal banner. This is decorative wedding inspiration, not a documented real wedding.

## Planning still life

Project asset: `dist/assets/wedding-planning.webp`. Source: `C:/Users/marce/.codex/generated_images/01a10a68-5794-7e63-940f-453bcbae8957/exec-3b7d2cc9-f296-4b8d-955c-4e3e059c6495.png`.

Final prompt:

> One photorealistic landscape editorial still-life photograph for a wedding planning website, overhead view of a warm ivory linen desk with a beautiful blank cream notebook open, a plain unmarked envelope, a pencil, a few white flowers and soft green olive foliage, a pair of gold wedding rings off to one side and ceramic coffee cup. Gentle window daylight, realistic texture, warm cream and forest green palette, calm and approachable. No people, no readable writing, no text, no logos, no collage. Balanced 3:2 landscape framing, room to crop. Decorative planning illustration, not a real wedding story.

Both images are encoded as WebP at their original dimensions for smaller downloads. Cropping for banners/cards is handled by CSS. Banner/card images have empty alternative text where decorative; content images have descriptive alternative text. Above-the-fold banner images load eagerly; lower images load lazily.

## Logo

The latest reference replaces the interim ring mark. `scripts/brand.mjs` contains the vector W-and-gold-spark interpretation. The shared header uses the horizontal reverse treatment: white W, white serif WedSparks wordmark and gold spark. `dist/assets/wedsparks-mark.svg` and `dist/assets/wedsparks-favicon.svg` are generated from it. The earlier ring asset is retained only as an unused previous version. Homepage 2 and frozen individual supplier pages retain their old markup.


## Supplied logos — 18 October 2026

Built-in imagegen edits were used for the attached horizontal and stacked logos. The selected reverse logo is `dist/assets/wedsparks-horizontal-reverse.webp`, displayed through `wedsparks-horizontal-reverse.svg` (native crop and green-backing removal at render time). The favicon is `dist/assets/wedsparks-favicon.webp`, embedded by the generated favicon SVG. WebP conversion changes encoding only, preserving image dimensions and composition. Earlier transparency outputs were rejected because they damaged white letter interiors.

Final reverse prompt: “Create an opaque flat reverse version of the supplied exact horizontal logo. Preserve W, gold spark and WedSparks lettering. White W and white WedSparks wordmark, gold spark unchanged, on a completely solid uniform dark green background hex #213e34. No transparency at all. No gradients or textures. Tight rectangular horizontal composition, small 3% padding. All letter interiors solid opaque white. Flat crisp clean brand artwork.”

Favicon prompt: “Edit supplied logo into a square favicon. Preserve the exact white W monogram and gold spark geometry and colors from the supplied image. Remove the WedSparks wordmark completely. Enlarge and center just the W and gold spark to fill 84 percent of a square canvas with modest equal padding. Solid flat deep green background matching original. No gradients, no texture, no other letters, no border. Crisp flat logo edges.”

Homepage logo edge correction: the SVG now renders separate pure-white lettering and gold-spark colour masks, removing green matte pixels from anti-aliased edges on photographic backgrounds. Geometry and header sizing are unchanged.
