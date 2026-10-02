# Controlled dependency modernization

Date: 2026-10-02. Scope: root npm workspaces plus the separately deployed `frontend/` CRA and `backend/` Express trees. No route or commerce behavior was intentionally changed. Registry versions were checked at execution time; compatible semver updates were applied through the two legacy lockfiles. Major framework upgrades remain staged behind application migration and runtime verification.

## Inventory

| Tree | Direct runtime dependencies | Direct tooling | Notes |
| --- | --- | --- | --- |
| Root | `pm2` | ESLint 9, typescript-eslint 8, TypeScript 6, Node types, `tsx`, `next-devtools-mcp`, `esbuild` | PM2 remains for the legacy root `start` contract. Newest PM2 7, ESLint 10, TypeScript 7, and Node 26 types were not adopted because that changes a deployment/toolchain major and the Node 24/npm 11 foundation is deliberate. |
| `apps/web` | Next 16.3.8, React/React DOM 19.3, `server-only`, internal contracts/config/UI | `eslint-config-next` 16.3.8, React types | Latest stable security-patched Next 16.x and matching React selected by the foundation. |
| `apps/api` | Express 5.2.1, MongoDB driver 7.7, Zod 4.6.5, internal packages | Express types | Persistent Node API foundation; deliberately isolated from legacy backend startup/configuration. |
| `frontend/` | Emotion, MUI and MUI icons, React Email components/render, Axios, Bootstrap/React Bootstrap, Leaflet/React Leaflet, Lucide, PapaParse, React 18, toast, image crop/resizer, infinite scroll, React Router 6, CRA 5, Remixicon, Socket.IO client, Swiper 9, SWR, UUID 11, web-vitals | Testing Library, Tailwind 3 | CRA remains a production storefront/admin with unmigrated routes. Its direct and transitive dependency tree cannot be removed until route/workflow parity and cutover are verified. |
| `backend/` | Axios, bcrypt, CORS, csvtojson, dotenv, EXIF, Express 4, Express validators/async handler, Google APIs, JWT, Mongoose 7, Multer 1, Nodemailer, node-fetch 2, Sharp, Socket.IO server, UUID 11, web-push | Nodemon | Active legacy API and media/email/Google integrations remain outside workspaces. No deployment contract or Node 24 runtime verification is available. |

The legacy frontend and backend each keep separate lockfiles and installs; shared packages are therefore duplicated across independently deployed artifacts by design. After cleanup, shared direct packages are Axios and UUID. Socket.IO is split by role: the frontend client connects to the backend server. Sharp and Nodemailer exist only in the backend. React Email generation is still in the client checkout flow, so its client packages remain until that flow is moved and verified.

## Removed packages and decisions

| Package or concern | Decision | Evidence / reason |
| --- | --- | --- |
| `react-scripts` | TEMPORARILY RETAIN | CRA 5.0.1 is the latest release and still builds the live app; no compatible maintained release exists. Remove with the verified CRA route migration, not as a manifest-only change. |
| `react-router-dom` | TEMPORARILY RETAIN | Used throughout storefront and admin route trees and hooks. Next migration has not acquired production route ownership. |
| `react-snap` | REMOVE | No configuration or invocation found; removed from CRA tooling dependencies. |
| `react-helmet-async` | TEMPORARILY RETAIN | `Helmet` is used in live product pages. Replace with Next Metadata API as each route migrates. |
| Bootstrap / React Bootstrap | KEEP | Admin components import React Bootstrap and the live UI uses Bootstrap CSS classes and Bootstrap JS/CDN assets. |
| Icons | TEMPORARILY RETAIN | MUI icons, Lucide, Remixicon and legacy Font Awesome/Bootstrap icon styles are all referenced. Consolidation would touch live UI markup/styles, so it is deferred to route/component migration. |
| Maps | KEEP Leaflet; REMOVE Mapbox SDK, Mapbox GL and Google Maps React API | The live map component imports Leaflet/React Leaflet. No references to the other map packages were found. |
| Frontend `sharp` | REMOVE | No browser import; server image resizing remains in backend. |
| Frontend `nodemailer` | REMOVE | No browser import; mail transport remains in backend. |
| React Email | TEMPORARILY RETAIN frontend components/render; REMOVE unused backend render | Checkout currently renders an order email in the browser and submits its HTML to the backend. Moving this changes behavior/API trust and needs a separate server-authoritative email change. |
| `request` | REMOVE | Backend import was unused; Axios is already used in that module and elsewhere. |
| `body-parser` | REMOVE direct dependency | Replaced app middleware with equivalent Express built-ins; the WhatsApp router receives the already parsed request body. Express still brings its parser implementation transitively, so it remains in the lockfile as an Express dependency. |
| `prerender-node` | REMOVE | No application import/configuration found. |
| Backend `nodemon` | TEMPORARILY RETAIN | Backend `start` currently calls Nodemon even though it is declared as a dev dependency. The legacy host/start contract is unverified; change the command to a production Node runner only with deployment-owner verification. |
| UUID packages | KEEP `uuid` 11.1.1; REMOVE `uuidv4`; ADD explicit frontend `uuid` | Backend used `uuid`; the wrapper was unused. Frontend had UUID imports but relied on a transitive install. UUID 11 is the newest CommonJS-compatible major for these CJS/CRA call sites. |
| Push/realtime packages | KEEP backend `web-push`, backend Socket.IO server and frontend Socket.IO client; REMOVE backend Socket.IO client/emitter and Firebase | Browser notification behavior uses Socket.IO/native browser notifications, while the API has an active web-push endpoint. Firebase was only present in two unreferenced initialization modules; those files and the unused SDK were removed. No push behavior was removed. |
| Other dead packages | REMOVE frontend `@mui/x-data-grid`, Novu notification center, intersection observer, dynamic virtual scroll; backend local-auth, csv-parser, intersection observer, nanoid, randomcolor, Redis, sharp-multer | No imports or runtime references found. Existing CSV, Google, image, and table features use other retained packages. |

