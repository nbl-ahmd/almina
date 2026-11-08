import { createHash } from "node:crypto";
import {
  ObjectId,
  type Db,
  type Document,
  type ClientSession,
  type WithId,
} from "mongodb";
import { z } from "zod";
import {
  staffAlertQuerySchema,
  staffAlertActionSchema,
  staffAlertPreferencesSchema,
  staffAlertRulesSchema,
  type Staff,
} from "@almina/contracts";
import { administrator, serializeStaffWrites } from "../auth/administration.js";
import { branchOrderFilter } from "../orders/routing.js";
import { orderFilter } from "../orders/repository.js";
import { historicalStatus } from "../orders/status.js";
import { indexPlan } from "../../database/indexes.js";
import { HttpError } from "../../errors.js";
type Row = Document & { _id: string };
const query = { maxTimeMS: 3000 },
  expires = () => new Date(Date.now() + 30 * 86400000);
export async function alertIdentity(db: Db, actor: string): Promise<Staff> {
  if (!ObjectId.isValid(actor)) throw new HttpError(403, "FORBIDDEN");
  const user = await db.collection("users").findOne(
    {
      _id: new ObjectId(actor),
      disabled: { $ne: true },
      role: { $in: ["admin", "user"] },
    },
    {
      ...query,
      projection: {
        username: 1,
        name: 1,
        role: 1,
        cities: 1,
        branchId: 1,
        accountType: 1,
      },
    },
  );
  if (!user) throw new HttpError(403, "FORBIDDEN");
  return {
    id: actor,
    username: user.username ?? "",
    name: user.name ?? "",
    role: user.role,
    cities: Array.isArray(user.cities) ? user.cities : [],
    ...(user.branchId ? { branchId: user.branchId } : {}),
    ...(user.accountType ? { accountType: user.accountType } : {}),
  };
}
export async function alertRules(db: Db) {
  const row = await db
    .collection<Row>("notification_controls")
    .findOne({ _id: "staff-alert-rules" }, query);
  return staffAlertRulesSchema.parse({
    lowStockThreshold: row?.lowStockThreshold ?? 5,
    revision: row?.revision ?? 0,
  });
}
export async function saveAlertRules(db: Db, raw: unknown, actor: string) {
  const parsed = staffAlertRulesSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");
  await serializeStaffWrites(db, async (session) => {
    await administrator(db, actor, session);
    const current = await db
      .collection<Row>("notification_controls")
      .findOne({ _id: "staff-alert-rules" }, { session });
    if ((current?.revision ?? 0) !== parsed.data.revision)
      throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
    await db.collection<Row>("notification_controls").updateOne(
      { _id: "staff-alert-rules" },
      {
        $set: {
          lowStockThreshold: parsed.data.lowStockThreshold,
          revision: parsed.data.revision + 1,
          updatedBy: actor,
          updatedAt: new Date(),
        },
      },
      { session, upsert: true },
    );
  });
  return alertRules(db);
}
export async function alertPreferences(db: Db, actor: string) {
  await alertIdentity(db, actor);
  const row = await db
    .collection<Row>("staff_alert_preferences")
    .findOne({ _id: actor }, query);
  return staffAlertPreferencesSchema.parse(
    Object.fromEntries(
      Object.keys(staffAlertPreferencesSchema.shape)
        .filter((key) => row?.[key] !== undefined)
        .map((key) => [key, row![key]]),
    ),
  );
}
export async function saveAlertPreferences(
  db: Db,
  raw: unknown,
  actor: string,
) {
  await alertIdentity(db, actor);
  const parsed = staffAlertPreferencesSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");
  await db
    .collection<Row>("staff_alert_preferences")
    .updateOne(
      { _id: actor },
      { $set: parsed.data },
      { ...query, upsert: true },
    );
  return parsed.data;
}
export async function recordAlert(
  db: Db,
  id: string,
  value: Document,
  session?: ClientSession,
) {
  const existing = await db
    .collection("staff_alerts")
    .findOne(
      { eventId: id },
      { ...query, ...(session ? { session } : {}), projection: { _id: 1 } },
    );
  if (existing) return false;
  try {
    await db
      .collection("staff_alerts")
      .insertOne(
        { eventId: id, ...value, expiresAt: expires() },
        { ...(session ? { session } : {}) },
      );
    return true;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000))
      throw error;
    return false;
  }
}
function eventDate(value: unknown) {
  const parsed =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : new Date(0);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date(0);
}
function orderEventId(order: Document) {
  return `order:${order._id}:${order.deliveryAssignment?.branchId ?? "legacy"}:${Array.isArray(order.assignmentHistory) ? order.assignmentHistory.length : 0}`;
}
export async function recordOrderAlert(db: Db, order: Document) {
  const status = historicalStatus(order),
    eligible =
      !["cancelled", "refunded"].includes(status) &&
      (order.payment?.provider !== "stripe" ||
        (order.payment.testMode === false &&
          order.payment.state === "paid" &&
          !order.payment.refundRequested));
  const branchId = order.deliveryAssignment?.branchId ?? null;
  const eventId = orderEventId(order);
  await db.collection("staff_alerts").updateMany(
    {
      entityId: String(order._id),
      kind: "order",
      resolved: false,
      ...(eligible ? { eventId: { $ne: eventId } } : {}),
    },
    { $set: { resolved: true } },
    query,
  );
  if (!eligible) return;
  await recordAlert(db, eventId, {
    kind: "order",
    audience: "orders",
    entityId: String(order._id),
    branchId,
    title: "Order received",
    description: `Order ${String(order.orderId ?? "").slice(0, 80)} is ready to review.`,
    href: `/admin/orders/${order._id}`,
    createdAt: eventDate(
      order.assignmentHistory?.at(-1)?.at ??
        order.payment?.paidAt ??
        order.createdAt,
    ),
    resolved: status !== "pending",
    announce: true,
  });
  if (status !== "pending")
    await db
      .collection("staff_alerts")
      .updateOne({ eventId }, { $set: { resolved: true } }, query);
}
/** Alerts observe main stock; they never alter products, reservations or prices. */
export async function observeStock(db: Db, productId: ObjectId) {
  const session = db.client.startSession();
  try {
    await session.withTransaction(
      async () => {
        const product = await db.collection("products").findOne(
            { _id: productId },
            {
              session,
              projection: {
                stock: 1,
                product_id: 1,
                name: 1,
                active: 1,
                published: 1,
                disabled: 1,
                archivedAt: 1,
              },
            },
          ),
          rules = await alertRules(db),
          states = db.collection<Row>("staff_stock_state"),
          id = String(productId),
          prior = await states.findOne({ _id: id }, { session });
        const low =
          !!product &&
          Number.isSafeInteger(product.stock) &&
          product.stock >= 0 &&
          product.stock <= rules.lowStockThreshold &&
          product.active !== false &&
          product.published !== false &&
          product.disabled !== true &&
          !product.archivedAt;
        const escalation =
          !!prior?.low && prior.lastStock > 0 && product?.stock === 0;
        const episodeAt =
          low && (!prior?.low || escalation)
            ? new Date()
            : (prior?.episodeAt ?? new Date(0));
        const episode =
            (prior?.episode ?? 0) +
            (low && (!prior?.low || escalation) ? 1 : 0),
          eventId = `stock:${id}:${episode}`;
        if (prior?.low && (!low || escalation))
          await db.collection("staff_alerts").updateMany(
            {
              entityId: id,
              kind: { $in: ["low-stock", "out-of-stock"] },
              resolved: false,
            },
            { $set: { resolved: true } },
            { session },
          );
        if (low) {
          const kind = product!.stock === 0 ? "out-of-stock" : "low-stock";
          await recordAlert(
            db,
            eventId,
            {
              kind,
              audience: "admin",
              entityId: id,
              title: kind === "out-of-stock" ? "Out of stock" : "Low stock",
              description: `${String(product!.name ?? "Product").slice(0, 160)} (${String(product!.product_id ?? id).slice(0, 60)}): ${product!.stock} available.`,
              href: `/admin/products/${id}`,
              createdAt: episodeAt,
              resolved: false,
              announce: !!prior && prior.rulesRevision === rules.revision,
            },
            session,
          );
          await db.collection("staff_alerts").updateOne(
            { eventId },
            {
              $set: {
                kind,
                title: kind === "out-of-stock" ? "Out of stock" : "Low stock",
                description: `${String(product!.name ?? "Product").slice(0, 160)} (${String(product!.product_id ?? id).slice(0, 60)}): ${product!.stock} available.`,
                expiresAt: expires(),
              },
            },
            { session },
          );
          // Initial catalogue and rule changes are quiet. Only a new observed episode wakes devices.
          if (
            prior &&
            (!prior.low || escalation) &&
            prior.rulesRevision === rules.revision
          )
            await db.collection<Row>("order_outbox").updateOne(
              { _id: eventId },
              {
                $setOnInsert: {
                  kind: "stock-alert",
                  inAppState: "done",
                  alertId: eventId,
                  state: "not_required",
                  pushState: "pending",
                  createdAt: new Date(),
                },
              },
              { session, upsert: true },
            );
        }
        await states.updateOne(
          { _id: id },
          {
            $set: {
              low,
              episode,
              episodeAt,
              checkedAt: new Date(),
              lastStock: product?.stock ?? null,
              rulesRevision: rules.revision,
            },
          },
          { session, upsert: true },
        );
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
    );
  } finally {
    await session.endSession();
  }
}
async function permittedAlerts(
  db: Db,
  staff: Staff,
  before?: string,
  requested?: string[],
): Promise<WithId<Document>[]> {
  const scope =
    staff.role === "admin"
      ? {
          $or: [
            { audience: { $in: ["admin", "orders"] } },
            { audience: "user", userId: staff.id },
          ],
        }
      : {
          $or: [
            {
              audience: "orders",
              branchId: { $in: [staff.branchId ?? "no-branch", null] },
            },
            { audience: "user", userId: staff.id },
          ],
        };
  const rows = await db
    .collection("staff_alerts")
    .find(
      {
        ...scope,
        ...(requested
          ? { _id: { $in: requested.map((id) => new ObjectId(id)) } }
          : {}),
        ...(before ? { _id: { $lt: new ObjectId(before) } } : {}),
      },
      query,
    )
    .sort({ _id: -1 })
    .limit(250)
    .toArray();
  const ids = rows
    .filter((row) => row.audience === "orders")
    .map((row) => new ObjectId(row.entityId));
  const allowed = ids.length
    ? await db
        .collection("orders")
        .find(
          {
            $and: [
              { _id: { $in: ids } },
              await branchOrderFilter(
                db,
                staff,
                orderFilter({ limit: 1 }, staff),
              ),
            ],
          },
          {
            ...query,
            projection: { _id: 1, status: 1, dispatched: 1, canceled: 1 },
          },
        )
        .toArray()
    : [];
  return rows
    .filter(
      (row) =>
        row.audience !== "orders" ||
        allowed.some((order) => String(order._id) === row.entityId),
    )
    .map((row) => ({
      ...row,
      resolved:
        row.resolved ||
        (row.kind === "order" &&
          allowed.some(
            (order) =>
              String(order._id) === row.entityId &&
              historicalStatus(order) !== "pending",
          )),
    }));
}
export async function notificationFeed(db: Db, raw: unknown, actor: string) {
  const input = staffAlertQuerySchema.safeParse(raw);
  if (!input.success) throw new HttpError(400, "INVALID_REQUEST");
  const staff = await alertIdentity(db, actor);
  // Bootstrap existing pending work without treating it as a newly received browser event.
  const orders = await db
    .collection("orders")
    .find(
      {
        $and: [
          await branchOrderFilter(db, staff, orderFilter({ limit: 1 }, staff)),
          {
            $or: [
              { status: "pending" },
              {
                status: { $exists: false },
                dispatched: { $ne: true },
                canceled: { $ne: true },
              },
            ],
          },
          {
            $or: [
              { "payment.provider": { $ne: "stripe" } },
              {
                "payment.provider": "stripe",
                "payment.testMode": false,
                "payment.state": "paid",
                "payment.refundRequested": { $ne: true },
              },
            ],
          },
        ],
      },
      query,
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(25)
    .toArray();
  const existing = await db
    .collection("staff_alerts")
    .find(
      { eventId: { $in: orders.map(orderEventId) } },
      { ...query, projection: { eventId: 1 } },
    )
    .limit(25)
    .toArray();
  const existingIds = new Set(existing.map((row) => row.eventId));
  for (const order of orders)
    if (!existingIds.has(orderEventId(order)))
      await recordOrderAlert(db, order);
  const rows = await permittedAlerts(db, staff, input.data.before),
    reads = await db
      .collection("staff_alert_reads")
      .find(
        { userId: actor, alertId: { $in: rows.map((row) => String(row._id)) } },
        query,
      )
      .limit(250)
      .toArray(),
    readIds = new Set(
      reads.filter((row) => row.read === true).map((row) => row.alertId),
    );
  const eligible = rows.filter(
      (row) => input.data.filter === "all" || !readIds.has(String(row._id)),
    ),
    page = eligible.slice(0, 25);
  return {
    items: page.map((row) => ({
      id: String(row._id),
      kind: row.kind,
      title: row.title,
      description: row.description,
      href: row.href,
      createdAt: row.createdAt.toISOString(),
      resolved: !!row.resolved,
      read: readIds.has(String(row._id)),
      announce: row.announce !== false,
    })),
    nextCursor:
      eligible.length > 25
        ? String(page.at(-1)!._id)
        : rows.length === 250
          ? String(rows.at(-1)!._id)
          : null,
    unread: rows.filter((row) => !readIds.has(String(row._id)) && !row.resolved)
      .length,
    hasMoreUnread: rows.length === 250,
    observedAt: new Date().toISOString(),
  };
}
export async function markNotifications(db: Db, raw: unknown, actor: string) {
  const input = staffAlertActionSchema.safeParse(raw);
  if (!input.success || input.data.ids.some((id) => !ObjectId.isValid(id)))
    throw new HttpError(400, "INVALID_REQUEST");
  const staff = await alertIdentity(db, actor),
    rows = await permittedAlerts(db, staff, undefined, input.data.ids);
  const allowed = new Set(rows.map((row) => String(row._id)));
  if (input.data.ids.some((id) => !allowed.has(id)))
    throw new HttpError(404, "NOT_FOUND");
  for (const id of input.data.ids)
    await db.collection<Row>("staff_alert_reads").updateOne(
      {
        _id: createHash("sha256")
          .update(actor + ":" + id)
          .digest("hex"),
      },
      {
        $set: {
          userId: actor,
          alertId: id,
          read: input.data.read,
          expiresAt: expires(),
        },
      },
      { ...query, upsert: true },
    );
  return { message: "Notifications updated" };
}
export async function testStaffNotification(
  db: Db,
  raw: unknown,
  actor: string,
) {
  await alertIdentity(db, actor);
  const input = z.object({ key: z.uuid() }).strict().safeParse(raw);
  if (!input.success) throw new HttpError(400, "INVALID_REQUEST");
  const id = `test:${actor}:${input.data.key}`;
  if (!(await db.collection("staff_alerts").findOne({ eventId: id }, query))) {
    const limit = await db
      .collection<Row>("notification_controls")
      .findOneAndUpdate(
        {
          _id: `test-rate:${actor}`,
          $or: [
            { nextAt: { $lte: new Date() } },
            { nextAt: { $exists: false } },
          ],
        },
        { $set: { nextAt: new Date(Date.now() + 60000) } },
        { ...query, returnDocument: "after" },
      );
    if (!limit) {
      try {
        await db.collection<Row>("notification_controls").insertOne({
          _id: `test-rate:${actor}`,
          nextAt: new Date(Date.now() + 60000),
        });
      } catch (error) {
        if (
          !(error instanceof Error && "code" in error && error.code === 11000)
        )
          throw error;
        throw new HttpError(429, "RATE_LIMITED");
      }
    }
  }
  await recordAlert(db, id, {
    kind: "test",
    audience: "user",
    userId: actor,
    title: "Test notification",
    description: "Your in-app notification centre is working.",
    href: "/admin/notifications",
    createdAt: new Date(),
    resolved: false,
  });
  await db.collection<Row>("order_outbox").updateOne(
    { _id: id },
    {
      $setOnInsert: {
        kind: "test-notification",
        inAppState: "done",
        userId: actor,
        state: "not_required",
        pushState: "pending",
        createdAt: new Date(),
      },
    },
    { ...query, upsert: true },
  );
  return {
    message:
      "Test queued for your registered devices. In-app delivery is available now.",
  };
}
export async function prepareStaffAlertStorage(db: Db) {
  for (const collection of ["staff_alerts", "staff_alert_reads"])
    await db.collection(collection).createIndexes([...indexPlan[collection]!]);
  await db
    .collection("order_outbox")
    .createIndex(
      { inAppState: 1, createdAt: 1, _id: 1 },
      { name: "staff_alert_job_claim" },
    );
}
