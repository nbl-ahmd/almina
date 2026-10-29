# Google Customer Reviews and discovery audit — 29 October 2026

Owner explicitly confirmed Google eligibility for the UAE pharmacy and medical-device catalogue on 29 October. Activation still requires approval of the specific customer-data transfer to Google.

## Additive implementation

Customer Reviews uses Google's optional survey dialog after accepted delivery-payment orders and verified paid live Stripe orders. Sandbox, pending, failed, cancelled and refunded payment states are excluded. The payload contains merchant ID, order reference, customer email, AE delivery country and estimated delivery date. No product names, GTINs, medical details, addresses, prices or payment details are included. Google receives the required fields to render its opt-in dialog; the customer then chooses whether to receive the survey.

Original server order timestamps are added optionally to existing checkout contracts. Older responses safely skip the survey. Idempotent order replay retains the original timestamp. The estimated date adds six Monday–Friday business days in Dubai time, matching published maximum handling/transit; holidays are not modelled. Configure this if the delivery promise changes.

The new Merchant store widget replaces the legacy badge and loads only on homepage, category directory and brand directory. Its frame is removed on navigation away, and mobile positioning clears bottom navigation. Google uses widget cookies and aggregate engagement. Privacy copy documents both integrations.

All flags default off. Production activation requires APP_ENV=production, canonical WEB_ORIGIN, GOOGLE_CUSTOMER_REVIEWS_ELIGIBILITY_CONFIRMED=true and individually GOOGLE_CUSTOMER_REVIEWS_ENABLED=true / GOOGLE_MERCHANT_WIDGET_ENABLED=true. Merchant ID is 5884188879; GOOGLE_REVIEWS_DELIVERY_BUSINESS_DAYS=6. Deploy API timestamps before activation. Rollback: turn feature flags off and redeploy; no data migration or credential is required. CSP adds exact Google origins only on enabled integration routes.

## Account changes and measured findings

Enabled and verified automatic image improvement, automatic delivery-policy updates, 40% product deletion protection and Merchant auto-tagging. Product sources remain free listings only. Linked the existing Analytics property al-mina-ba5a8 (414471023) to Merchant Center after specific owner approval; Google confirmed success. This does not itself install new purchase instrumentation. No paid campaign was started.

Saved Oral-B PD4868 brand, owner-confirmed exact-pack barcode and new condition through production admin. Price, inventory and listing approval were unchanged. Live structured data now includes the identifier. Search Console identifier validation has started, not passed.

Merchant currently has 67 products pending initial review; one image awaits crawling. Search Console reports zero invalid merchant listings and successful sitemaps. Old indexing reports are delayed; genuine malformed 404 URLs remain 404. Missing product images and Google's review/indexing processing cannot be solved by fabricated content or metadata.

PageSpeed baseline: mobile performance 78, accessibility 96, best practices 96, SEO 100; LCP 4.1 seconds. Fixed the reported low-contrast collection captions and added high priority to first hero artwork. Split the hero from slower collection queries without caching inventory across requests. Synthetic three-second collection delay streamed hero at 267ms and shelves at 3267ms; this proves independent rendering, not production performance.

Merchant srsltid auto-tagging parameters now preserve clean canonical indexing. Internal search/filter URLs retain noindex.

## Verification

249 unit tests; 179 disposable-database integration tests and 137 API tests passed. Checkout regression assertions verify original timestamps on replay. Production foundation build, typecheck and scoped lint passed. No production order or fake survey was submitted. Actual Google dialog/CSP and widget must be verified after approved activation; customer invitation delivery requires a genuine eligible order. Core Web Vitals has insufficient field data, so no field-performance pass is claimed.

Official references: https://support.google.com/merchants/answer/14629205 (opt-in), https://support.google.com/merchants/answer/14632921 (widget), https://support.google.com/merchants/answer/15191080 (auto-tagging).
