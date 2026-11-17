import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  ),
  out = root + "/.verification-results/storefront-replacement/phase-1";
mkdirSync(out, { recursive: true });
const session = process.env.PROOF_BROWSER_SESSION;
if (!session)
  throw new Error(
    "Set PROOF_BROWSER_SESSION to an owned agent-browser session id.",
  );
function ab(...args) {
  return execFileSync("agent-browser", ["--session", session, ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
}
const rows = [];
ab("open", "http://127.0.0.1:4870/design-proof");
ab(
  "eval",
  `['almina.cart.v1','almina.saved-products.v1','almina.delivery-area.v1','almina.proof-searches.v1'].forEach(key=>localStorage.removeItem(key))`,
);
for (const locale of ["en", "ar"]) {
  ab("cookies", "set", "almina_lang", locale, "--url", "http://127.0.0.1:4870");
  for (const [width, height] of [
    [390, 844],
    [1440, 900],
  ]) {
    ab("set", "viewport", String(width), String(height));
    for (const [name, path] of [
      ["home-a", "/design-proof?lead=full"],
      ["home-b", "/design-proof?lead=split"],
      ["listing", "/design-proof/products"],
      [
        "pdp",
        "/design-proof/products/cerave-blemish-control-cleanser-236-ml--PD1186",
      ],
    ]) {
      ab("open", "http://127.0.0.1:4870" + path);
      ab(
        "wait",
        "--fn",
        'document.querySelector("main h1") && [...document.querySelectorAll("main img")].every(img=>img.complete)',
      );
      ab("eval", "document.fonts.ready.then(()=>true)");
      if (name === "listing" && width >= 900)
        ab("wait", "--fn", 'document.querySelector("aside details")?.open');
      // Hide only Next tool chrome, never product UI, for visual evidence.
      ab(
        "eval",
        `document.querySelectorAll('nextjs-portal').forEach(el=>el.style.display='none')`,
      );
      const file = `${name}-${locale}-${width}.png`;
      ab("screenshot", out + "/" + file, "--full");
      const measurement = JSON.parse(
        ab(
          "eval",
          `JSON.stringify({title:document.querySelector('main h1')?.textContent,dir:document.querySelector('div[lang]')?.dir,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:document.querySelectorAll('article').length,firstCard:document.querySelector('article')?.getBoundingClientRect().toJSON(),firstBuy:document.querySelector('article button[aria-label*="cart"],article button[aria-label*="السلة"]')?.getBoundingClientRect().toJSON(),purchaseRows:[...document.querySelectorAll('article')].map(e=>({name:e.querySelector('a[class*=productName]')?.textContent,card:e.getBoundingClientRect().toJSON(),buy:e.querySelector('div[class*=cardBuy]')?.getBoundingClientRect().toJSON(),image:e.querySelector('img')?.getBoundingClientRect().toJSON()})),images:[...document.querySelectorAll('main img')].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})),robots:document.querySelector('meta[name="robots"]')?.content})`,
          "--json",
        ),
      ).data.result;
      const value = JSON.parse(measurement);
      if (
        value.scrollWidth > width ||
        value.images.some((image) => !image.ok) ||
        !value.robots?.includes("noindex")
      )
        throw new Error("Proof rendering boundary failed: " + file);
      rows.push({ name, locale, width, height, path, file, ...value });
      console.log(name, locale, width, JSON.parse(measurement).scrollWidth);
    }
  }
}
ab("set", "viewport", "900", "1000");
ab("open", "http://127.0.0.1:4870/design-proof?lead=split");
ab(
  "eval",
  `document.querySelectorAll('nextjs-portal').forEach(el=>el.style.display='none')`,
);
ab("screenshot", out + "/tablet-ar-900.png", "--full");
writeFileSync(
  out + "/capture-manifest.json",
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      session,
      notice:
        "Synthetic sample prices/stock. Next tool chrome hidden for captures only. A/B share mobile structure. Candidate, not approved.",
      rows,
    },
    null,
    2,
  ),
);
