import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { execFileSync } from "node:child_process";
const origin = process.env.ADMIN_VERIFY_ORIGIN ?? "http://localhost:4601";
const fixture = process.env.ADMIN_FIXTURE_ORIGIN ?? "http://127.0.0.1:4600";
function fixtureFetch(url, init = {}) {
  return fetch(url, {
    ...init,
    headers: { ...init.headers, connection: "close" },
  }).catch((error) => {
    throw new Error(
      `Synthetic fixture request failed: ${new URL(url).pathname}`,
      { cause: error },
    );
  });
}
assert.equal(
  (await (await fixtureFetch(`${fixture}/__fixture/health`)).json()).fixture,
  "almina-admin-synthetic",
);
await fixtureFetch(`${fixture}/__fixture/reset`, {
  method: "POST",
  headers: { connection: "close" },
});
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "admin-verification"],
  { encoding: "utf8" },
).trim();
function browser(...args) {
  const result = JSON.parse(
    execFileSync(
      "agent-browser",
      ["--session", session, "--restore", "--json", ...args],
      { encoding: "utf8" },
    ),
  );
  assert.ok(result.success, result.error);
  return result.data;
}
async function waitPath(path) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (new URL(browser("get", "url").url).pathname === path) return;
    await delay(100);
  }
  throw new Error(`Navigation did not reach ${path}`);
}
function evaluate(code) {
  return browser("eval", `(async () => { return (${code}); })()`).result;
}
function open(path) {
  try {
    browser("open", "--enable", "react-devtools", origin + path);
  } catch {
    browser("close");
    browser("open", "--enable", "react-devtools", origin + path);
  }
  browser("wait", "--load", "domcontentloaded");
  // The route streams a loading fallback (loading.tsx) that also renders an
  // h1, so waiting on an h1 alone can resolve mid-stream and audit the
  // skeleton. Also require the fallback (aria-busy="true") to be gone.
  browser(
    "wait",
    "--fn",
    'document.querySelector("h1")?.getBoundingClientRect().width > 0 && !document.querySelector(\'[aria-busy="true"]\')',
  );
  // Next streams the finished route into a hidden container and swaps it in
  // while the page hydrates. Until that swap lands the document can briefly
  // hold two copies of a control, and a click can land on the inert one.
  // Wait for a quiet DOM window (hard-capped) before the caller interacts.
  evaluate(`new Promise((resolve) => {
    let quiet = setTimeout(finish, 250);
    const stop = setTimeout(finish, 4000);
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = setTimeout(finish, 250);
    });
    function finish() {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(stop);
      resolve(true);
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  })`);
}
browser("cookies", "clear");
// Sessions are reused across runs; drop any errors buffered by earlier runs so
// the final assertion only reflects this run.
browser("errors", "--clear");
open("/admin");
assert.ok(evaluate("location.pathname").endsWith("/admin/login"));
assert.equal((await fetch(origin + "/api/admin/auth/users")).status, 401);
assert.equal(
  (
    await fetch(origin + "/api/admin/orders", {
      method: "POST",
      headers: {
        origin,
        "x-csrf-protection": "1",
        "content-type": "application/json",
      },
      body: "{}",
    })
  ).status,
  404,
);
browser("fill", "#username", "synthetic-admin");
browser("fill", "#password", "incorrect-fixture-password");
browser("find", "role", "button", "click", "--name", "Sign in", "--exact");
browser("wait", "--text", "Invalid username or password.");
browser("fill", "#password", "synthetic-test-password");
browser("find", "role", "button", "click", "--name", "Sign in", "--exact");
await waitPath("/admin");
browser("wait", "--text", "Dashboard");
const screens = [
  "/admin",
  "/admin/products",
  "/admin/products/new",
  "/admin/products/" + "d".repeat(24),
  "/admin/categories",
  "/admin/categories/" + "e".repeat(24),
  "/admin/banners",
  "/admin/orders",
  "/admin/orders/" + "c".repeat(24),
  "/admin/whatsapp",
  "/admin/whatsapp/971501234567",
  "/admin/users",
  "/admin/settings",
  "/admin/batch",
  "/admin/notifications",
];
let checks = 0;
for (const path of process.env.ADMIN_VERIFY_FUNCTIONAL_ONLY === "1"
  ? []
  : screens) {
  open(path);
  assert.ok(
    !evaluate("document.body.innerText").includes("Administration unavailable"),
    path,
  );
  assert.ok(
    evaluate('document.querySelector("meta[name=robots]")?.content').includes(
      "noindex",
    ),
  );
  for (const width of [360, 390, 768, 1280]) {
    browser("set", "viewport", String(width), "900");
    assert.equal(
      evaluate("document.documentElement.scrollWidth > innerWidth"),
      false,
      `${path} at ${width}`,
    );
    checks++;
  }
  browser(
    "wait",
    "--fn",
    'document.querySelector("h1")?.getBoundingClientRect().width > 0',
  );
  const audit = browser("a11y");
  assert.deepEqual(audit.violations ?? [], [], `Accessibility: ${path}`);
}
if (checks)
  console.log(
    `Admin views passed: ${screens.length} routes, ${checks} responsive checks and accessibility audits.`,
  );
