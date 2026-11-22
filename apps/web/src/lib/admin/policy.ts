import { staffAlertQuerySchema,staffAlertFeedSchema,staffAlertPreferencesSchema,staffAlertRulesSchema } from '@almina/contracts';
import {searchQuerySchema,searchAdminSchema,searchTestSchema} from '@almina/contracts/search';
import { productContentNames, imageReviewListQuerySchema, imageReviewExportQuerySchema, projectImageReviewResponse } from '@almina/contracts';
import { z } from "zod";
import { branchLoginAvailabilitySchema,branchLoginAvailabilityQuerySchema,storeAccountRouteAllowed, operationsSnapshotSchema,branchWorkspaceSchema } from '@almina/contracts';
export const identitySchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
  username: z.string(),
  name: z.string(),
  role: z.enum(["admin", "user"]),
  cities: z.array(z.string()),
  branchId: z.uuid().nullable().optional(),
  accountType: z.literal("branch").optional(),
});
export type Identity = z.infer<typeof identitySchema>;
export type AdminRecord = Record<string, unknown>;
export const sections = [
  "branches", "delivery-zones",
  "dashboard",
  "operations",
  "products",
  "needs-action",
  "categories",
  "banners",
  "orders",
  "whatsapp",
  "users",
  "notifications",
  "settings",
  "batch",
  "catalog-import",
  "image-review",
  "growth",
  "search",
  "wholesale",
  "marketing",
] as const;
export type Section = (typeof sections)[number];
export function canVisit(role: Identity["role"], section: string, accountType?: Identity["accountType"]) {
  if (accountType === "branch") return ["orders", "notifications"].includes(section);
  return (
    role === "admin" ||
    ["dashboard", "products", "orders", "notifications", "marketing", "image-review"].includes(section)
  );
}
const id = "[a-fA-F0-9]{24}";
const rules: [string, string, "admin" | "staff" | "login"][] = [
  ['GET','orders/notifications','staff'],['POST','orders/notifications/read','staff'],['GET','orders/notifications/preferences','staff'],['PUT','orders/notifications/preferences','staff'],['POST','orders/notifications/test','staff'],['GET','orders/notifications/rules','admin'],['PUT','orders/notifications/rules','admin'],
  ['POST','auth/delivery-place-search','admin'],
  ['GET','auth/branch-login-availability','admin'], ['GET','auth/branches','admin'], ['POST','auth/branches','admin'], ['POST','auth/branch-login','admin'],
  ['GET','auth/delivery-zones','admin'], ['GET','auth/branch-inventory','admin'],
  ...['delivery-zone','delivery-zone-delete','delivery-settings','branch-inventory'].map(path=>['POST','auth/'+path,'admin'] as [string,string,'admin']),
  ['PUT',`orders/${id}/branch`,'admin'],
  ['GET', 'auth/order-routing', 'admin'], ['PUT', 'auth/order-routing', 'admin'], ['PUT', `auth/users/${id}/assignment`, 'admin'],
  ['POST', `orders/${id}/confirm`, 'staff'], ['POST', `orders/${id}/pack`, 'staff'],
  ['GET', 'orders/notification-settings', 'staff'], ['GET', 'orders/receiving', 'staff'], ['PUT', `orders/${id}/routing`, 'admin'],
  ['GET','search','admin'],['GET','search/test','admin'],...['synonyms','rules','enrichment','query'].map(kind=>['POST','search/'+kind,'admin'] as [string,string,'admin']),
  ['GET', 'image-review/publication', 'admin'],
  ['POST', 'image-review/publication/start', 'admin'], ['POST', 'image-review/publication/resume', 'admin'], ['POST', 'image-review/publication/pause', 'admin'],
  ['GET', 'image-review/uploads/[a-f0-9]{64}', 'admin'],
  ['GET', 'image-review', 'staff'], ['GET', 'image-review/export', 'staff'], ['GET', 'image-review/[a-f0-9]{64}', 'staff'],
  ['POST', 'image-review/select', 'staff'], ['POST', 'image-review/decide', 'staff'],
  ...['stage', 'preview', 'import', 'publish', 'draft'].map(action => ['POST', `image-review/${action}`, 'admin'] as [string, string, 'admin']),
  ['GET', 'products/needs-action', 'admin'],
  ['GET', 'operations', 'admin'],
  ['POST','media/marketing','staff'],
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
  if(path==='orders/notifications')return new URLSearchParams(Object.entries(staffAlertQuerySchema.parse(values)).filter((entry):entry is [string,string]=>typeof entry[1]==='string')).toString();
  if(path==='auth/branch-login-availability')return new URLSearchParams(branchLoginAvailabilityQuerySchema.parse(values)).toString();
  if(path==='search/test'){const query=searchQuerySchema.parse(values);return new URLSearchParams(Object.entries(query).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)])).toString();}
  if (path === 'image-review' || path === 'image-review/export') {
    const parsed = (path.endsWith('/export') ? imageReviewExportQuerySchema : imageReviewListQuerySchema).parse(values);
    return new URLSearchParams(Object.entries(parsed).map(([key, value]) => [key, String(value)])).toString();
  }
  if (path === 'products/needs-action') {
    const query = listQuery.extend({ q: z.string().trim().min(1).max(80).optional(),
      reason: z.enum(['all', 'identity', 'classification', 'prescription', 'content', 'images', 'missing-photo']).default('all'),
      status:z.enum(['drafts','published','all']).default('drafts'),
    }).parse(values);
    return new URLSearchParams(Object.entries(query).map(([key,value]) => [key,String(value)])).toString();
  }
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
  if(path==='auth/branch-inventory'){if(input.size===0)return ''; const parsed=z.object({branchId:z.uuid(),q:z.string().max(60).optional(),before:z.string().regex(/^[a-f0-9]{24}$/i).optional()}).strict().parse(values);return new URLSearchParams({branchId:parsed.branchId,...(parsed.q?{q:parsed.q}:{}),...(parsed.before?{before:parsed.before}:{})}).toString();}
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
        review: z.literal("1").optional(),
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
      ...(query.review ? { review: query.review } : {}),
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
  "logins", "username", "disabled", "items", "reasons", "missingPhoto", "zoneId", "zoneName", "zoneRevision", "deliveryAssignment", "enabled", "kind", "location", "latitude", "longitude", "point", "hours", "geometry", "coordinates", "type", "zones", "settings", "priority", "color", "deliveryFeeMinor", "minimumOrderMinor", "estimatedMinutes", "availableGlobal", "branchStock", "branchId", "branchName", "routing", "areaId", "areaLabel", "needsReview", "revision", "branches", "areaIds", "fallbackBranchId", "staffing", "legacyStaff", "pendingCount", "reviewCount", "oldestPendingAt", "signature", "latestIds",
  ...productContentNames,
  "contactName", "phone", "tradeLicense", "taxRegistrationNumber", "deliveryAddress",
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
  "channel",
  "wholesale",
  "businessName",
  "typeId",
  "snapshotAvailable", "couponCode", "couponDiscountMinor",
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
  "schemaVersion",
  "lineSnapshots",
  "totalsSnapshot",
  "productId",
  "product",
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
  if(path==='auth/branch-login-availability')return branchLoginAvailabilitySchema.parse(value);
  if(path==='orders/notifications')return staffAlertFeedSchema.parse(value);
  if(path==='orders/notifications/preferences')return staffAlertPreferencesSchema.parse(value);
  if(path==='orders/notifications/rules')return staffAlertRulesSchema.parse(value);
  if(path==='orders/notification-settings')return z.object({enabled:z.boolean(),publicKey:z.string().regex(/^[A-Za-z0-9_-]{87}$/).nullable(),registeredDeviceIds:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(5)}).strict().parse(value);
  if(path==='auth/branches'||path==='auth/branch-login')return branchWorkspaceSchema.parse(value);
  if(path==='search'||path==='search/test'){const body=z.object({data:path==='search'?searchAdminSchema:searchTestSchema,requestId:z.uuid()}).strict().parse(value);return body.data;}
  if(/^search\/(synonyms|rules|enrichment|query)$/.test(path))return z.object({data:z.object({saved:z.literal(true)}).strict(),requestId:z.uuid()}).strict().parse(value).data;
  if (path === 'image-review' || path.startsWith('image-review/')) return projectImageReviewResponse(path, value);
  return path === 'operations' ? operationsSnapshotSchema.parse(value) : project(value);
}

/** Return only reviewed, non-sensitive setup conflict codes for their own routes. */
export function branchSetupConflict(path:string,body:unknown):string|null{if(!body||typeof body!=='object'||!('code' in body))return null;const code=body.code;if(code==='BRANCH_LOGIN_CONFLICT'&&['auth/branches','auth/branch-login'].includes(path))return code;if(code==='BRANCH_STOCK_CONFLICT'&&(path==='auth/branch-inventory'||/^products\/[a-f0-9]{24}$/i.test(path)))return code;if(code==='DELIVERY_SETUP_REQUIRED'&&path==='auth/delivery-settings')return code;return null;}

export function canAccessAdminRoute(user: Identity, method: string, path: string) {
  const policy = accessPolicy(method, path);
  return Boolean(policy && (policy !== "admin" || user.role === "admin") && (user.accountType !== "branch" || storeAccountRouteAllowed(method, path)));
}
