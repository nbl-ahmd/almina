import { productContentNames } from '@almina/contracts';
import { z } from "zod";
import { operationsSnapshotSchema } from '@almina/contracts';
export const identitySchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
  username: z.string(),
  name: z.string(),
  role: z.enum(["admin", "user"]),
  cities: z.array(z.string()),
});
export type Identity = z.infer<typeof identitySchema>;
export type AdminRecord = Record<string, unknown>;
export const sections = [
  "dashboard",
  "operations",
  "products",
  "categories",
  "banners",
  "orders",
  "whatsapp",
  "users",
  "notifications",
  "settings",
  "batch",
  "catalog-import",
] as const;
export type Section = (typeof sections)[number];
export function canVisit(role: Identity["role"], section: string) {
  return (
    role === "admin" ||
    ["dashboard", "products", "orders", "notifications"].includes(section)
  );
}
const id = "[a-fA-F0-9]{24}";
const rules: [string, string, "admin" | "staff" | "login"][] = [
  ['GET', 'operations', 'admin'],
  ['GET','catalog-import/template','admin'],
  ...['preview','commit','report','rollback'].map(action=>['POST',`catalog-import/${action}`,'admin'] as [string,string,'admin']),
  ["POST", "auth/login", "login"],
  ["GET", "auth/me", "staff"],
  ["POST", "auth/logout", "staff"],
  ["POST", "auth/logout-all", "staff"],
  ["GET", "auth/users", "admin"],
  ["POST", "auth/signup", "admin"],
  ["DELETE", `auth/users/${id}`, "admin"],
  ["GET", "products", "staff"],
  ["GET", "products/search", "staff"],
  ["GET", `products/${id}`, "staff"],
  ["POST", "products", "admin"],
  ["POST", `media/products/${id}`, "admin"],
  ["PUT", `products/${id}`, "admin"],
  ["PUT", `products/publish/${id}`, "admin"],
  ["DELETE", `products/${id}`, "admin"],
  ["GET", "category", "admin"],
  ["GET", `category/${id}`, "admin"],
  ["POST", "category", "admin"],
  ["PUT", `category/${id}`, "admin"],
  ["PUT", `category/disable/${id}`, "admin"],
  ["DELETE", `category/${id}`, "admin"],
  ["GET", "banners", "admin"],
  ["POST", "banners", "admin"],
  ["DELETE", `banners/${id}`, "admin"],
  ["GET", "orders", "staff"],
  ["GET", `orders/${id}`, "staff"],
  ["PUT", `orders/${id}`, "staff"],
  ["PUT", `orders/cancel/${id}`, "staff"],
  ["PUT", `orders/edit/${id}`, "admin"],
  ["POST", "orders/subscribe", "staff"],
  ["DELETE", "orders/subscribe", "staff"],
  ["GET", "store/status", "admin"],
  ["PUT", "store/status", "admin"],
  ["POST", "batch", "admin"],
  ["GET", "recovery/template", "admin"],
  ["POST", "recovery/preview", "admin"],
  ["POST", "recovery/commit", "admin"],
  ["GET", "whatsapp/recipients", "admin"],
  ["GET", "whatsapp/reports", "admin"],
  ["GET", "whatsapp/image", "admin"],
  ["POST", "whatsapp/image", "admin"],
  ["DELETE", `whatsapp/image/${id}`, "admin"],
  ["GET", "whatsapp/messages/\\+?[0-9]{1,20}", "admin"],
  ["POST", "whatsapp/text", "admin"],
  ["POST", "whatsapp/s", "admin"],
];
export function accessPolicy(method: string, path: string) {
  if (path.includes("%") || path.includes("..") || path.includes("\\"))
    return undefined;
  return rules.find(
    ([verb, pattern]) =>
      verb === method && new RegExp(`^${pattern}$`).test(path),
  )?.[2];
}
const listQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();
export function upstreamQuery(path: string, input: URLSearchParams): string {
  if (new Set(input.keys()).size !== [...input.keys()].length)
    throw new Error("Invalid query");
  const values = Object.fromEntries(input);
  if (["products", "products/search"].includes(path)) {
    const query = listQuery
      .extend({
        q: z.string().min(1).max(80).optional(),
        view: z.enum(["all", "sale", "outofstock", "disabled"]).default("all"),
        category: z
          .string()
          .regex(/^[a-f0-9]{24}$/i)
          .optional(),
      })
      .parse(values);
    const filter = {
      ...(query.view === "sale" ? { sale: true } : {}),
      ...(query.view === "outofstock" ? { stock: 0 } : {}),
      ...(query.view === "disabled" ? { disabled: true } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    if (path.endsWith("/search") && !query.q) throw new Error("Missing search");
    return new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
      filter: JSON.stringify(filter),
      ...(query.q ? { q: query.q } : {}),
    }).toString();
  }
  if (path === "auth/users") {
    const query = z
      .object({
        limit: z
          .string()
          .regex(/^(?:[1-9][0-9]?|100)$/)
          .default("25"),
        before: z
          .string()
          .regex(/^[a-f0-9]{24}$/i)
          .optional(),
      })
      .strict()
      .parse(values);
    return new URLSearchParams({
      limit: query.limit,
      ...(query.before ? { before: query.before } : {}),
    }).toString();
  }
  if (path === "orders") {
    const query = listQuery
      .extend({
        status: z
          .enum([
            "pending",
            "confirmed",
            "packed",
            "dispatched",
            "cancelled",
            "refunded",
          ])
          .optional(),
      })
      .parse(values);
    return new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
      ...(query.status ? { status: query.status } : {}),
    }).toString();
  }
  if (
    [
      "category",
      "banners",
      "whatsapp/recipients",
      "whatsapp/reports",
      "whatsapp/image",
    ].includes(path)
  ) {
    const query = listQuery.parse(values);
    return new URLSearchParams({
      limit: String(query.limit),
      offset: String(query.offset),
    }).toString();
  }
  if (/^whatsapp\/messages\/\+?[0-9]{1,20}$/.test(path)) {
    const query = listQuery.extend({ offset: z.coerce.number().int().min(0).max(100000000).default(0) }).parse(values);
    return new URLSearchParams({ limit: String(query.limit), offset: String(query.offset) }).toString();
  }
  z.object({}).strict().parse(values);
  return "";
}
// Explicit recursive projection: provider IDs, hashes, subscriptions and unexpected fields never reach a browser.
const fields = new Set([
  ...productContentNames,
  "published","active","catalogManaged","websiteStockProposed","stockReviewedAt","previewId","errors","warnings","rows","row","field","message","sourceKey","action","productId","total","processed","complete","report","namespace","offset","nextOffset","previousPrice","previousStock","changedFields","unmappedCategories",
  "variantLabel", "familyKey", "familyName", "familyBrand", "familyForm", "familyStrength", "variantSize", "variantFlavour", "variantPackSize",
  "_id",
  "id",
  "username",
  "name",
  "role",
  "cities",
  "expiresAt",
  "product_id",
  "price",
  "stock",
  "barcode",
  "description",
  "sale",
  "salePrice",
  "salePercent",
  "saleType",
  "saleBadge",
  "vat",
  "featured",
  "disabled",
  "images",
  "image",
  "category",
  "color",
  "link",
  "status",
  "orderId",
  "snapshotAvailable",
  "buildingname",
  "flatno",
  "note",
  "payment",
  "maplink",
  "deliveryFee",
  "totalSalePrice",
  "totalPrice",
  "taxMinor",
  "customer",
  "mobile",
  "email",
  "address",
  "city",
  "emirate",
  "cartItems",
  "quantity",
  "subtotal",
  "total",
  "totalAmount",
  "deliveryCharge",
  "vatAmount",
  "createdAt",
  "updatedAt",
  "dispatched",
  "canceled",
  "cancelled",
  "billno",
  "billamount",
  "lineSnapshots",
  "totalsSnapshot",
  "productId",
  "unitPriceMinor",
  "lineTotalMinor",
  "subtotalMinor",
  "totalMinor",
  "deliveryMinor",
  "vatMinor",
  "from",
  "promotionStatus",
  "messages",
  "messageCount", "messageOffset", "hasOlderMessages",
  "content",
  "timestamp",
  "sender",
  "broadcast",
  "messageStatus",
  "errorDetails",
  "recipient",
  "success",
  "count",
  "message", "cloudinaryImages", "mediaRevision", "rows", "errors", "row", "field", "previewId", "hash", "batch", "created", "replayed",
]);
export function project(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(project);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => fields.has(key))
        .map(([key, entry]) => [key, project(entry)]),
    );
  return value;
}
export function projectAdminResponse(path: string, value: unknown): unknown {
  return path === 'operations' ? operationsSnapshotSchema.parse(value) : project(value);
}
