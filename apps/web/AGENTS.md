# Web foundation

The root `../../AGENTS.md` production guardrails also apply here.

Before framework edits, run `npm run docs:next` from the repository root to resolve the installed version and bundled documentation directory. Read the relevant files there, including their deprecations, before implementation. Never substitute remembered Next.js behavior or unversioned website docs for the installed package's docs.

The foundation owns only `/` and `/foundation/status` on its separate preview host. No production route ownership, redirects, session design or commerce behavior has been migrated. Keep preview pages noindex until a reviewed route cutover. Database access stays in `apps/api`; server environment and API callers must use the guarded `src/lib/server` modules. Add Client Components only for interactions. New images/fonts should use `next/image`/`next/font` after consulting the installed docs; this placeholder intentionally has no media or custom font.

Verify changes through the running Turbopack server's `/_next/mcp` and the browser using `.agents/skills/next-dev-loop`, followed by required checks. Never start `backend/server.js` for foundation verification.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
