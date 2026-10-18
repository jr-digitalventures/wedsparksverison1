# Search and AI discovery — 18 October 2026

## Applied locally

- Important public content is in static HTML, with unique page titles, descriptions, canonical URLs and a generated sitemap.
- Indexable public pages now have a JSON-LD graph describing the actual WedSparks Organization, WebSite and WebPage, with a Home/current-page breadcrumb trail. Original guides use Article markup and a visible WedSparks byline. No invented ratings, awards, named experts, addresses, traffic figures or published customer stories are added.
- Private/account pages and unapproved policy drafts retain noindex protections. Individual supplier-page SEO work remains deferred; the shared footer is the only intended change to their content in the recent build.
- The four public planning pages link to one another. The desktop planning navigation exposes a floating tools menu on hover or keyboard focus; mobile navigation exposes the same four links.
- Images have fixed intrinsic dimensions, decorative or descriptive alternative text as appropriate, and lazy loading below the banner.
- Existing robots.txt allows crawling of public content. There is no special AI-text file or hidden model-targeting text. This does not grant access to private authenticated data.

These are technical/content improvements, not a guarantee of indexing or AI citation. Final-domain deployment and live crawler/index verification remain required.

## Highest-value next steps

1. **Improve the existing supplier-type pages first.** The directory already has category and location/category routes. Do not generate more near-duplicate pages just to target every city. Start with categories that have real, published inventory: explain services, meaningful differences between packages, questions to ask and how to compare quotes; link to real businesses and relevant guides.
2. **Enrich selected location pages.** For example, wedding photographers in Sydney or wedding venues in Melbourne, when actual inventory supports them. Include accurate service areas, relevant supplier information and genuinely useful local planning advice. Do not call a supplier local merely because a city keyword was inserted.
3. **Fix the directory's static placeholder/template debt.** Sample cards have now been moved into inert HTML templates and the visible initial state is a loading message. Before launch, pre-render genuine published inventory with clear empty/error states and verify the final page as crawlers see it. Avoid indexing empty or weak combinations. Do not mark sample cards as real businesses in structured data.
4. **Publish evidence-rich guides.** Original venue questions, quote comparisons, regional planning advice and sourced cost guides are more useful to cite than repeated marketing copy. Attribute time-sensitive facts and give real authors/reviewers and update dates once those people/processes exist.
5. **Add genuine Real Weddings.** Obtain couple/photographer permissions, show the actual suppliers and useful planning decisions, and link the story to relevant services and locations. Generated decorative photos are not customer evidence.
6. **Make the business identifiable.** Complete real legal/business contact details, About information, support delivery and final policies. Keep the 18% supplier fee, optional $50/month leads and payment-only rewards consistent.
7. **Verify the final domain and measure.** Use Google Search Console and Bing Webmaster Tools; inspect representative URLs, indexing, sitemap coverage and referrals. Bing's AI Performance reports can help monitor citations where available. Check public crawl access at the CDN/hosting layer, not only robots.txt.
8. **Complete the final supplier-page review.** Accurate unique business pages, useful photos/packages/reviews and reliable publication/unpublication handling support both normal search and AI retrieval. No new business ratings or local claims should be invented for markup.

## Official references reviewed

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) — ordinary SEO fundamentals remain relevant; there is no special AI schema or extra AI-text file required.
- [Google: structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) — use accurate markup consistent with the page.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) — OAI-SearchBot is for search discovery; its controls are independent of GPTBot training controls. Permitting training is not a prerequisite for permitting search.
- [Bing: AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c) — reporting for citations in supported AI experiences, subject to indexing/availability.
