import { createHash } from "node:crypto";
import type { Db, Document } from "mongodb";
import { eligibleMarketingRecipient } from "./repository.js";
import {
  deliverMarketing,
  marketingConnections,
  type MarketingDelivery,
} from "./delivery.js";
import { emailFooter } from "./render.js";
import { EmailBudgetExceeded } from "../notifications/provider.js";
export async function processMarketingJob(
  db: Db,
  send: (
    db: Db,
    input: MarketingDelivery,
  ) => Promise<string> = deliverMarketing,
) {
  const jobs = db.collection<Document & { _id: string }>("marketing_jobs"),
    now = new Date();
  // An interrupted provider attempt is never automatically repeated, including on Outlook.
  await jobs.updateMany(
    { state: "sending", startedAt: { $lt: new Date(now.getTime() - 120000) } },
    { $set: { state: "uncertain", updatedAt: now } },
  );
  const availableProviders = marketingConnections()
    .providers.filter((row) => row.configured)
    .map((row) => row.id);
  if (!availableProviders.length) return false;
  const job = await jobs.findOneAndUpdate(
    {
      state: "queued",
      provider: { $in: availableProviders },
      nextAttemptAt: { $not: { $gt: now } },
    },
    { $set: { state: "sending", startedAt: now } },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
  if (!job) return false;
  try {
    if (!(await eligibleMarketingRecipient(db, job))) {
      await jobs.updateOne(
        { _id: job._id },
        { $set: { state: "skipped", updatedAt: now } },
      );
      return true;
    }
    const campaign = await db
      .collection<Document & { _id: string }>("marketing_campaigns")
      .findOne({ _id: job.campaignId });
    if (!campaign) throw Error("Campaign unavailable");
    const token = String(job.unsubscribeToken),
      url = new URL(
        "/api/v1/marketing/unsubscribe/" + token,
        process.env.EMAIL_PUBLIC_API_ORIGIN,
      ).href;
    await db
      .collection<Document & { _id: string }>("marketing_unsubscribes")
      .updateOne(
        { _id: createHash("sha256").update(token).digest("hex") },
        { $setOnInsert: { emailHash: job.emailHash, createdAt: now } },
        { upsert: true },
      );
    const html = String(campaign.html).replace(
      /<\/body>/i,
      emailFooter(url, marketingConnections().postalAddress) + "</body>",
    );
    const providerId = await send(db, {
      id: createHash("sha256").update(job._id).digest("hex"),
      provider: campaign.provider,
      to: job.to,
      subject: campaign.subject,
      html,
      unsubscribe: url,
    });
    await jobs.updateOne(
      { _id: job._id },
      {
        $set: { state: "accepted", providerId, updatedAt: new Date() },
        $unset: { unsubscribeToken: "" },
      },
    );
    if (campaign.provider === "resend")
      await db
        .collection<Document & { _id: string }>("email_delivery")
        .updateOne(
          { _id: providerId },
          {
            $set: {
              kind: "campaign",
              recipientHash: job.emailHash,
              acceptedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
  } catch (error) {
    await jobs.updateOne(
      { _id: job._id },
      {
        $set:
          error instanceof EmailBudgetExceeded
            ? {
                state: "queued",
                nextAttemptAt: new Date(
                  Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate() + 1,
                  ),
                ),
              }
            : { state: "uncertain", updatedAt: new Date() },
      },
    );
  }
  return true;
}
export function marketingWorker(getDb: () => Promise<Db>) {
  let stopped = false,
    running: Promise<unknown> | undefined;
  const tick = () => {
    if (stopped || running || !marketingConnections().enabled) return;
    running = getDb()
      .then((db) => processMarketingJob(db))
      .catch(() => undefined)
      .finally(() => {
        running = undefined;
      });
  };
  const timer = setInterval(tick, 4000);
  timer.unref();
  tick();
  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
