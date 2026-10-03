import { TextDecoder } from "node:util";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
const require = createRequire(
  new URL("../../apps/web/package.json", import.meta.url),
);
const origin = "http://127.0.0.1:4602";
const fixtureOrigin =
  process.env.ADMIN_FIXTURE_ORIGIN ?? "http://127.0.0.1:4600";
assert.equal(
  (await (await fetch(fixtureOrigin + "/__fixture/health")).json()).fixture,
  "almina-admin-synthetic",
);
await fetch(fixtureOrigin + "/__fixture/reset", {
  method: "POST",
  headers: { connection: "close" },
});
const web = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "4602",
  ],
  {
    cwd: fileURLToPath(new URL("../../apps/web", import.meta.url)),
    stdio: "ignore",
    env: {
      ...process.env,
      AL_MINA_ISOLATED_BUILD: "1",
      AL_MINA_ISOLATED_DEV: "0",
      APP_ENV: "development",
      NODE_ENV: "production",
      WEB_ORIGIN: origin,
      LEGACY_API_ORIGIN: fixtureOrigin,
      API_ORIGIN: fixtureOrigin,
    },
  },
);
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (web.exitCode !== null) throw new Error("Compiled admin did not start");
    try {
      if ((await fetch(origin + "/admin/login")).ok) break;
    } catch {
      /* Startup. */
    }
    await delay(100);
  }
  const loggedOut = await fetch(origin + "/admin/orders", {
    redirect: "manual",
  });
  assert.equal(loggedOut.status, 307);
  assert.ok(loggedOut.headers.get("location").endsWith("/admin/login"));
  assert.equal((await fetch(origin + "/api/admin/events")).status, 401);
  const cookie = `almina_session=${"b".repeat(43)}`;
  const denied = await fetch(origin + "/api/admin/auth/users", {
    headers: { cookie },
  });
  assert.equal(denied.status, 403);
  const login = await fetch(origin + "/admin/login");
  assert.match(login.headers.get("x-robots-tag"), /noindex/);
  assert.match(login.headers.get("cache-control"), /no-store/);
  const order = await fetch(origin + "/admin/orders", { headers: { cookie } });
  assert.equal(order.status, 200);
  const html = await order.text();
  assert.ok(html.includes("Orders"));
  assert.ok(html.includes("noindex, nofollow"));
  assert.ok(!html.includes("Search products and healthcare essentials"));
  const tamper = await fetch(origin + "/api/admin/orders?limit=999", {
    headers: { cookie },
  });
  assert.equal(tamper.status, 400);
  assert.equal(
    (
      await fetch(origin + "/api/admin/orders/" + "c".repeat(24), {
        method: "PUT",
        headers: {
          cookie,
          origin: "https://evil.example.invalid",
          "content-type": "application/json",
          "x-csrf-protection": "1",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  const events = await fetch(origin + "/api/admin/events", {
    headers: { cookie },
  });
  assert.equal(events.status, 200);
  const reader = events.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.match(first, /event: (reconcile|orders|connected)/);
  assert.ok(!first.includes("Customer"));
  await reader.cancel();
  const logout = await fetch(origin + "/api/admin/auth/logout", {
    method: "POST",
    headers: { cookie, origin, "x-csrf-protection": "1" },
  });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await fetch(origin + "/_next/mcp")).status, 404);
  console.log(
    "Compiled admin smoke passed: SSR, noindex/no-store, anonymous redirect, staff denial, query/CSRF tampering, authenticated PII-free event stream and absent production diagnostics.",
  );
} finally {
  web.kill("SIGTERM");
}
