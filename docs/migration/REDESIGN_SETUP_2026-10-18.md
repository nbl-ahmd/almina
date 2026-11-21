> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Al Mina redesign setup — 18 October 2026

Tooling and instructions only. No storefront implementation, database change,
production configuration or deployment is part of this setup. The owner requested
the article's skills and a replacement design based on the competitor assessment.

## Brief

Improve product discovery, purchase decisions, useful offers and repeat shopping.
Preserve actual content, identifiers, URLs and commerce integrity. The old
Figma/PNG composition and blue bordered theme are historical reference, not a
requirement to reproduce them. The old DESIGN.md is archived alongside this file
as `DESIGN_LEGACY_2026-10-18.md`.

Detailed local research:

- `outputs/commerce-direction-2026-10-18/RAK_COMPETITOR_GROWTH_PLAN.md`
- `outputs/commerce-direction-2026-10-18/ALMINA_NEW_COMMERCE_DIRECTION.md`

Target a distinctive product-led health, beauty and everyday-care retailer:
neutral product surfaces, teal/green action hierarchy, selective coral accents,
recognizable packs, useful categories and concise local service information.
Replace empty rails and oversized generic shortcuts with useful merchandise.
Borrow competitors' useful patterns, not their assets or unsupported claims.

Sequence: repair merchandising/destinations; improve priority names/photos;
establish new shared components; rebuild home/catalogue/PDP; refine cart/checkout;
then approved acquisition/retention features. This is direction, not blanket
authorization for every proposed feature or live catalogue mutation.

## Skill responsibilities

| Skills | Responsibility |
|---|---|
| Existing `impeccable` 4.5.2 | Composition, type, spacing, hierarchy, accessible states and visual critique |
| `gpt-taste` | Creative alternatives within the retail brief |
| `emil-design-eng`, `animate` | Interaction craft and purposeful motion |
| `animation-performance`, `review-animations`, `improve-animations` | Conditional motion performance/review tasks |
| `animation-vocabulary`, `find-animation-opportunities` | Conditional terminology and motion exploration |
| `prototype`, `break-ui` | Conditional concept comparison and worst-case layout tests using isolated fixtures |
| `ask-sonner`, `pick-ui-library` | Conditional library work, not permission to add dependencies |
| `almina-project-profile` | Project truth, scope and production constraints |
| Figma skills | Extraction/implementation of a selected frame |
| Next docs, `next-dev-loop`, Vercel React guidance | Version-correct implementation and runtime/performance verification |

Load relevant skills, not all skills on every task. Older overlapping generators
remain installed but are not independent direction sources for this redesign.
Native Swift/Expo-only parts of Emil's repository were omitted.

### Project overrides

Shopping usability, honest content, accessibility and performance take precedence
over generic prescriptions for forced AIDA, random layouts, huge cinematic
spacing, mandatory GSAP, scroll pinning, fixed font bans and unrelated stock
images. Never simulate script execution or claim checks that did not run.
Catalogue/PDP/cart are task surfaces; campaign composition may be more expressive
when it helps shopping. Do not add a motion/UI library merely to satisfy a skill.
Keep Heroicons, Tailwind-first styling and one optimized font. Honour reduced
motion and touch/keyboard behaviour. Record chosen new tokens in DESIGN.md.

## Redesign workflow adapted from the article

1. Inspect current code, product facts and competitor brief before changes.
2. For a selected new Figma frame, load the Figma design-to-code skill, then get
   design context, screenshot and assets. Extract actual type/spacing/colour and
   component values before implementing. Metadata alone is insufficient. Without
   a new frame, establish a replacement concept/tokens rather than copying the
   obsolete composition.
3. Use Next.js/TypeScript, Server Components by default and Tailwind. Read the
   installed-version Next documentation before framework-specific edits.
4. Inspect at 1440px and 375px (article baseline), plus 360px, 390px and
   tablet where relevant under web/AGENTS.md. Use real packs, long names, missing
   photos, variants and loading/empty/error states.
5. Capture desktop/mobile screenshots and compare hierarchy, spacing, colours,
   alignment, assets and states. Fix the bounded review batch and recapture;
   follow the applicable skill's review ceiling and disclose remaining issues.
6. Test relevant links, search, filters, mobile menu/dialogs, keyboard focus,
   form empty/invalid/valid states, direct reload and browser errors. Use isolated
   fixtures for valid checkout/order submissions, never live purchases merely
   to satisfy a checklist. Commerce/auth edits require regression tests.
7. Report actual checks, screenshot paths and limitations. Editing code alone
   does not establish visual or functional completion.

## Tool verification and limitations

- Node 24.21.0 and Codex CLI 0.163.0-alpha.10.2 were present. No CLI/model upgrade
  or global model setting change occurred; skills do not switch the active model.
- Existing Figma plugin authentication and file `llmDMdaminn2wcCIAZQ9U7`, page
  `0:1`, were verified on 18 October 2026. It works although the separate CLI
  registration reports no CLI login; no duplicate connection is needed.
- Browser screenshot capture was verified at 1440px and 375px; evidence is in
  `outputs/redesign-setup-2026-10-18/`. The live storefront returned its
  “Unable to load this page” state during the check, so this is tooling proof,
  not a catalogue-health or successful-shopping claim. Recheck catalogue loading
  before using the live site as a redesign baseline.
- Use the supplied computer/browser control with its Playwright-backed API for
  live checks. It supplies the article's browser-verification role in this desktop
  environment; no separate Playwright MCP/Chromium installation was added.
- Existing Impeccable execution failed with permission denied during the earlier
  review. No permission workaround, scanner score or injected overlay is claimed.
  Written guidance and supported browser checks remain usable; disclose missing
  deterministic scans in future audit reports.
- New skills are project-local in `.agents/skills`, discoverable on the next turn.
  If absent from the skill list, reopen the chat.
- No third-party reverse-engineered DESIGN.md template was imported: that article
  option is unnecessary now that Al Mina has a specific competitive/product brief.

## Provenance

Article: https://striped-thief-c4a.notion.site/The-GPT-6-Astra-Web-Design-Setup-3f473bd1b02b815dadb9fd793a781df3

Installed through the bundled skill-installer helper, without running upstream
install scripts or changing application package dependencies:

- `Leonxlnx/taste-skill` commit `f624f37a8c650b9cc550253104925efe4c8de246`,
  path `skills/gpt-tasteskill`, installed folder/name `gpt-taste`.
- `emilkowalski/skills` commit `2d228630ba1446365f614a108cb8252f1feda202`,
  eleven web skills listed above. Three upstream Claude-specific
  `disable-model-invocation` fields were translated to Codex
  `agents/openai.yaml` explicit-only policy, preserving their invocation intent.

Reproduction uses `install-skill-from-github.py --repo OWNER/REPO --ref COMMIT
--path SKILL_PATH --dest /absolute/project/.agents/skills`; for Taste add
`--name gpt-taste`. Never overwrite existing directories blindly.

Historical rollback instruction retired: do not restore the archived visual
guide or prior agent/profile instructions.
New skill folders are isolated additions; application code and deployment did
not change. No existing skills were deleted.
