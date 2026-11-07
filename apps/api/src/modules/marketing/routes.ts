import {
  retainedProductList,
  retainedCatalogQuery,
} from "../catalog/compatibility-reads.js";
import type { Router, Request, RequestHandler } from "express";
import express from "express";
import type { Db, Document } from "mongodb";
import type { Staff } from "@almina/contracts";
import { HttpError } from "../../errors.js";
import { verifyBrowserMutation } from "../auth/cookies.js";
import {
  saveMarketingTemplate,
  importMarketingContacts,
  queueMarketing,
  marketingReport,
  unsubscribeMarketing,
} from "./repository.js";
import { marketingConnections } from "./delivery.js";
import { customerMutationQuota } from "../growth/limits.js";
export function installMarketingRoutes(
  router: Router,
  getDb: () => Promise<Db>,
  origins: string[],
  identity: (req: Request, admin?: boolean) => Promise<Staff>,
) {
  const authenticated = identity;
  identity = async (req, admin) => { const user = await authenticated(req, admin); if (user.accountType === 'branch') throw new HttpError(403, 'FORBIDDEN'); return user; };
  const handler =
    (
      admin: boolean,
      write: boolean,
      run: (req: Request, db: Db, user: Staff) => Promise<unknown>,
    ): RequestHandler =>
    async (req, res) => {
      if (Object.keys(req.query).length)
        throw new HttpError(400, "INVALID_REQUEST");
      const user = await identity(req, admin);
      if (write) verifyBrowserMutation(req, origins);
      const db = await getDb();
      if (write) await customerMutationQuota(db, "marketing:" + user.id);
      res
        .set("Cache-Control", "private, no-store")
        .json({ data: await run(req, db, user) });
    };
  router.get("/admin/marketing/products", async (req, res) => {
    await identity(req);
    if (
      Object.keys(req.query).some((key) => key !== "q") ||
      typeof req.query.q !== "string" ||
      req.query.q.length < 2 ||
      req.query.q.length > 80
    )
      throw new HttpError(400, "INVALID_REQUEST");
    const rows = await retainedProductList(
      await getDb(),
      retainedCatalogQuery(
        { q: req.query.q, limit: "30", filter: "{}" },
        "search",
      ),
    );
    res
      .set("Cache-Control", "private, no-store")
      .json({
        data: rows.filter(
          (row) =>
            row.productType === "general" &&
            row.contentReviewed === true &&
            row.stock > 0,
        ),
      });
  });
  router.get(
    "/admin/marketing/status",
    handler(false, false, async () => marketingConnections()),
  );
  router.get(
    "/admin/marketing/templates",
    handler(false, false, async (_req, db) =>
      db
        .collection("marketing_templates")
        .find({}, { projection: { html: 0, actor: 0 }, maxTimeMS: 3000 })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray(),
    ),
  );
  router.get("/admin/marketing/template", async (req, res) => {
    await identity(req);
    if (
      Object.keys(req.query).length !== 1 ||
      typeof req.query.id !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(req.query.id)
    )
      throw new HttpError(400, "INVALID_REQUEST");
    const id = req.query.id;
    const row = await getDb().then((db) =>
      db
        .collection<Document & { _id: string }>("marketing_templates")
        .findOne({ _id: id }, { projection: { actor: 0 }, maxTimeMS: 3000 }),
    );
    if (!row) throw new HttpError(404, "NOT_FOUND");
    res.set("Cache-Control", "private, no-store").json({ data: row });
  });
  router.post(
    "/admin/marketing/templates",
    handler(false, true, (req, db, user) =>
      saveMarketingTemplate(db, req.body, user.id),
    ),
  );
  router.get(
    "/admin/marketing/contacts",
    handler(true, false, async (_req, db) =>
      db
        .collection("marketing_contacts")
        .find(
          {},
          {
            projection: {
              email: 1,
              name: 1,
              list: 1,
              active: 1,
              consentAt: 1,
              consentSource: 1,
            },
            maxTimeMS: 3000,
          },
        )
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray(),
    ),
  );
  router.post(
    "/admin/marketing/contacts",
    handler(true, true, (req, db, user) =>
      importMarketingContacts(db, req.body, user.id),
    ),
  );
  router.get(
    "/admin/marketing/campaigns",
    handler(false, false, async (_req, db) => marketingReport(db)),
  );
  router.post(
    "/admin/marketing/campaigns",
    handler(true, true, (req, db, user) =>
      queueMarketing(db, req.body, user.id),
    ),
  );
  router.post(
    "/admin/marketing/test",
    handler(false, true, (req, db, user) =>
      queueMarketing(db, req.body, user.id, true),
    ),
  );
  for (const name of [
    "status",
    "templates",
    "template",
    "contacts",
    "campaigns",
    "test",
  ])
    router.all("/admin/marketing/" + name, (_req, _res, next) =>
      next(new HttpError(405, "METHOD_NOT_ALLOWED")),
    );
  router.get("/marketing/unsubscribe/:token", (req, res) => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(String(req.params.token)))
      throw new HttpError(404, "NOT_FOUND");
    res
      .set({
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; form-action 'self'; frame-ancestors 'none'",
        "Referrer-Policy": "no-referrer",
      })
      .type("html")
      .send(
        '<!doctype html><html lang="en"><title>Unsubscribe · Al Mina Pharmacy</title><h1>Unsubscribe from marketing emails</h1><p>Your orders and sign-in emails will continue.</p><form method="post"><button>Unsubscribe</button></form></html>',
      );
  });
  router.post(
    "/marketing/unsubscribe/:token",
    express.urlencoded({ extended: false, limit: "1kb" }),
    async (req, res) => {
      await unsubscribeMarketing(await getDb(), String(req.params.token));
      res
        .set({
          "Cache-Control": "no-store",
          "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
          "Referrer-Policy": "no-referrer",
        })
        .type("html")
        .send(
          '<!doctype html><html lang="en"><title>Unsubscribed</title><h1>You are unsubscribed</h1><p>You will no longer receive Al Mina marketing emails. Your orders and sign-in emails are unaffected.</p></html>',
        );
    },
  );
}
