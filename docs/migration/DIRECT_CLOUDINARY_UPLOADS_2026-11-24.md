# Product photos go straight to Cloudinary (2026-11-24)

## Why

A product photo used to travel browser → Vercel gateway → Render API → Cloudinary. The API received the bytes, re-encoded them and sent them on, so
every photo cost the API CPU and counted as Render outbound bandwidth (and used Vercel function time). The earlier bandwidth notes named this as the
biggest remaining lever.

## New flow

1. The browser prepares each photo as WebP (unchanged, `prepareProductImages`) and asks `POST /api/media/products/:id/sign` for a ticket.
2. The server checks the product exists and signs one ticket per photo: public id `almina/products/<uploadKey>-<n>` (derived from the upload key),
   `allowed_formats=webp`, `overwrite=false`, `type=upload`. The API secret never leaves the server.
3. The browser posts each photo to `https://api.cloudinary.com/v1_1/<cloud>/image/upload` itself.
4. `POST /api/media/products/:id/commit` asks Cloudinary's authenticated API about each public id (a small JSON reply) and only attaches the photos if
   every one exists, is WebP, is at most 5 MB and within the pixel limit. The attach is the same single transaction as before: media revision check,
   history entry, idempotent receipt (`media_uploads`). Repeating the call returns the same result.

Bytes through the API per photo: from the whole image to roughly 1 KB of JSON. Both admin entry points use it (product page photos, and photos added
when creating a product).

## Security notes

- Routes are admin-only in the gateway policy and in the API's retained route policy (`retained-policy.ts`); branch accounts stay denied.
- The gateway validates the ticket response with a strict schema (shape of every field, nothing else) instead of widening its global field allow-list.
- The admin page's `connect-src` now includes `https://api.cloudinary.com` (only when a Cloudinary cloud is configured).
- The server no longer re-encodes these photos with sharp: Cloudinary enforces WebP (`allowed_formats`), the browser has already re-encoded them, and the
  commit step re-checks format, size and pixels before anything is attached. A photo that was signed but never committed stays unreferenced in
  Cloudinary, the same as an interrupted upload before.

## Not changed

The proxied route `POST /api/media/products/:id` stays for old admin tabs and scripts. Banner and marketing images still use the proxied upload (a few
small images a month); they can move to the same pattern.

## Tests

`tests/media.test.ts` (ticket signing and limits), `tests/media-integration.test.ts` (confirm-then-attach against a stand-in Cloudinary: missing photo,
wrong format, oversize, repeat, reused key, stale revision), and the admin e2e (the browser posts to Cloudinary and nothing goes through the gateway).

## Rollback

Revert the PR; the old proxied route is untouched.