## Compatible version and risk review

The registry check found no newer CRA 5 release. Compatible in-range updates were written to the legacy lockfiles; large jumps (React 19 in CRA, MUI 9, React Router 7, Swiper 14, Next migrations for those routes, Express/Mongoose/Multer/Sharp majors) were not applied without migration evidence. UUID moved from 9 to 11 because the code uses CommonJS and UUID 11 is the current compatible major. Axios is at 1.20.0, and lock-only regeneration refreshed compatible transitive dependencies.

After the changes, `npm audit` reported 23 root advisory entries (4 low, 4 moderate, 13 high, 2 critical), 37 frontend entries (9 low, 9 moderate, 18 high, 1 critical), and 14 backend entries (1 moderate, 12 high, 1 critical). These are advisory/package entries, not unique vulnerabilities or exploit counts. CRA's pinned build tree accounts for multiple unfixable transitive issues; direct remaining alerts include CRA, React Router, Swiper and React Email in frontend, and Google APIs, Nodemailer, Sharp and Nodemon in backend. Root PM2 has a major update available. Multer 1.x is deprecated and has a compatible 2.x major available, but changing multipart behavior in production requires focused upload regression coverage. Sharp's compatible 0.32 line ends at 0.32.6 while current Sharp is 0.35.5; preserve legacy native-image compatibility pending upload verification. These findings remain migration/security work and are not a clean audit result.

Representative high/critical transitive paths include PM2's `vm2` and `systeminformation`; CRA's Babel transform/traverse, SVGR/SVGO and form-data tree; Router's `@remix-run/router`; and backend native build/archive (`@mapbox/node-pre-gyp`/`tar`) and Google auth libraries. This is a point-in-time audit view; package ownership and exposure differ, and advisories need individual reachability review.

Deprecated/transitive CRA packages remain a material supply-chain risk. `npm audit fix --force` was not used because it offers a synthetic `react-scripts` version and major dependency replacements. The safe resolution is to finish route migration and retire CRA, plus separately regression-test backend upload, mail and Google API upgrades.

## Verification

- Root `npm run typecheck`: passed, including workspace packages.
- Root `npm run lint`: passed for the configured foundation scope (`apps`, `packages`, `tests`, `scripts/tooling`). Legacy CRA/backend have no maintained lint scripts/configuration.
- Root `npm test`: 30 passed.
- `APP_ENV=development npm run build:foundation`: passed; Next 16.3.8/Turbopack output includes `/`, `/_not-found`, and dynamic `/foundation/status`.
- Legacy frontend production build: passed with existing ESLint and stale Browserslist warnings. CRA reported gzip assets of 507.6 kB JavaScript, 26.39 kB CSS, and a 1.76 kB secondary chunk. A pre-task build artifact was unavailable, so dependency removal savings cannot be isolated.
- CRA test: failed before running assertions because CRA Jest cannot parse the existing Swiper ESM entry from `BannerCard.js`. The test imports the full application and stops at that module. No test behavior was altered.
- `backend/` test script remains a deliberate placeholder that exits with “no test specified”; no legacy regression suite exists. Any checkout, inventory, auth or order dependency upgrade must first add focused tests.
- Bundle impact: removal drops the unused frontend Mapbox SDK/GL, Google Maps wrapper, Firebase, Novu, MUI Data Grid, Sharp, Nodemailer and obsolete polyfill/prerender tooling from the legacy install/lock. Final output sizes are recorded above; total savings cannot be isolated without a pre-task artifact.

## Remaining dependency decisions

No package tree is cleared for production migration. Before retiring legacy dependencies, verify migrated routes, admin workflows, media rendering, deployment commands, and safe rollback. Update `MIGRATION_STATUS.md` when that evidence exists.
