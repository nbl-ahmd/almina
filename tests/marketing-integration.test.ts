import test from "node:test";
import assert from "node:assert/strict";
import { MongoClient, ObjectId, type Document } from "mongodb";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import express from "express";
import { installMarketingRoutes } from "../apps/api/src/modules/marketing/routes";
import {
  saveMarketingTemplate,
  importMarketingContacts,
  queueMarketing,
  unsubscribeMarketing,
  marketingReport,
} from "../apps/api/src/modules/marketing/repository";
import { processMarketingJob } from "../apps/api/src/modules/marketing/worker";
import { emailHash } from "../apps/api/src/modules/notifications/provider";
import { deliverMarketing } from "../apps/api/src/modules/marketing/delivery";
import { EmailBudgetExceeded } from "../apps/api/src/modules/notifications/provider";
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(
  uri || process.env.REQUIRE_DATABASE_TESTS !== "1",
  "Disposable database required",
);
const source =
  "<mjml><mj-body><mj-section><mj-column><mj-text>First aid campaign</mj-text></mj-column></mj-section></mj-body></mjml>";
test(
  "marketing drafts, consent, queue ownership and uncertain deliveries",
  { skip: !uri },
  async (t) => {
    assert.match(
      uri!,
      /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/,
    );
    const client = await new MongoClient(uri!).connect(),
      db = client.db("marketing_" + randomUUID().replaceAll("-", "")),
      actor = String(new ObjectId());
    const before = { ...process.env };
    Object.assign(process.env, {
      MARKETING_EMAIL_ENABLED: "true",
      EMAIL_PROVIDER: "resend",
      RESEND_MARKETING_API_KEY: "re_synthetic_only",
      EMAIL_MARKETING_DOMAIN: "news.example.invalid",
      EMAIL_REPLY_TO: "sales@example.invalid",
      EMAIL_PUBLIC_API_ORIGIN: "https://api.example.invalid",
      MARKETING_POSTAL_ADDRESS: "Synthetic workplace address",
      MARKETING_TEST_RECIPIENTS: "approved@example.invalid",
    });
    try {
      const id = randomUUID(),
        template = await saveMarketingTemplate(
          db,
          {
            id,
            revision: 0,
            name: "First aid",
            subject: "Workplace first aid",
            previewText: "Ready when needed",
            mjml: source,
          },
          actor,
        );
      assert.ok(template);
      await t.test(
        "stale edits fail and preview text is rendered",
        async () => {
          await assert.rejects(
            saveMarketingTemplate(
              db,
              { id, revision: 0, name: "Stale", subject: "Old", mjml: source },
              actor,
            ),
            { code: "IDEMPOTENCY_CONFLICT" },
          );
          assert.match(template.html, /Ready when needed/);
        },
      );
      await t.test(
        "imports reject future or absent consent and preserve suppressions",
        async () => {
          await assert.rejects(
            importMarketingContacts(
              db,
              [{ email: "missing@example.invalid" }],
              actor,
            ),
            { code: "INVALID_REQUEST" },
          );
          await db
            .collection<Document & { _id: string }>("email_suppressions")
            .insertOne({
              _id: emailHash("blocked@example.invalid"),
              marketingBlocked: true,
            });
          const result = await importMarketingContacts(
            db,
            ["reader@example.invalid", "blocked@example.invalid"].map(
              (email) => ({
                email,
                name: "Reader",
                list: "offices",
                consentSource: "Synthetic subscription form",
                consentAt: "2026-01-01T00:00:00Z",
              }),
            ),
            actor,
          );
          assert.deepEqual(result, { imported: 1, blocked: 1 });
        },
      );
      const input = {
        requestId: randomUUID(),
        templateId: id,
        expectedRevision: 1,
        provider: "resend",
        audience: "contacts",
        list: "offices",
        acknowledged: true,
      };
      await t.test(
        "queue replay never adds duplicate jobs and changing the receipt fails",
        async () => {
          const results = await Promise.all([
            queueMarketing(db, input, actor),
            queueMarketing(db, input, actor),
          ]);
          assert.equal(results[0]!.count, 1);
          assert.equal(
            await db.collection("marketing_jobs").countDocuments(),
            1,
          );
          await assert.rejects(
            queueMarketing(db, { ...input, list: "different" }, actor),
            { code: "IDEMPOTENCY_CONFLICT" },
          );
        },
      );
      let unsubscribe = "";
      await t.test(
        "sending is per-recipient with an immutable snapshot and unsubscribe footer",
        async () => {
          let attempts = 0;
          await processMarketingJob(db, async (_db, message) => {
            attempts++;
            assert.equal(message.to, "reader@example.invalid");
            assert.match(message.html, /Unsubscribe from marketing emails/);
            unsubscribe = message.unsubscribe;
            return randomUUID();
          });
          assert.equal(attempts, 1);
          await processMarketingJob(db, async () => {
            throw Error("Duplicate send");
          });
          assert.equal((await marketingReport(db))[0]!.states.accepted, 1);
        },
      );
      await t.test(
        "unsubscribes are immediate and cannot be overwritten by imports",
        async () => {
          const token = unsubscribe.split("/").at(-1)!;
          const app = express(),
            router = express.Router();
          installMarketingRoutes(
            router,
            async () => db,
            [],
            async () => {
              throw Error("Authenticated route unexpectedly called");
            },
          );
          app.use("/api/v1", router);
          const server = createServer(app);
          await new Promise<void>((resolve) =>
            server.listen(0, "127.0.0.1", resolve),
          );
          const address = server.address();
          assert.ok(address && typeof address !== "string");
          try {
            const url = `http://127.0.0.1:${address.port}/api/v1/marketing/unsubscribe/${token}`;
            const confirmation = await fetch(url);
            assert.equal(confirmation.status, 200);
            assert.match(
              await confirmation.text(),
              /Unsubscribe from marketing emails/,
            );
            assert.equal(
              (
                await db
                  .collection<Document & { _id: string }>("marketing_contacts")
                  .findOne({ _id: emailHash("reader@example.invalid") })
              )?.active,
              true,
            );
            const removed = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: "",
            });
            assert.equal(removed.status, 200);
            assert.match(
              removed.headers.get("content-security-policy") ?? "",
              /default-src 'none'/,
            );
          } finally {
            server.closeAllConnections();
            await new Promise<void>((resolve) => server.close(() => resolve()));
          }
          await unsubscribeMarketing(db, token);
          const result = await importMarketingContacts(
            db,
            [
              {
                email: "reader@example.invalid",
                name: "",
                list: "offices",
                consentSource: "Repeated import",
                consentAt: "2026-01-01T00:00:00Z",
              },
            ],
            actor,
          );
          assert.equal(result.blocked, 1);
          assert.ok(
            await db
              .collection<Document & { _id: string }>("email_suppressions")
              .findOne({ _id: emailHash("reader@example.invalid") }),
          );
        },
      );
      await t.test(
        "test recipients are allowlisted and ambiguous delivery is never retried",
        async () => {
          await assert.rejects(
            queueMarketing(
              db,
              {
                requestId: randomUUID(),
                templateId: id,
                expectedRevision: 1,
                provider: "resend",
                email: "unapproved@example.invalid",
              },
              actor,
              true,
            ),
            { code: "FORBIDDEN" },
          );
          await queueMarketing(
            db,
            {
              requestId: randomUUID(),
              templateId: id,
              expectedRevision: 1,
              provider: "outlook",
              email: "approved@example.invalid",
            },
            actor,
            true,
          ).then(
            () => assert.fail("Unconfigured Outlook"),
            (error) => assert.equal(error.code, "SERVICE_UNAVAILABLE"),
          );
          await queueMarketing(
            db,
            {
              requestId: randomUUID(),
              templateId: id,
              expectedRevision: 1,
              provider: "resend",
              email: "approved@example.invalid",
            },
            actor,
            true,
          );
          const marketingKey = process.env.RESEND_MARKETING_API_KEY;
          delete process.env.RESEND_MARKETING_API_KEY;
          try {
            let pausedAttempts = 0;
            assert.equal(
              await processMarketingJob(db, async () => {
                pausedAttempts++;
                return randomUUID();
              }),
              false,
            );
            assert.equal(pausedAttempts, 0);
            assert.equal(
              await db
                .collection("marketing_jobs")
                .countDocuments({ state: "queued" }),
              1,
            );
          } finally {
            if (marketingKey)
              process.env.RESEND_MARKETING_API_KEY = marketingKey;
          }
          let attempts = 0;
          await processMarketingJob(db, async () => {
            attempts++;
            throw Error("Connection lost after send");
          });
          await processMarketingJob(db, async () => {
            attempts++;
            return randomUUID();
          });
          assert.equal(attempts, 1);
          assert.equal(
            await db
              .collection("marketing_jobs")
              .countDocuments({ state: "uncertain" }),
            1,
          );
        },
      );
      await t.test(
        "revoked customer consent is checked at send time; budget exhaustion defers without resending",
        async () => {
          const email = "customer@example.invalid";
          await db.collection("customers").insertOne({
            email,
            emailHash: emailHash(email),
            marketingEmail: true,
          });
          await queueMarketing(
            db,
            { ...input, requestId: randomUUID(), audience: "customers" },
            actor,
          );
          await db
            .collection("customers")
            .updateOne({ email }, { $set: { marketingEmail: false } });
          await processMarketingJob(db, async () => {
            throw Error("Consent revoked");
          });
          assert.equal(
            await db
              .collection("marketing_jobs")
              .countDocuments({ state: "skipped" }),
            1,
          );
          await queueMarketing(
            db,
            {
              requestId: randomUUID(),
              templateId: id,
              expectedRevision: 1,
              provider: "resend",
              email: "approved@example.invalid",
            },
            actor,
            true,
          );
          await processMarketingJob(db, async () => {
            throw new EmailBudgetExceeded();
          });
          const job = await db
            .collection("marketing_jobs")
            .findOne({ state: "queued" });
          assert.ok(job?.nextAttemptAt > new Date());
        },
      );
      await t.test(
        "Outlook uses OAuth and MIME unsubscribe headers, and reports acceptance only",
        async () => {
          Object.assign(process.env, {
            MARKETING_OUTLOOK_MAILBOX: "sales@example.invalid",
            MARKETING_OUTLOOK_TENANT_ID: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            MARKETING_OUTLOOK_CLIENT_ID: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            MARKETING_OUTLOOK_CLIENT_SECRET: "synthetic-only-secret",
          });
          const previousFetch = globalThis.fetch;
          let calls = 0;
          globalThis.fetch = async (input, options) => {
            calls++;
            if (String(input).includes("/oauth2/"))
              return Response.json({ access_token: "synthetic-token" });
            assert.match(String(input), /graph.microsoft.com\/v1.0\/users\//);
            assert.equal(
              options?.headers && Reflect.get(options.headers, "Content-Type"),
              "text/plain",
            );
            const mime = Buffer.from(
              String(options?.body),
              "base64",
            ).toString();
            assert.match(
              mime,
              /List-Unsubscribe-Post: List-Unsubscribe=One-Click/,
            );
            assert.match(mime, /Content-Transfer-Encoding: base64/);
            return new Response(null, { status: 202 });
          };
          try {
            assert.equal(
              await deliverMarketing(db, {
                id: "synthetic-job",
                provider: "outlook",
                to: "approved@example.invalid",
                subject: "Synthetic newsletter",
                html: "<p>Hello</p>",
                unsubscribe: "https://api.example.invalid/unsubscribe/token",
              }),
              "outlook-accepted",
            );
            assert.equal(calls, 2);
          } finally {
            globalThis.fetch = previousFetch;
          }
        },
      );
      await t.test(
        "expired worker attempts become uncertain rather than being reclaimed",
        async () => {
          await db
            .collection<Document & { _id: string }>("marketing_jobs")
            .insertOne({
              _id: "interrupted",
              state: "sending",
              startedAt: new Date(Date.now() - 180000),
            });
          await processMarketingJob(db, async () => {
            throw Error("Do not retry");
          });
          assert.equal(
            (
              await db
                .collection<Document & { _id: string }>("marketing_jobs")
                .findOne({ _id: "interrupted" })
            )?.state,
            "uncertain",
          );
        },
      );
    } finally {
      for (const key of Object.keys(process.env))
        if (!(key in before)) delete process.env[key];
      Object.assign(process.env, before);
      await db.dropDatabase();
      await client.close();
    }
  },
);