if (process.env.ADMIN_VERIFY_VISUAL_ONLY === "1") {
  browser("close");
  process.exit(0);
}
// Bypass UI controls: the gateway rechecks current role and rejects CSRF/query tampering.
assert.equal(
  evaluate(
    `await (await fetch('/api/admin/store/status', {method:'PUT',headers:{'content-type':'application/json'},body:'{"status":false}'})).status`,
  ),
  403,
);
assert.equal(
  evaluate(
    `await (await fetch('/api/admin/products?filter=%7B%22%24where%22%3A%22x%22%7D')).status`,
  ),
  400,
);
assert.equal(
  evaluate(`await (await fetch('/api/admin/whatsapp/webhook')).status`),
  404,
);
open("/admin/orders/" + "c".repeat(24));
browser("fill", "input[name=billno]", "12345");
browser("fill", "input[name=billamount]", "40");
evaluate("window.confirm = () => true");
browser("find", "role", "button", "click", "--name", "Dispatch order", "--exact");
browser("wait", "--text", "Saved successfully.");
let commands = await (
  await fixtureFetch(fixture + "/__fixture/commands")
).json();
const dispatch = commands.find(
  (command) => command.path === "/api/orders/" + "c".repeat(24),
);
assert.deepEqual(dispatch.body, { billno: "12345", billamount: 40 });
assert.equal(dispatch.csrf, "1");
assert.equal(dispatch.origin, origin);
open("/admin/products/" + "d".repeat(24));
browser("fill", "input[name=stock]", "0");
browser(
  "fill",
  "input[name=stockReason]",
  "Synthetic fixture physical recount",
);
browser("find", "role", "button", "click", "--name", "Save product", "--exact");
browser("wait", "--text", "Saved successfully.");
commands = await (await fixtureFetch(fixture + "/__fixture/commands")).json();
assert.ok(
  commands.some(
    (command) =>
      command.path === "/api/products/" + "d".repeat(24) &&
      command.body.multipart,
  ),
);
open("/admindash/outofstock");
assert.ok(
  evaluate("location.href").includes("/admin/products?view=outofstock"),
);
open("/admin/orders");
browser(
  "wait",
  "--fn",
  'document.querySelector(".admin-status")?.dataset.state === "online"',
);
await fixtureFetch(fixture + "/__fixture/new-order", {
  method: "POST",
  headers: { connection: "close" },
});
browser(
  "wait",
  "--fn",
  'document.querySelector("tbody")?.innerText.includes("1002")',
);
await fixtureFetch(fixture + "/__fixture/failure", {
  method: "POST",
  headers: { connection: "close" },
});
browser("wait", "--text", "Reconnecting");
await fixtureFetch(fixture + "/__fixture/failure", {
  method: "POST",
  headers: { connection: "close" },
});
browser(
  "wait",
  "--fn",
  'document.querySelector(".admin-status")?.dataset.state === "online"',
);
browser("reload");
browser(
  "wait",
  "--fn",
  'document.querySelector("tbody")?.innerText.includes("1002")',
);
assert.ok(evaluate("document.body.innerText").includes("Orders"));
open("/admin");
browser("find", "role", "button", "click", "--name", "Sign out", "--exact");
await waitPath("/admin/login");
browser("wait", "--load", "domcontentloaded");
browser("wait", "--text", "Staff sign in");
browser("fill", "#username", "synthetic-staff");
browser("fill", "#password", "synthetic-test-password");
browser("find", "role", "button", "click", "--name", "Sign in", "--exact");
await waitPath("/admin");
browser("wait", "--text", "Dashboard");
open("/admin/users");
browser("wait", "--text", "Access denied");
for (const [path, method] of [
  ["auth/users", "GET"],
  ["whatsapp/reports", "GET"],
  ["products", "POST"],
  ["store/status", "PUT"],
])
  assert.equal(
    evaluate(
      `await (await fetch('/api/admin/${path}',{method:'${method}',headers:{'content-type':'application/json','x-csrf-protection':'1'},${method !== "GET" ? "body:'{}'" : ""}})).status`,
    ),
    403,
  );
open("/admin/orders");
browser("reload");
browser("wait", "--text", "Orders");
open("/admin/products");
browser("wait", "--text", "Read-only inventory");
assert.equal(
  evaluate(
    '[...document.querySelectorAll("button")].some(b => b.textContent.includes("Delete product"))',
  ),
  false,
);
assert.equal(evaluate("localStorage.length"), 0);
assert.equal(
  evaluate(
    'await (async () => { const worker = await navigator.serviceWorker.register("/admin/worker.js", { scope: "/admin/" }); const scope = new URL(worker.scope).pathname; await worker.unregister(); return scope; })()',
  ),
  "/admin/",
);
assert.deepEqual(browser("errors").errors ?? [], []);
console.log(
  "Admin browser security, login/logout/reload, order dispatch, multipart product update, redirects, order arrival/outage recovery and staff denial passed.",
);
browser("close");
