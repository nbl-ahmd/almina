import { z } from 'zod';
import { localLink } from './links';

/** Homepage layout managed in Website & growth → Homepage (Life Pharmacy / Aster style sections).
 *  One document per locale. Built-in sections (categories, shelves, brands…) are listed by key so staff can reorder or hide them;
 *  custom sections hold ids, links and artwork only, never names, prices or stock (those are read live at render). */
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const short = z.string().trim().max(80);
const artwork = z.union([z.literal(''), z.url().refine(value => value.startsWith('https://') && !new URL(value).username && !new URL(value).password)]);
const link = z.union([z.literal(''), localLink]);
export const homeBuiltinKeys = ['promo', 'hero', 'categories', 'strip-top', 'essentials', 'strip-middle', 'collections', 'offers', 'daily', 'routine', 'budget', 'strip-bottom', 'brands', 'campaigns', 'recent', 'help'] as const;
export const sectionBackgrounds = ['none', 'coral', 'green', 'blue', 'yellow', 'purple'] as const;
const image = z.object({ image: artwork, mobileImage: artwork.default(''), alt: short.default(''), href: link.default('') }).strict();
const common = {
  id, enabled: z.boolean().default(true),
  title: short.default(''), subtitle: z.string().trim().max(160).default(''),
  background: z.enum(sectionBackgrounds).default('none'), viewAllHref: link.default(''),
  // A thin banner shown above the section's heading (Aster "Top deals" strips). Optional.
  banner: image.nullable().default(null),
  startsAt: z.iso.datetime().nullable().default(null), endsAt: z.iso.datetime().nullable().default(null),
};
export const productSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('category'), categoryId: objectId }).strict(),
  z.object({ kind: z.literal('brand'), brand: z.string().trim().min(1).max(100) }).strict(),
  z.object({ kind: z.literal('offers') }).strict(),
  z.object({ kind: z.literal('selected'), productIds: z.array(objectId).min(1).max(40) }).strict(),
  // Combined filters: every condition given must match. Only filters the catalogue already supports.
  z.object({ kind: z.literal('filtered'), categoryId: objectId.optional(), brand: z.string().trim().min(1).max(100).optional(), offers: z.boolean().optional(),
    inStock: z.boolean().optional(), minPrice: z.number().min(0).max(100000).multipleOf(0.01).optional(), maxPrice: z.number().min(0).max(100000).multipleOf(0.01).optional(),
    sort: z.enum(['relevance', 'price-asc', 'price-desc', 'name']).optional() }).strict(),
]);
export const homeSectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('builtin'), key: z.enum(homeBuiltinKeys), id, enabled: z.boolean().default(true) }).strict(),
  z.object({ type: z.literal('products'), ...common, source: productSourceSchema, limit: z.number().int().min(4).max(24).default(12) }).strict(),
  z.object({ type: z.literal('categories'), ...common, categoryIds: z.array(objectId).min(1).max(24) }).strict(),
  z.object({ type: z.literal('brands'), ...common, brands: z.array(z.string().trim().min(1).max(100)).min(1).max(24) }).strict(),
  z.object({ type: z.literal('images'), ...common, tiles: z.array(image.extend({ image: artwork.refine(Boolean) })).min(1).max(8), columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(2), ratio: z.enum(['square', 'portrait', 'landscape']).default('square') }).strict(),
  z.object({ type: z.literal('carousel'), ...common, slides: z.array(image.extend({ image: artwork.refine(Boolean) })).min(1).max(10) }).strict(),
  z.object({ type: z.literal('strip'), ...common, strip: image.extend({ image: artwork.refine(Boolean) }) }).strict(),
]).superRefine((section, ctx) => {
  if (section.type === 'products' && section.source.kind === 'filtered') {
    const { categoryId, brand, offers, inStock, minPrice, maxPrice } = section.source;
    if (!categoryId && !brand && !offers && !inStock && minPrice === undefined && maxPrice === undefined) ctx.addIssue({ code: 'custom', path: ['source'], message: 'Choose at least one filter.' });
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) ctx.addIssue({ code: 'custom', path: ['source'], message: 'The minimum price is above the maximum.' });
  }
  if (section.type !== 'builtin' && section.startsAt && section.endsAt && section.startsAt >= section.endsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must follow start.' });
  if (section.type !== 'builtin' && section.type !== 'strip' && section.type !== 'carousel' && !section.title) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Give this section a title.' });
  const images = section.type === 'images' ? section.tiles : section.type === 'carousel' ? section.slides : section.type === 'strip' ? [section.strip] : [];
  if (images.some(item => item.image && !item.alt)) ctx.addIssue({ code: 'custom', path: ['alt'], message: 'Describe every image.' });
});
/** Each product row or category-card section adds catalogue reads to every homepage view, so their number is bounded. */
export const maxDataSections = 12;
const layoutShape = {
  locale: z.enum(['en', 'ar']), published: z.boolean().default(false), revision: z.number().int().nonnegative().default(0),
  sections: z.array(homeSectionSchema).max(30),
};
function checkLayout(layout: { sections: z.infer<typeof homeSectionSchema>[] }, ctx: z.RefinementCtx) {
  if (layout.sections.filter(section => section.type === 'products' || section.type === 'categories').length > maxDataSections) ctx.addIssue({ code: 'custom', path: ['sections'], message: `Use at most ${maxDataSections} product row and category card sections.` });
  const ids = layout.sections.map(section => section.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['sections'], message: 'Each section needs its own id.' });
  const keys = layout.sections.flatMap(section => section.type === 'builtin' ? [section.key] : []);
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', path: ['sections'], message: 'A built-in section can appear once.' });
}
/** What the storefront reads: one layout. */
export const homeLayoutSchema = z.object(layoutShape).strict().superRefine(checkLayout);
/** What the editor reads: the draft, whether something is live (`published`), and whether the draft differs from it. */
export const homeLayoutAdminSchema = z.object({ ...layoutShape, unpublishedChanges: z.boolean().default(false) }).strict().superRefine(checkLayout);
/** Saving the draft never changes the live homepage; publishing and unpublishing are explicit. */
export const homeLayoutSaveSchema = z.object({ ...layoutShape, unpublishedChanges: z.boolean().optional(), action: z.enum(['save', 'publish', 'unpublish']).default('save') }).strict().superRefine(checkLayout);
export type HomeLayout = z.infer<typeof homeLayoutSchema>;
export type HomeLayoutAdmin = z.infer<typeof homeLayoutAdminSchema>;
export type HomeSection = z.infer<typeof homeSectionSchema>;
export type HomeBuiltinKey = typeof homeBuiltinKeys[number];

/** Today's homepage order, used when nothing is published (and as the starting point in the editor). */
export function defaultHomeLayout(locale: 'en' | 'ar'): HomeLayout {
  return { locale, published: false, revision: 0, sections: homeBuiltinKeys.map(key => ({ type: 'builtin' as const, key, id: key, enabled: true })) };
}
/** Layouts saved before the main carousel and promo strip could be moved have no entry for them: they stay at the top, shown. */
export function withTopSections(sections: HomeSection[]): HomeSection[] {
  const missing = (['promo', 'hero'] as const).filter(key => !sections.some(section => section.type === 'builtin' && section.key === key));
  return [...missing.map(key => ({ type: 'builtin' as const, key, id: key, enabled: true })), ...sections];
}
/** A custom section is live when enabled and inside its schedule. */
export function sectionLive(section: HomeSection, now = Date.now()) {
  if (!section.enabled) return false;
  if (section.type === 'builtin') return true;
  return !(section.startsAt && Date.parse(section.startsAt) > now) && !(section.endsAt && Date.parse(section.endsAt) <= now);
}
