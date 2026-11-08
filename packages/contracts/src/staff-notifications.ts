import { z } from "zod";
export const staffAlertKind = z.enum([
  "order",
  "low-stock",
  "out-of-stock",
  "payment",
  "test",
]);
export const staffAlertSchema = z
  .object({
    id: z.string().max(200),
    kind: staffAlertKind,
    title: z.string().max(120),
    description: z.string().max(300),
    href: z.string().startsWith("/admin/").max(200),
    createdAt: z.iso.datetime(),
    resolved: z.boolean(),
    read: z.boolean(),
    announce: z.boolean().default(true),
  })
  .strict();
export const staffAlertFeedSchema = z
  .object({
    items: z.array(staffAlertSchema).max(25),
    nextCursor: z.string().max(200).nullable(),
    unread: z.number().int().nonnegative(),
    hasMoreUnread: z.boolean(),
    observedAt: z.iso.datetime(),
  })
  .strict();
export const staffAlertQuerySchema = z
  .object({
    before: z
      .string()
      .regex(/^[a-f0-9]{24}$/i)
      .optional(),
    filter: z.enum(["all", "unread"]).default("all"),
  })
  .strict();
export const staffAlertActionSchema = z
  .object({
    ids: z.array(z.string().min(1).max(200)).min(1).max(25),
    read: z.boolean().default(true),
  })
  .strict();
export const staffAlertPreferencesSchema = z
  .object({
    pushOrders: z.boolean().default(true),
    pushStock: z.boolean().default(true),
    pushPayment: z.boolean().default(true),
  })
  .strict();
export const staffAlertRulesSchema = z
  .object({
    lowStockThreshold: z.number().int().min(0).max(1000),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export type StaffAlert = z.infer<typeof staffAlertSchema>;
