import { z } from 'zod';

/** Artwork other than product photos (marketing, banners, categories, WhatsApp posters) goes from the browser straight to
 *  storage with a server-signed ticket, so no image bytes pass through the web gateway or the API. */
export const artworkKinds = ['marketing', 'banner', 'category', 'poster'] as const;
export type ArtworkKind = typeof artworkKinds[number];
const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const uploadKey = z.uuid();
export const artworkSignSchema = z.object({ kind: z.enum(artworkKinds), uploadKey, count: z.number().int().min(1).max(2) }).strict()
  .refine(value => value.count === 1 || value.kind === 'banner', 'Only a banner takes a second (phone) image.');
export const artworkCommitSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('marketing'), uploadKey }).strict(),
  z.object({ kind: z.literal('banner'), uploadKey, count: z.number().int().min(1).max(2), name: z.string(), link: z.string(), locale: z.enum(['all', 'en', 'ar']).optional() }).strict(),
  z.object({ kind: z.literal('category'), uploadKey, categoryId: objectId.optional(), name: z.string().optional(), color: z.string().optional() }).strict(),
  z.object({ kind: z.literal('poster'), uploadKey }).strict(),
]);
export type ArtworkCommit = z.infer<typeof artworkCommitSchema>;
const publicId = z.string().regex(/^almina\/(?:products\/[a-f0-9-]{36}-0|banners\/[a-f0-9-]{36}-(?:desktop|mobile)|(?:categories|posters)\/[a-f0-9-]{36})$/);
/** Exactly the fields storage needs, each shape-checked, and nothing else (never the secret). */
export const artworkTicketSchema = z.object({
  cloudName: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), apiKey: z.string().regex(/^[0-9]{1,100}$/),
  uploads: z.array(z.object({ publicId, fields: z.object({ allowed_formats: z.enum(['webp', 'jpg']), overwrite: z.literal('false'), public_id: publicId,
    timestamp: z.string().regex(/^[0-9]{10}$/), type: z.literal('upload'), api_key: z.string().regex(/^[0-9]{1,100}$/), signature: z.string().regex(/^[a-f0-9]{64}$/) }).strict() }).strict()).min(1).max(2),
}).strict();
export type ArtworkTicket = z.infer<typeof artworkTicketSchema>;
export const artworkResultSchema = z.object({ image: z.string().max(1000) }).strict();
