# Email, image uploads and CDN — 22 October 2026 live/code review

Read-only provider/public checks and source inspection. No message, upload,
production configuration change, deployment or application-code edit was performed.

## Email

Resend currently reports both `notify.alminapharmacy.com` and
`news.alminapharmacy.com` verified, sending enabled and tracking disabled. The
configured delivery webhook is enabled. However, its inspected latest delivery
attempts returned HTTP 404 at 05:23, 05:55 and 08:05 UTC on 22 October. Successful
signed production receipt is therefore not established.

Both the public API `/api/v1/customers/options` and storefront
`/api/customer/options` returned HTTP 200 with `emailEnabled: false` during this
review. This establishes that email-code login is not advertised as ready; it does
not identify which missing configuration/deployed-version condition caused it.

Seven template paths, provider selection, budgets, outbox integration, signature
validation, suppression and unsubscribe code are implemented and locally tested
per `RESEND_EMAIL_2026-10-22.md`. Live integration is not complete: release/configure
the matching API, establish a signed webhook success, and check controlled real
inbox delivery and intended reminder activation. Prior provider test-recipient
success is not evidence that the public application is using the new provider.

## Product images

There are two active code paths, not one unified uploader:

- Standard product create/update (`backend/routes/products.js`): browser sends
  originals to the API; Sharp decodes/validates, resizes to exactly 500×500 using
  `fit: cover`, converts to WebP, then uploads to Google Drive. Non-square product
  packs can be cropped. This path does not have explicit auto-orientation or a
  without-enlargement option.
- Dedicated product-gallery upload (`backend/routes/media.js`): browser sends
  originals to the API; Sharp auto-orients, resizes within 2000×2000 preserving
  aspect ratio without enlarging small originals, converts to WebP, then performs
  signed Cloudinary upload. Revision/idempotency checks protect replacement, and
  earlier assets remain retained. The Cloudinary uploader is mounted on edit
  pages, not the new-product form.

Neither browser uploader currently resizes/compresses before sending to the API.
The dedicated UI limits original files to 3 MiB total; the Next admin gateway has
an approximately 4 MiB body limit. The general product form's “5 MB each” hint
reflects the backend per-file bound and is misleading for this gateway path.
Large originals may fail before server-side conversion can reduce them.

A coherent follow-up is one primary proportion-preserving Cloudinary upload flow
for create/update, accurate common upload limits and optional browser preprocessing
for large originals, while retaining server validation and legacy media reads.

## CDN checks

The earlier disconnected-CDN statement in `CLOUDFLARE_RETIREMENT_2026-10-21.md` is
superseded for the tested URL: both the apex `/cdn/categories/...` path and
`cdn.alminapharmacy.com/cdn/categories/305dd291-e32e-4d7f-9abb-aae212c434a4.webp`
returned HTTP 200, `image/webp`, 2,752 bytes and a public caching header.

A Cloudinary product URL extracted from the live homepage returned HTTP 200 and
WebP (32,784 bytes). Its `c_limit,w_384,q_auto,f_auto` variant returned HTTP 200
and WebP (11,440 bytes). This confirms that tested original and responsive delivery
work, not a whole-catalogue or performance certification. Automatic format selection
does not promise AVIF for every response.

The compatibility implementation still points to the old personal-account Worker.
Full reference/mapping inventory and pharmacy-owned upstream migration remain
necessary before retiring that dependency. No legacy asset should be deleted.

## Verification

Four focused media/provider unit tests passed in this review. Wider build,
regression and integration evidence remains recorded in the email/wholesale reports;
it was not all rerun for this read-only assessment.
