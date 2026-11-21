# Working reference preview

The owner selected a single composite direction, so these assets support the
actual Next.js storefront preview rather than a separate throwaway website.

`assets/` contains six reviewed owner catalogue photographs and their provenance.
They are used only by the loopback reference fixture, never imported by production
components. Names/pack identities follow the review manifest; prices and stock
are synthetic. The preview has a visible bilingual sample-data notice.

From the repository root, in separate terminals:

```sh
PORT=4861 node scripts/tooling/storefront-reference-fixture.mjs
```

```sh
APP_ENV=development DATABASE_MODE=disabled \
WEB_ORIGIN=http://127.0.0.1:4860 \
API_ORIGIN=http://127.0.0.1:4861 \
LEGACY_API_ORIGIN=http://127.0.0.1:4861 \
AL_MINA_ISOLATED_DEV=1 ALMINA_REFERENCE_PREVIEW=1 \
npm run dev:web -- --port 4860
```

Open the home route `/`, listing `/products`, and product detail
`/products/cerave-blemish-control-cleanser-236-ml--PD1186`. Resize the same coded
pages for mobile/tablet/desktop; use the footer language switch for Arabic.
The fixture has no database or real provider credentials and accepts no writes.
It cannot place a real order. Production behaviour and integrations still come
from the existing application contracts. The notice requires an explicit local
development flag and is excluded from production rendering.
