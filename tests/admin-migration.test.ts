import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  accessPolicy,
  canVisit,
  upstreamQuery,
  project,
  identitySchema,
  projectAdminResponse,
} from "../apps/web/src/lib/admin/policy";
import { readCatalogueContext } from "../packages/contracts/src/admin-catalogue";
import { legacyAdminDestination } from "../apps/web/src/lib/admin/redirects";
const require = createRequire(import.meta.url);
import { catalogCreationInput } from '../apps/api/src/modules/catalog/creation';
import { whatsappOutboundInput } from '../apps/api/src/modules/notifications/whatsapp-outbound';
import { retainedOrderQuery } from '../apps/api/src/modules/orders/compatibility-reads';
const { lookupPolicy } = require("../backend/security/policy.cjs");
test("admin gateway is default deny and distinguishes staff from administrators", () => {
  for (const path of [
    "products",
    "orders",
    "orders/aaaaaaaaaaaaaaaaaaaaaaaa",
    "auth/me",
  ])
    assert.equal(accessPolicy("GET", path), "staff");
  for (const path of ["products/needs-action", "operations", "category", "banners", "auth/users", "whatsapp/reports"])
    assert.equal(accessPolicy("GET", path), "admin");
  for (const path of [
    "../auth/me",
    "auth/me%2f",
    "products//search",
    "whatsapp/webhook",
    "orders/email",
    "https://evil.invalid",
  ])
    assert.equal(accessPolicy("GET", path), undefined);
  assert.equal(accessPolicy("POST", "orders"), undefined); // guest checkout cannot tunnel through admin
  assert.equal(accessPolicy("POST", "auth/signup"), "admin");
  assert.equal(canVisit("user", "users"), false);
  assert.equal(canVisit("user", "needs-action"), false);
  assert.equal(canVisit("user", "orders"), true);
  assert.equal(
    identitySchema.safeParse({
      id: "a".repeat(24),
      username: "synthetic",
      name: "Synthetic",
      role: "superadmin",
      cities: [],
    }).success,
    false,
  );
});
test("admin queries rebuild explicit catalog filters and bounded pagination", () => {
  const review = new URLSearchParams(upstreamQuery('products/needs-action', new URLSearchParams({ reason:'prescription',q:'PD123',offset:'25' })));
  assert.equal(review.get('reason'),'prescription');assert.equal(review.get('q'),'PD123');assert.equal(review.get('limit'),'25');
  for(const input of [{filter:'{}'},{reason:'$where'},{limit:'101'}])assert.throws(()=>upstreamQuery('products/needs-action',new URLSearchParams(input)));
  assert.deepEqual(project({items:[{name:'Example',reasons:['Confirm classification'],passwordHash:'private'}],total:1}),{items:[{name:'Example',reasons:['Confirm classification']}],total:1});
  const query = new URLSearchParams(
    upstreamQuery(
      "products",
      new URLSearchParams({ view: "outofstock", limit: "25", offset: "50" }),
    ),
  );
  assert.deepEqual(JSON.parse(query.get("filter")!), { stock: 0 });
  assert.equal(query.get("limit"), "25");
  for (const input of [
    'filter={"$where":"x"}',
    "limit=0",
    "limit=101",
    "offset=-1",
    "offset=10001",
    "limit=25&limit=50",
    "sort=$where",
  ])
    assert.throws(() => upstreamQuery("products", new URLSearchParams(input)));
  assert.throws(() =>
    upstreamQuery("auth/me", new URLSearchParams("role=admin")),
  );
  assert.equal(
    new URLSearchParams(
      upstreamQuery("orders", new URLSearchParams("status=cancelled")),
    ).get("status"),
    "cancelled",
  );
  assert.deepEqual(retainedOrderQuery({ limit: "25", offset: "50" }), {
    limit: 25,
    offset: 50,
    status: undefined,
  });
  for (const limit of ["-1", "0", "101", "NaN", ["25", "50"]])
    assert.throws(() => retainedOrderQuery({ limit }));
});
test("recursive admin projection removes credentials, subscriptions and provider internals", () => {
  assert.deepEqual(
    project({
      name: "Synthetic",
      password: "redacted-fixture",
      gdriveFileId: "private-provider-reference",
      subscription: {},
      customer: { name: "Synthetic", internalSecret: "fixture" },
      cartItems: [
        { quantity: 2, _id: { name: "Synthetic item", gdriveFileIds: [] } },
      ],
    }),
    {
      name: "Synthetic",
      customer: { name: "Synthetic" },
      cartItems: [{ quantity: 2, _id: { name: "Synthetic item" } }],
    },
  );
});
test("legacy admin URLs map to explicit reversible destinations", () => {
  assert.equal(legacyAdminDestination("/admindash"), "/admin");
  assert.equal(
    legacyAdminDestination("/admin/productlist/update/" + "a".repeat(24)),
    "/admin/products/" + "a".repeat(24),
  );
  assert.equal(
    legacyAdminDestination("/admindash/salelist/search"),
    "/admin/products?view=sale",
  );
  assert.equal(
    legacyAdminDestination("/admin/cancelled"),
    "/admin/orders?status=cancelled",
  );
  assert.equal(legacyAdminDestination("/products"), undefined);
});
test("API independently protects new WhatsApp reports and validates administrative money/stock/message input", () => {
  assert.equal(lookupPolicy("GET", "/api/whatsapp/reports").policy, "admin");
  const product = { name: 'Synthetic', price: '12.50', stock: '0', barcode: '00123', category: 'a'.repeat(24) };
  assert.equal(catalogCreationInput(product).barcode, '00123');
  for (const stock of ['-1', '1.2', 'Infinity', {}, [], null, true, ''])
    assert.throws(() => catalogCreationInput({ ...product, stock }));
  for (const price of ['-1', 'NaN', 'Infinity', '10.001', '1e3', {}])
    assert.throws(() => catalogCreationInput({ ...product, price }));
  assert.throws(() => catalogCreationInput({ ...product, sale: true, salePrice: '12.51' }));
  assert.throws(() => catalogCreationInput({ ...product, actor: 'forged' }));
  whatsappOutboundInput({ recipient: '971501234567', name: 'Synthetic', text: 'Synthetic test' }, 'text');
  whatsappOutboundInput({ recipient: '971501234567', template: 'approved_template', link: 'https://example.invalid/image.jpg' }, 'template');
  for (const recipient of [{ $ne: '' }, 'abc', '1'.repeat(21)])
    assert.throws(() => whatsappOutboundInput({ recipient, name: 'Synthetic', text: 'test' }, 'text'));
  assert.throws(() => whatsappOutboundInput({ recipient: '123', template: 'approved_template', link: 'javascript:alert(1)' }, 'template'));

});
test("multi-instance realtime bus reauthorizes each local recipient before delivery", async () => {
  const { secureRealtime } = require("../backend/security/realtime.cjs");
  const listeners = new Set<(event: string, payload: unknown) => void>();
  const bus = {
    subscribe(listener: (event: string, payload: unknown) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(event: string, payload: unknown) {
      for (const listener of listeners) listener(event, payload);
    },
  };
  const delivered: string[] = [];
  let revoked = false;
  function instance(name: string) {
    const socket = {
      data: { session: name },
      emit: () => delivered.push(name),
      disconnect() {},
    };
    const io = { use() {}, sockets: { sockets: new Map([[name, socket]]) } };
    const auth = {
      async authenticate() {
        return { role: name === "second" && revoked ? "user" : "admin" };
      },
    };
    return secureRealtime(io, auth, ["https://example.invalid"], false, bus);
  }
  const first = instance("first");
  const second = instance("second");
  first.emit("newOrder", { _id: "synthetic" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(delivered.sort(), ["first", "second"]);
  revoked = true;
  delivered.length = 0;
  first.emit("newOrder", {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(delivered, ["first"]);
  first.close();
  second.close();
  assert.equal(listeners.size, 0);
});

test("category archive retains records and references without invoking destructive providers", async () => {
  const { createServer } = await import("node:http");
  const { ObjectId } = await import("mongodb");
  const { createLegacyApp } = require("../backend/app.js");
  const document: Record<string, unknown> = { _id: new ObjectId("e".repeat(24)), image: "synthetic.webp", gdriveFileId: "synthetic-drive-id" };
  let histories = 0;
  const db = { client: { startSession: () => ({ withTransaction: async (run: () => Promise<void>) => run(), endSession: async () => {} }) },
    collection: (name: string) => name === 'categories' ? {
      findOne: async () => document,
      updateOne: async (_filter: unknown, update: { $set: Record<string, unknown> }) => { Object.assign(document, update.$set); },
    } : { insertOne: async () => { histories++; } } };
  const app = createLegacyApp({ development: true, origins: ["http://localhost:3000"], getCommerceDb: () => db,
    auth: { authenticate: async () => ({ id: "a".repeat(24), role: "admin", cities: [] }) },
    routers: { category: require("../backend/routes/categories") } });
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const result = await fetch(`http://127.0.0.1:${address.port}/api/category/${"e".repeat(24)}`, {
      method: "DELETE", headers: { Origin: "http://localhost:3000", "X-CSRF-Protection": "1" } });
    assert.equal(result.status, 200); assert.equal((await result.json()).success, true);
    assert.ok(document.archivedAt); assert.equal(document.disabled, true); assert.equal(histories, 1);
    assert.equal(document.gdriveFileId, 'synthetic-drive-id'); assert.equal(document.image, 'synthetic.webp');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('created product envelope retains the product identity while recursively removing private fields', () => {
  assert.deepEqual(project({ message: 'Created', product: { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Fixture', password: 'private', customerToken: 'private', category: { name: 'Category', password: 'private' } } }), { message: 'Created', product: { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Fixture', category: { name: 'Category' } } });
});

test("the product list, editor queue and bulk visibility cross the gateway only with fixed parameters and fields", () => {
  assert.equal(accessPolicy("GET", "products/catalogue"), "staff");
  assert.equal(accessPolicy("GET", "products/queue"), "admin");
  assert.equal(accessPolicy("POST", "products/visibility"), "admin");
  assert.equal(accessPolicy("PUT", "products/visibility"), undefined);
  // The retained API lists these before /products/:id, which is public.
  assert.equal(lookupPolicy("GET", "/api/products/catalogue").policy, "staff");
  assert.equal(lookupPolicy("GET", "/api/products/queue").policy, "admin");
  assert.equal(lookupPolicy("POST", "/api/products/visibility").policy, "admin");
  const id = "a".repeat(24);
  const list = new URLSearchParams(upstreamQuery("products/catalogue", new URLSearchParams({ view: "hidden", filter: "missing-photo", offset: "6000" })));
  assert.deepEqual([list.get("view"), list.get("filter"), list.get("offset"), list.get("limit")], ["hidden", "missing-photo", "6000", "25"]);
  assert.equal(new URLSearchParams(upstreamQuery("products/queue", new URLSearchParams({ id, filter: "ready" }))).get("id"), id);
  for (const input of [{ view: "archived" }, { filter: "{}" }, { limit: "101" }, { sort: "$where" }, { codes: "a b" }])
    assert.throws(() => upstreamQuery("products/catalogue", new URLSearchParams(input as unknown as Record<string, string>)));
  assert.throws(() => upstreamQuery("products/queue", new URLSearchParams({ view: "hidden" })));
  // Unknown upstream fields never reach the browser.
  const queue = { previousId: null, nextId: id, position: 1, total: 2 };
  assert.deepEqual(projectAdminResponse("products/queue", queue), queue);
  assert.throws(() => projectAdminResponse("products/queue", { ...queue, passwordHash: "private" }));
  assert.throws(() => projectAdminResponse("products/visibility", { results: [{ id, ok: true, changed: true, actor: "private" }] }));
  assert.equal(legacyAdminDestination("/admin/disabled"), "/admin/products?view=disabled");
  assert.equal(readCatalogueContext({ view: "disabled", filter: "$where", category: "x" }).view, "hidden");
  assert.deepEqual(readCatalogueContext({ view: "disabled", filter: "$where", category: "x" }), { view: "hidden", filter: "all" });
});
