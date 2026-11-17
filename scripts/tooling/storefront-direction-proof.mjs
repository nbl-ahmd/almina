// Local, disposable design proof. Do not inherit application secrets or connect a database.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "node:net";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
if (process.argv.slice(2).some((arg) => arg !== "--test"))
  throw new Error("Use no arguments or --test.");
const testing = process.argv.includes("--test"),
  webPort = testing ? 4896 : 4870,
  fixturePort = testing ? 4897 : 4871;
const clean = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  TMPDIR: process.env.TMPDIR,
  NODE_ENV: "development",
  APP_ENV: "development",
  DATABASE_MODE: "disabled",
  NEXT_TELEMETRY_DISABLED: "1",
  ALMINA_DIRECTION_PROOF: "1",
  AL_MINA_ISOLATED_BUILD: "1",
  AL_MINA_VERIFICATION_TAG: testing ? "p1-mode-test" : "p1-proof",
  WEB_ORIGIN: `http://127.0.0.1:${webPort}`,
  API_ORIGIN: `http://127.0.0.1:${fixturePort}`,
  LEGACY_API_ORIGIN: `http://127.0.0.1:${fixturePort}`,
  CHECKOUT_ENABLED: "false",
  STRIPE_ENABLED: "false",
};
// Refuse occupied ports before either child starts; never attach to another preview.
await Promise.all(
  [webPort, fixturePort].map(
    (port) =>
      new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once("error", () =>
          reject(
            new Error(
              `Direction proof port ${port} is occupied. Stop its owner or use the existing preview.`,
            ),
          ),
        );
        probe.listen(port, "127.0.0.1", () => probe.close(resolve));
      }),
  ),
);
const children = [];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
function launch(args, cwd, extra = {}) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...clean, ...extra },
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", stop);
  child.on("error", stop);
}
launch(["scripts/tooling/storefront-reference-fixture.mjs"], root, {
  PORT: String(fixturePort),
});
launch(
  [
    root + "/node_modules/next/dist/bin/next",
    "dev",
    "--turbopack",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(webPort),
  ],
  root + "/apps/web",
);
