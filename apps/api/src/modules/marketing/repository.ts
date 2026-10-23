import { createHash, randomBytes } from "node:crypto";
import { type Db, type Document } from "mongodb";
import {
  marketingTemplateSchema,
  marketingContactSchema,
  marketingSendSchema,
  marketingTestSchema,
} from "@almina/contracts";
import { z } from "zod";
import { HttpError } from "../../errors.js";
import { emailHash } from "../notifications/provider.js";
import { renderMarketingEmail } from "./render.js";
import { marketingConnections } from "./delivery.js";
const collection = (db: Db, name: string) =>
  db.collection<Document & { _id: string }>(name);
export async function saveMarketingTemplate(
  db: Db,
  raw: unknown,
  actor: string,
) {
  const parsed = marketingTemplateSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");
  const input = parsed.data,
    rendered = await renderMarketingEmail(input.mjml);
  const current = await collection(db, "marketing_templates").findOne({
    _id: input.id,
  });
  if ((current?.revision ?? 0) !== input.revision)
    throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
  try {
    const result = await collection(db, "marketing_templates").updateOne(
      { _id: input.id, revision: input.revision },
      {
        $set: {
          ...input,
          ...rendered,
          html: rendered.html.replace(
            /<body([^>]*)>/i,
            `<body$1><div style="display:none;max-height:0;overflow:hidden">${input.previewText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`,
          ),
          revision: input.revision + 1,
          updatedAt: new Date(),
          actor,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: input.revision === 0 },
    );
    if (!result.matchedCount && !result.upsertedCount)
      throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    )
      throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
    throw error;
  }
  return collection(db, "marketing_templates").findOne(
    { _id: input.id },
    { projection: { actor: 0 } },
  );
}
export async function importMarketingContacts(
  db: Db,
  raw: unknown,
  actor: string,
) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 500)
    throw new HttpError(400, "INVALID_REQUEST");
  const rows = raw.map((value) => marketingContactSchema.safeParse(value));
  if (
    rows.some(
      (row) => !row.success || Date.parse(row.data.consentAt) > Date.now(),
    )
  )
    throw new HttpError(400, "INVALID_REQUEST");
  let imported = 0,
    blocked = 0;
  for (const row of rows) {
    if (!row.success) continue;
    const input = row.data,
      id = emailHash(input.email);
    if (
      (await collection(db, "email_suppressions").findOne({ _id: id })) ||
      (await collection(db, "marketing_contacts").findOne({
        _id: id,
        active: false,
      }))
    ) {
      blocked++;
      continue;
    }
    await collection(db, "marketing_contacts").updateOne(
      { _id: id },
      {
        $set: { ...input, actor, updatedAt: new Date() },
        $setOnInsert: { active: true, createdAt: new Date() },
      },
      { upsert: true },
    );
    imported++;
  }
  return { imported, blocked };
}
export async function queueMarketing(
  db: Db,
  raw: unknown,
  actor: string,
  test = false,
) {
  const parsed = test
    ? marketingTestSchema.safeParse(raw)
    : marketingSendSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "INVALID_REQUEST");
  const input = parsed.data;
  const settings = marketingConnections();
  if (
    !settings.providers.some(
      (row) => row.id === input.provider && row.configured,
    )
  )
    throw new HttpError(503, "SERVICE_UNAVAILABLE");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ ...input, test, actor }))
    .digest("hex");
  const previous = await collection(db, "marketing_campaigns").findOne({
    _id: input.requestId,
  });
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
    return { id: input.requestId, count: previous.count, replayed: true };
  }
  const template = await collection(db, "marketing_templates").findOne({
    _id: input.templateId,
    revision: input.expectedRevision,
  });
  if (!template) throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
  let recipients: {
    email: string;
    source: "customers" | "contacts" | "test";
  }[] = [];
  if ("email" in input) {
    const allowed = (process.env.MARKETING_TEST_RECIPIENTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(input.email.toLowerCase()))
      throw new HttpError(403, "FORBIDDEN");
    recipients = [{ email: input.email.toLowerCase(), source: "test" }];
  } else if ("audience" in input) {
    const name =
      input.audience === "customers" ? "customers" : "marketing_contacts";
    const filter =
      input.audience === "customers"
        ? { marketingEmail: true, disabled: { $ne: true } }
        : { active: true, ...(input.list ? { list: input.list } : {}) };
    const rows = await db
      .collection(name)
      .find(filter, { projection: { email: 1 }, maxTimeMS: 5000 })
      .limit(501)
      .toArray();
    if (rows.length > 500) throw new HttpError(400, "INVALID_REQUEST");
    recipients = rows
      .filter((row) => typeof row.email === "string")
      .map((row) => ({
        email: row.email.trim().toLowerCase(),
        source: input.audience,
      }));
  }
  recipients = [
    ...new Map(
      recipients
        .filter((row) => z.email().max(254).safeParse(row.email).success)
        .map((row) => [emailHash(row.email), row]),
    ).values(),
  ];
  if (!recipients.length) throw new HttpError(400, "INVALID_REQUEST");
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      const prior = await collection(db, "marketing_campaigns").findOne(
        { _id: input.requestId },
        { session },
      );
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new HttpError(409, "IDEMPOTENCY_CONFLICT");
        return;
      }
      await collection(db, "marketing_campaigns").insertOne(
        {
          _id: input.requestId,
          templateId: input.templateId,
          templateRevision: input.expectedRevision,
          subject: template.subject,
          html: template.html,
          provider: input.provider,
          actor,
          test,
          fingerprint,
          count: recipients.length,
          createdAt: new Date(),
        },
        { session },
      );
      await collection(db, "marketing_jobs").insertMany(
        recipients.map((row) => ({
          _id: input.requestId + ":" + emailHash(row.email),
          campaignId: input.requestId,
          provider: input.provider,
          to: row.email,
          emailHash: emailHash(row.email),
          source: row.source,
          state: "queued",
          createdAt: new Date(),
          unsubscribeToken: randomBytes(32).toString("base64url"),
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return { id: input.requestId, count: recipients.length, replayed: false };
}
export async function marketingReport(db: Db) {
  const rows = await collection(db, "marketing_campaigns")
    .find(
      {},
      { projection: { html: 0, fingerprint: 0, actor: 0 }, maxTimeMS: 3000 },
    )
    .sort({ createdAt: -1 })
    .limit(25)
    .toArray();
  const ids = rows.map((row) => row._id);
  const counts = await collection(db, "marketing_jobs")
    .aggregate<Document>(
      [
        { $match: { campaignId: { $in: ids } } },
        {
          $group: {
            _id: { campaign: "$campaignId", state: "$state" },
            count: { $sum: 1 },
          },
        },
      ],
      { maxTimeMS: 3000 },
    )
    .toArray();
  return rows.map((row) => ({
    ...row,
    states: Object.fromEntries(
      counts
        .filter((count) => count._id.campaign === row._id)
        .map((count) => [count._id.state, count.count]),
    ),
  }));
}
export async function unsubscribeMarketing(db: Db, token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new HttpError(400, "INVALID_REQUEST");
  const hash = createHash("sha256").update(token).digest("hex");
  const row = await collection(db, "marketing_unsubscribes").findOne({
    _id: hash,
  });
  if (!row) throw new HttpError(404, "NOT_FOUND");
  await collection(db, "email_suppressions").updateOne(
    { _id: row.emailHash },
    { $set: { marketingBlocked: true, updatedAt: new Date() } },
    { upsert: true },
  );
  await collection(db, "marketing_contacts").updateOne(
    { _id: row.emailHash },
    { $set: { active: false, unsubscribedAt: new Date() } },
  );
  await db
    .collection("customers")
    .updateMany(
      { emailHash: row.emailHash },
      { $set: { marketingEmail: false, consentUpdatedAt: new Date() } },
    );
}
export async function eligibleMarketingRecipient(db: Db, job: Document) {
  if (
    await collection(db, "email_suppressions").findOne({ _id: job.emailHash })
  )
    return false;
  if (job.source === "test") return true;
  if (job.source === "customers")
    return !!(await db.collection("customers").findOne(
      {
        emailHash: job.emailHash,
        marketingEmail: true,
        disabled: { $ne: true },
      },
      { projection: { _id: 1 } },
    ));
  return !!(await collection(db, "marketing_contacts").findOne({
    _id: job.emailHash,
    active: true,
  }));
}
