> Media follow-up: the owner subsequently confirmed there are no legacy images to migrate. The unreleased compatibility bridge described below is superseded and removed by [branded media delivery](BRANDED_MEDIA_2026-10-21.md). DNS/email repair observations remain valid; no old Cloudflare assets were deleted.

# Cloudflare retirement and image delivery

## Decision

Keep Vercel authoritative DNS and direct Vercel storefront delivery. Keep Cloudinary's CDN as the primary product-image delivery service. Do not restore a second reverse proxy, prerender service, or migrate every historical Worker automatically. An own-domain image URL is a branding/control choice, not an automatic ranking or domain-authority improvement. Google supports cross-domain image CDN URLs and image sitemap entries.

This supersedes the provider uncertainty and CDN-first new-read decision in `MEDIA_CANONICALIZATION_2026-10-03.md`. Preserve the historical `/cdn/{products|categories|banners}/{filename}` delivery contract for compatibility; current valid Cloudinary fields take precedence. Do not rewrite immutable order snapshots or delete historical media.

## Observed production state

- Registrar delegation and Vercel authoritative DNS use Vercel nameservers. Apex HTTPS works; `www` returns a 308 to apex. Vercel manages TLS for apex/www and the wildcard.
- Live homepage HTML has 14 same-origin image elements and 14 direct Cloudinary image elements; no legacy CDN image references in this one page. This is not a catalogue-wide reference inventory.
- Product images already use account-validated responsive Cloudinary URLs with width constraints, automatic quality/format, and lazy loading where applicable. Bundled artwork uses Next Image. No additional proxy is needed for these current product URLs.
- One real 384 px product image returned 200, image/webp, 11,920 bytes. A separately chained quality/format variant returned identical bytes and size in this probe. Single-request timings are not a controlled CDN benchmark; no blanket speed claim or new URL churn is justified.
- `cdn.alminapharmacy.com` currently falls through Vercel's managed wildcard and returns 404 `DEPLOYMENT_NOT_FOUND`. A known historical category image still returns 200 from the old `cloudinary-proxy.nabeelkerala2000.workers.dev` endpoint, with long-lived public cache headers.
- The old Cloudflare zone is inactive. Its recorded Workers routes include `cdn.alminapharmacy.com/cdn/*` (cloudinary-proxy), `alminapharmacy.com/` (prerender-worker), and `*alminapharmacy.com/*` (hello-world-frosty-frog-b3f3). `spring-sound-7d07` also exists. Names alone do not establish the other Workers' exact code or dependencies. Nothing was deleted, disabled, transferred or redeployed in that account.
- The image Worker dashboard shows no runtime variables or bindings. Its embedded source editor remains blank/loading; source and exact upstream object mapping have **not** been recovered. Old account removal is blocked on that mapping and a complete reference inventory, not on the modern homepage.

## Live DNS repair completed

Vercel had only its managed website aliases and CAA records, with no mail MX/TXT records. Restored twelve existing records from the old zone, additively through the signed-in pharmacy Vercel account:

- Existing Microsoft 365 MX, priority 0.
- Existing SPF, Microsoft tenant verification and Google site verification TXT records.
- Existing autodiscover, email, Domain Connect, lyncdiscover, msoid and sip CNAME records.
- Existing `_sip._tls` and `_sipfederationtls._tcp` SRV records, priority 100/weight 1 and their original ports/targets.

Authoritative DNS queries confirmed the restored MX/TXT/SRV records. No website aliases, CAA records or nameservers changed. The zone-file upload dialog would replace all records, so it was cancelled and individual additive writes were used. No credentials were changed and no real email was sent. DNS repair does not establish end-to-end email deliverability; confirm inbound/outbound mail separately. No DKIM or DMARC records were present in the inspected old zone; configure those from the actual mail provider later, without inventing values or adopting a rejecting policy before sender inventory.

Evidence: `outputs/cloudflare-retirement-2026-10-21/vercel-restored-dns.jpg`. Public reference record file: `email-records.zone` in that directory (excludes the separately restored MX); it is **not** a complete replacement zone file.

## Compatibility code prepared, not deployed

Added `/cdn/[kind]/[filename]`, a temporary server-side compatibility bridge to the existing image Worker. It accepts only products/categories/banners with bounded simple raster filenames. No client URLs, cookies, authorization, queries or redirect targets are forwarded. Responses reject HTML/SVG, upstream errors, empty and over-5-MiB bodies; fetch/body timeout is eight seconds. Successful responses are public raster images with explicit CDN caching and crawlable headers. Failed fetches stay failures and are not cached as placeholder successes.

The shared HTML proxy bypasses only these validated raster paths so HTML noindex/private-cache headers do not prevent image indexing or public caching. All other route/auth/commerce behavior stays unchanged. Current direct Cloudinary delivery does not use this bridge. It requires no new credentials, Cloudflare zone activation or paid custom hostname.

Verification: eight focused media/performance tests, repository/workspace typecheck, scoped lint and isolated production build passed. The production-built handler and development handler both returned byte-identical output for the known category image (SHA-256 `bbd2a8d191f8d0bd60bd0e4554e51dc35283bd88059c36067b8d04a07594e0c5`). Real browser navigation rendered it as a 512×512 image. Production GET/HEAD and invalid SVG/query/POST checks passed (200/200 and 404/404/405). Next dev compilation diagnostics reported no issues. These are focused route checks, not a full browser-suite rerun.

## Remaining cutover, in order

1. Review and deploy the compatibility code through the existing PR/release process, then attach **only** `cdn.alminapharmacy.com` to the Vercel storefront project. Do not attach it before a compatible deployment. Verify its certificate, cached image responses, Next optimizer fetches, direct legacy URLs, product/category/banner examples and real pages. It is still broken live until this step completes.
2. Recover the old image Worker's source or an authoritative asset manifest. Inventory all referenced legacy filenames, their exact underlying provider/public IDs, and historical uses. Export/back up the old Worker before any account retirement.
3. Replace the temporary personal-account upstream with verified pharmacy-owned origins/assets, preserving image URLs and validating bytes or approved transformations. A direct Cloudinary mapping or permanent redirect is preferable once every mapping is known; a new pharmacy Worker is needed only if it performs a real remaining function. Do not create one simply for an assumed SEO benefit.
4. Audit the remaining Workers and their callers. The prerender role is redundant for current Next-rendered pages; do not carry bot-specific HTML rewriting forward. Do not delete unknown Workers or cancel paid services until unrelated consumers and rollback needs are checked.
5. After production verification and an observation period, retire only proven unused routes/resources. Account/zone deletion is a separate irreversible operation requiring explicit confirmation. Never change the registrar back to Cloudflare to make an inactive zone appear active.

The migration is **not complete** while the legacy hostname is disconnected or while the bridge depends on the personal account. No catalogue data, stock, prices, customer/order data or Cloudinary asset ownership changed.

## Sources

- [Google image SEO](https://developers.google.com/search/docs/appearance/google-images): HTML images, crawlability, context, responsive sources and external CDN image sitemap support.
- [Google dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering): prefer server/static rendering or hydration to bot-specific prerender workarounds.
- [Vercel with Cloudflare](https://vercel.com/kb/guide/cloudflare-with-vercel): avoid an extra reverse proxy in front of Vercel.
- [Cloudinary delivery options](https://cloudinary.com/documentation/advanced_url_delivery_options): native custom delivery hostnames require the relevant paid plan; no upgrade is necessary for the chosen direct CDN architecture.
- [Cloudflare Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/): require an active Cloudflare zone; a CNAME to a workers.dev hostname alone is not a verified migration.
