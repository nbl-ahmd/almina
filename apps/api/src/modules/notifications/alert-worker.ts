import { randomUUID, createHash } from "node:crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import {
  recordAlert,
  recordOrderAlert,
  observeStock,
  alertRules,
} from "./center.js";
type Row = Document & { _id: string };
const query = { maxTimeMS: 3000 };
/** Persistent-service reconciliation; never runs in Next.js or inside a commerce transaction. */
export async function notificationMaintenance(db: Db) {
  const controls = db.collection<Row>("notification_controls"),
    token = randomUUID(),
    now = new Date();
  await controls.updateOne(
    { _id: "staff-alert-maintenance" },
    { $setOnInsert: { leaseUntil: new Date(0), enabledAt: now } },
    { ...query, upsert: true },
  );
  const lease = await controls.findOneAndUpdate(
    { _id: "staff-alert-maintenance", leaseUntil: { $lte: now } },
    { $set: { leaseUntil: new Date(Date.now() + 60000), token } },
    { ...query, returnDocument: "after" },
  );
  if (!lease) return;
  try {
    const jobs = await db
      .collection<Row>("order_outbox")
      .find(
        {
          createdAt: { $gte: lease.enabledAt },
          inAppState: null,
          kind: {
            $nin: ["stock-alert", "operational-alert", "test-notification"],
          },
        },
        query,
      )
      .sort({ createdAt: 1, _id: 1 })
      .limit(25)
      .toArray();
    for (const job of jobs) {
      const order = await db
        .collection("orders")
        .findOne({ _id: job.orderId }, query);
      if (order) {
        await recordOrderAlert(db, order);
        for (const line of (order.lines ?? []).slice(0, 100))
          if (ObjectId.isValid(line.productId))
            await observeStock(db, new ObjectId(line.productId));
      }
      await db
        .collection<Row>("order_outbox")
        .updateOne({ _id: job._id }, { $set: { inAppState: "done" } }, query);
    }
    const payments = await db
      .collection("orders")
      .find(
        {
          "payment.provider": "stripe",
          "payment.refundIssue": { $type: "string" },
          ...(lease.paymentCursor ? { _id: { $gt: lease.paymentCursor } } : {}),
        },
        {
          ...query,
          projection: {
            _id: 1,
            orderId: 1,
            createdAt: 1,
            "payment.refundIssue": 1,
          },
        },
      )
      .sort({ _id: 1 })
      .limit(25)
      .toArray();
    for (const order of payments) {
      const eventId = `payment:${order._id}:${createHash("sha256").update(order.payment.refundIssue).digest("hex").slice(0, 16)}`;
      await db.collection("staff_alerts").updateMany(
        {
          kind: "payment",
          entityId: String(order._id),
          eventId: { $ne: eventId },
          resolved: false,
        },
        { $set: { resolved: true } },
        query,
      );
      await recordAlert(db, eventId, {
        kind: "payment",
        audience: "admin",
        entityId: String(order._id),
        title: "Payment needs attention",
        description: `Review payment reconciliation for order ${String(order.orderId ?? "").slice(0, 80)}.`,
        href: `/admin/orders/${order._id}`,
        createdAt: new Date(),
        resolved: false,
        announce: !!lease.paymentsPrimed,
      });
      // Recover a crash between recording the alert and enqueueing its push job.
      // The stored announce flag keeps initial backlog quiet on every later scan.
      if (
        await db
          .collection("staff_alerts")
          .findOne(
            { eventId, announce: true, resolved: false },
            { ...query, projection: { _id: 1 } },
          )
      )
        await db.collection<Row>("order_outbox").updateOne(
          { _id: eventId },
          {
            $setOnInsert: {
              kind: "operational-alert",
              inAppState: "done",
              alertId: eventId,
              state: "not_required",
              pushState: "pending",
              createdAt: new Date(),
            },
          },
          { ...query, upsert: true },
        );
    }
    await controls.updateOne(
      { _id: lease._id, token },
      {
        $set: {
          paymentCursor: payments.length === 25 ? payments.at(-1)!._id : null,
          paymentsPrimed: lease.paymentsPrimed || payments.length < 25,
        },
      },
      query,
    );
    const outstanding = await db
      .collection("staff_alerts")
      .find(
        {
          kind: "payment",
          resolved: false,
          ...(lease.resolveCursor ? { _id: { $gt: lease.resolveCursor } } : {}),
        },
        { ...query, projection: { _id: 1, entityId: 1 } },
      )
      .sort({ _id: 1 })
      .limit(100)
      .toArray();
    const unresolved = await db
      .collection("orders")
      .find(
        {
          _id: { $in: outstanding.map((row) => new ObjectId(row.entityId)) },
          "payment.refundIssue": { $type: "string" },
        },
        { ...query, projection: { _id: 1 } },
      )
      .limit(100)
      .toArray();
    const active = new Set(unresolved.map((row) => String(row._id)));
    const resolved = outstanding
      .filter((row) => !active.has(row.entityId))
      .map((row) => row._id);
    if (resolved.length)
      await db
        .collection("staff_alerts")
        .updateMany(
          { _id: { $in: resolved } },
          { $set: { resolved: true } },
          query,
        );
    await controls.updateOne(
      { _id: lease._id, token },
      {
        $set: {
          resolveCursor:
            outstanding.length === 100 ? outstanding.at(-1)!._id : null,
        },
      },
      query,
    );
    // Rolling reconciliation covers ERP/import/admin edits without hooking commerce writes.
    const products = await db
      .collection("products")
      .find(lease.productCursor ? { _id: { $gt: lease.productCursor } } : {}, {
        ...query,
        projection: {
          _id: 1,
          stock: 1,
          active: 1,
          published: 1,
          disabled: 1,
          archivedAt: 1,
        },
      })
      .sort({ _id: 1 })
      .limit(100)
      .toArray();
    const states = await db
        .collection<Row>("staff_stock_state")
        .find({ _id: { $in: products.map((row) => String(row._id)) } }, query)
        .limit(100)
        .toArray(),
      rules = await alertRules(db);
    for (const product of products) {
      const prior = states.find((row) => row._id === String(product._id)),
        low =
          Number.isSafeInteger(product.stock) &&
          product.stock >= 0 &&
          product.stock <= rules.lowStockThreshold &&
          product.active !== false &&
          product.published !== false &&
          product.disabled !== true &&
          !product.archivedAt;
      if (
        !prior ||
        prior.low !== low ||
        prior.lastStock !== product.stock ||
        prior.rulesRevision !== rules.revision ||
        !prior.checkedAt ||
        prior.checkedAt.getTime() < Date.now() - 86400000
      )
        await observeStock(db, product._id);
    }
    await controls.updateOne(
      { _id: lease._id, token },
      {
        $set: {
          productCursor: products.length === 100 ? products.at(-1)!._id : null,
        },
      },
      query,
    );
  } finally {
    await controls.updateOne(
      { _id: "staff-alert-maintenance", token },
      { $set: { leaseUntil: new Date(0) }, $unset: { token: "" } },
      query,
    );
  }
}
export function staffAlertWorker(
  getDb: () => Db | Promise<Db>,
  onFailure: () => void = () => {},
) {
  let stopped = false,
    running: Promise<void> | undefined;
  function tick() {
    if (stopped) return Promise.resolve();
    return (running ??= (async () => {
      try {
        await notificationMaintenance(await getDb());
      } catch {
        onFailure();
      }
    })().finally(() => {
      running = undefined;
    }));
  }
  const timer = setInterval(() => void tick(), 5000);
  timer.unref();
  void tick();
  return {
    tick,
    async stop() {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
