# WedSparks business model, retention and service policies

Updated 17 October 2026 from the user's confirmed direction. This is a product/business checkpoint, not confirmation that payment integrations or the new operational workflows are implemented.

## Confirmed model

- Couples face fragmented planning: separate supplier conversations, documents, spreadsheets and manual follow-ups. Weddings are expensive. The product brings the work together and rewards payment through the platform.
- Suppliers should not have to pay simply to be listed without knowing whether the platform will generate business. Listings and core dashboard tools are free.
- Suppliers pay **18% commission on invoices paid by couples through WedSparks**. Creating a listing, receiving an enquiry or discussing a booking does not itself trigger commission.
- **Couple Leads is an optional $50/month supplier subscription**, separate from commission. Only couples who explicitly opt in may be discoverable; location/category relevance and access enforcement must be implemented before launch.
- Every complete **$10,000 in money paid through WedSparks payments earns $1,000 in wedding credits**. Credits are used only through WedSparks payments, not withdrawn as cash. Manually recorded or outside-platform payments do not count.

## Keep payment on the platform by providing value

1. Show a concise reward reminder in couple conversations (implemented). Add verified progress towards the next milestone beside accepted quotes, invoices and checkout when those flows are built. Never calculate verified credit eligibility from manually entered expenses.
2. Make quotes, acceptance, deposits, staged invoices and payment links convenient. Put receipts, outstanding balances and due dates beside the conversation and update the budget without duplicate expenses. These payment workflows remain pending.
3. Give suppliers useful booking records, payment reminders and reconciliation. Explain the 18% fee clearly before participation and show the actual fee/net amount before invoice payment; do not invent the final tax or processing-fee treatment.
4. Offer reviews tied to real completed bookings and meaningful booking history. Do not fabricate badges or promise insurance, escrow, guaranteed refunds or payment protection that has not been arranged.
5. Draft a narrow, fair supplier agreement on avoiding platform fees for platform-introduced bookings. Define introduction, reasonable scope/duration, prior relationships and a transparent review/appeal process. Get market-specific legal review before imposing restrictions or penalties.
6. Provide a way to report requests to move payment off-platform. Use proportionate human review and disclose any monitoring approach in the privacy policy. Do not silently block ordinary contact details, external portfolio links or legitimate conversations.
7. Explain the couple's benefit at the decision point: outside payments do not earn WedSparks credits or appear as verified platform transactions. Do not imply that statutory rights disappear outside the platform.

## Economics and payment decisions still needed

A simple gross illustration: $10,000 paid at a 18% commission creates $1,800 of platform commission, while one fully redeemed reward milestone is $1,000 in credits. That leaves $800 before tax, processing costs, support, refunds and other expenses. This is arithmetic, not a confirmed settlement model. Model the cost of redemption and whether the platform or supplier funds each component before launch.

- Confirm GST/tax treatment, whether 18% includes taxes, the commission basis, processing-fee allocation, payouts, deposits and partial payments.
- Confirmed 18 October: credit-funded portions are excluded from earning further credits. Decide how commission applies to mixed cash/credit payments.
- Define credit issuance timing, refund reversals, already-redeemed credits and any negative balance treatment. Do not promise expiry or limits until agreed.
- Configure payment webhooks, idempotency, refund reconciliation and acceptance/version checks. Never rely on browser state to enforce fees, paid leads or reward balances.

## Notifications — add to the product roadmap

Plan an in-app notification centre and transactional delivery for new messages, quote/invoice activity, acceptance, upcoming/overdue payments, important booking/date changes, document changes that need attention and verified credit milestones. Cover both couples and suppliers. Keep notifications relevant, deduplicated and linked to the right record, with read state and channel preferences. Agree timing/time zones, consent and mandatory transactional versus optional marketing delivery before connecting SendGrid. This notification system is planned, not built in this batch.

## Gift registry — explore after payments and core planning

Consider links to an existing registry as a small first step. A hosted gift or cash registry is a separate later decision: ownership, privacy, payouts, refunds, fees and applicable payment rules need design. Do not assume gifts qualify for wedding credits. Prioritise reliable supplier payments and the current dashboard before expanding this scope.

## Cancellation and dispute drafts

Public draft pages: `/cancellations/` and `/disputes/`, kept noindex until approved. They preserve statutory rights, distinguish booking changes from service problems, keep evidence and resolutions in writing, and avoid invented blanket non-refundable deposits, automatic penalties or guaranteed outcomes.

Before finalisation, decide the legal entity and operating markets, supplier-required booking terms, who handles refunds and disputes, escalation channels, realistic response targets, commission/processing-fee refunds and credit reversals. Have the effective policies reviewed against the actual payment architecture and relevant law.

Official sources reviewed 17 October 2026:

- [ACCC — Contracts](https://www.accc.gov.au/consumers/buying-products-and-services/contracts): consumer rights cannot be removed by contract terms; unfair contract terms protections cover consumers and small businesses.
- [ACCC — Repair, replace, refund, cancel](https://www.accc.gov.au/consumers/problem-with-a-product-or-service-you-bought/repair-replace-refund-cancel): remedies depend on the issue and applicable consumer guarantees.
- [NZ Consumer Protection — Providing remedies for faulty services](https://www.consumerprotection.govt.nz/guidance-for-businesses/customer-returns-and-complaints/providing-remedies-for-faulty-services): remedies for services that do not meet consumer guarantees.

These sources inform the draft safeguards; they do not establish that a particular anti-circumvention clause, cancellation fee or platform dispute procedure is legally enforceable.
