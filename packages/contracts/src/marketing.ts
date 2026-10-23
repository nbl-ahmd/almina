import { z } from "zod";
export const marketingTemplateSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    name: z.string().trim().min(1).max(120),
    subject: z.string().trim().min(1).max(180),
    previewText: z.string().trim().max(200).default(""),
    mjml: z.string().min(20).max(120000),
  })
  .strict();
export const marketingContactSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.trim().toLowerCase()),
    name: z.string().trim().max(120).default(""),
    list: z.string().trim().min(1).max(60),
    consentSource: z.string().trim().min(5).max(300),
    consentAt: z.iso.datetime(),
  })
  .strict();
export const marketingSendSchema = z
  .object({
    requestId: z.string().uuid(),
    templateId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    provider: z.enum(["resend", "outlook"]),
    audience: z.enum(["customers", "contacts"]),
    list: z.string().trim().max(60).default(""),
    acknowledged: z.literal(true),
  })
  .strict();
export const marketingTestSchema = z
  .object({
    requestId: z.string().uuid(),
    templateId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    provider: z.enum(["resend", "outlook"]),
    email: z.email().max(254),
  })
  .strict();
