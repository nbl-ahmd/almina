import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const dir = root + "/.verification-results/storefront-replacement/p1-03";
mkdirSync(dir, { recursive: true });
const session = process.env.PROOF_BROWSER_SESSION;
if (!session) throw new Error("Supply your owned PROOF_BROWSER_SESSION.");
const ab = (...args) =>
  execFileSync("agent-browser", ["--session", session, ...args], {
    encoding: "utf8",
    timeout: 60000,
  });
const cases = [];
for (const lang of ["en", "ar"])
  for (const [w, h] of [
    [320, 740],
    [360, 800],
    [390, 844],
    [768, 1024],
    [900, 1000],
    [1280, 900],
    [1440, 900],
  ])
    for (const [name, path] of [
      ["home4", "/design-proof?columns=4"],
      ["listing", "/design-proof/products"],
      [
        "pdp",
        "/design-proof/products/cerave-blemish-control-cleanser-236-ml--PD1186",
      ],
      ["stress", "/design-proof/stress"],
      ["detail-sample", "/design-proof/stress?sample=complete"],
    ])
      cases.push({ lang, w, h, name, path });
for (const lang of ["en", "ar"])
  for (const w of [1280, 1440])
    for (const lead of ["full", "split"])
      cases.push({
        lang,
        w,
        h: 900,
        name: "home5-" + lead,
        path: `/design-proof?columns=5&lead=${lead}`,
      });
for (const lang of ["en", "ar"])
  for (const [name, path, w, h] of [
    ["text200", "/design-proof/stress", 390, 844],
    ["pdp200", "/design-proof/stress?sample=complete", 390, 844],
    [
      "landscape",
      "/design-proof/products/cerave-blemish-control-cleanser-236-ml--PD1186",
      844,
      390,
    ],
    ["unavailable", "/design-proof/products/sample--PD1237", 360, 800],
    ["missing", "/design-proof/stress?sample=pdp", 320, 740],
  ])
    cases.push({ lang, name, path, w, h });
for (const lang of ["en", "ar"])
  cases.push({
    lang,
    name: "sparse",
    path: "/design-proof?campaign=none",
    w: 390,
    h: 844,
  });
const rows = [];
for (const c of cases) {
  ab("cookies", "set", "almina_lang", c.lang, "--url", "http://127.0.0.1:4870");
  ab("set", "viewport", String(c.w), String(c.h));
  ab("open", "http://127.0.0.1:4870" + c.path);
  ab(
    "wait",
    "--fn",
    '!!document.querySelector("main h1") && [...document.querySelectorAll("main img")].every(i=>i.complete)',
  );
  ab("eval", "document.fonts.ready.then(()=>true)");
  if (c.name.includes("200"))
    ab(
      "eval",
      `(()=>{const els=[...document.querySelectorAll('[data-proof-root], [data-proof-root] *')];const values=els.map(e=>{const s=getComputedStyle(e);return[e,parseFloat(s.fontSize),parseFloat(s.lineHeight)]});for(const[e,f,l]of values){e.style.fontSize=f*2+'px';if(Number.isFinite(l))e.style.lineHeight=l*2+'px';}return true})()`,
    );
  ab(
    "eval",
    `document.querySelectorAll('nextjs-portal').forEach(el=>el.style.display='none')`,
  );
  const val = JSON.parse(
    JSON.parse(
      ab(
        "eval",
        `JSON.stringify({width:document.documentElement.scrollWidth,firstBuy:document.querySelector('article button[class*=add]')?.getBoundingClientRect().toJSON(),nav:document.querySelector('nav[class*=bottomNav]')?.getBoundingClientRect().toJSON(),dock:document.querySelector('div[class*=dock]')?.getBoundingClientRect().toJSON(),dockChildren:[...document.querySelectorAll('div[class*=dock] button,div[class*=dock] strong')].map(e=>e.getBoundingClientRect().toJSON()),clearance:getComputedStyle(document.querySelector('[data-proof-root]')).getPropertyValue('--proof-dock-clearance'),grid:document.querySelector('div[class*=grid]')?getComputedStyle(document.querySelector('div[class*=grid]')).gridTemplateColumns:null,smallTargets:[...document.querySelectorAll('[data-proof-root] button,[data-proof-root] a,[data-proof-root] summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).clipPath!=='inset(50%)'&&!e.closest('details:not([open])')&&(r.height<43.9||r.width<43.9)}).map(e=>({text:e.getAttribute('aria-label')||e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),cards:[...document.querySelectorAll('article')].map(e=>({width:e.getBoundingClientRect().width,top:e.getBoundingClientRect().top,buy:e.querySelector('div[class*=cardBuy]')?.getBoundingClientRect().toJSON(),overflow:e.scrollWidth>e.clientWidth,price:e.querySelector('strong')?.getBoundingClientRect().toJSON()}))})`,
        "--json",
      ),
    ).data.result,
  );
  const file = `${c.name}-${c.lang}-${c.w}.png`;
  ab("screenshot", dir + "/" + file, "--full");
  rows.push({ ...c, file, ...val });
  writeFileSync(
    dir + "/matrix.json",
    JSON.stringify(
      {
        time: new Date().toISOString(),
        note: "Chromium viewport emulation; text200 doubles computed font/line sizes, not native browser zoom.",
        rows,
      },
      null,
      2,
    ),
  );
  console.log(c.name, c.lang, c.w, val.width, val.smallTargets.length);
}
writeFileSync(
  dir + "/matrix.json",
  JSON.stringify(
    {
      time: new Date().toISOString(),
      note: "Desktop Chromium viewport emulation; text200 doubles computed font/line sizes, not native browser zoom.",
      rows,
    },
    null,
    2,
  ),
);
const failed = rows.filter(
  (row) =>
    row.width > row.w ||
    row.smallTargets.length > 0 ||
    row.cards.some((card) => card.overflow) ||
    row.dockChildren.some(
      (child) => child.x < -0.5 || child.right > row.w + 0.5,
    ),
);
if (failed.length)
  throw new Error(
    `Density checks failed in ${failed.map((row) => `${row.name}/${row.lang}/${row.w}`).join(", ")}. See retained matrix and captures.`,
  );
