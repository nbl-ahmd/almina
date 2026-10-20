import { z } from 'zod';
const short = z.string().trim().max(200);
const text = z.string().trim().max(12000);
export const growthSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const growthKinds = ['brand','category','guide','campaign','collection'] as const;
export const localLink = z.string().max(250).refine(value => /^\/(?!\/)[a-zA-Z0-9/_?=&%-]*$/.test(value) && !value.startsWith('/api') && !value.startsWith('/admin'));
const safeImage = z.union([z.literal(''), z.url().refine(value => value.startsWith('https://') && !new URL(value).username && !new URL(value).password)]);
export const growthPageSchema = z.object({
  kind:z.enum(growthKinds),slug:growthSlug,locale:z.enum(['en','ar']).default('en'),
  title:short.min(3),description:z.string().trim().max(320),body:text.default(''),
  image:safeImage.default(''),imageAlt:short.default(''),
  productIds:z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(80).default([]),
  categories:z.array(z.object({label:short.min(1),href:localLink})).max(24).default([]),
  faqs:z.array(z.object({question:short.min(3),answer:z.string().trim().min(3).max(1500)})).max(15).default([]),
  published:z.boolean().default(false),healthContent:z.boolean().default(false),reviewer:short.default(''),
  startsAt:z.iso.datetime().nullable().default(null),endsAt:z.iso.datetime().nullable().default(null),
  // A curated bundle is a genuine, staff-chosen complementary set. No discount is implied.
  bundle:z.boolean().default(false),bundleReason:z.string().trim().max(600).default(''),
  terms:z.string().trim().max(3000).default(''),revision:z.number().int().nonnegative().default(0),
}).strict().superRefine((page,ctx)=>{
  if(page.startsAt&&page.endsAt&&page.startsAt>=page.endsAt)ctx.addIssue({code:'custom',path:['endsAt'],message:'End must follow start.'});
  if(page.published&&(!page.description||!page.body))ctx.addIssue({code:'custom',path:['body'],message:'Published pages need useful original content and a description.'});
  if(page.published&&page.healthContent&&!page.reviewer)ctx.addIssue({code:'custom',path:['reviewer'],message:'Health content needs a named pharmacy reviewer.'});
  if(page.bundle&&page.kind!=='collection')ctx.addIssue({code:'custom',path:['bundle'],message:'Only a curated collection can be a complementary bundle.'});
  if(page.bundle&&page.productIds.length<2)ctx.addIssue({code:'custom',path:['productIds'],message:'A curated bundle needs at least two chosen products.'});
  if(page.bundle&&page.bundleReason.trim().length<20)ctx.addIssue({code:'custom',path:['bundleReason'],message:'Explain in your own words why these products belong together.'});
});
export type GrowthPage=z.infer<typeof growthPageSchema>;
export const pharmacyProfileSchema=z.object({
  address:short.default(''),openingHours:short.default(''),licence:short.default(''),
  whatsapp:z.string().regex(/^[0-9]{9,15}$/).or(z.literal('')).default(''),
  mapUrl:z.url().refine(value=>value.startsWith('https://www.google.com/maps')||value.startsWith('https://maps.google.com/')).or(z.literal('')).default(''),
  googleReviewUrl:z.url().refine(value=>value.startsWith('https://g.page/')||value.startsWith('https://search.google.com/local/writereview?')).or(z.literal('')).default(''),
  deliveryAreas:z.array(z.object({name:short.min(2),eta:short.default('')})).max(50).default([]),
  deliveryNote:z.string().trim().max(1000).default(''),verified:z.boolean().default(false),revision:z.number().int().nonnegative().default(0),
}).strict();
export type PharmacyProfile=z.infer<typeof pharmacyProfileSchema>;
export function campaignState(page:Pick<GrowthPage,'startsAt'|'endsAt'>,now=Date.now()) {
  return page.endsAt&&Date.parse(page.endsAt)<=now?'ended':page.startsAt&&Date.parse(page.startsAt)>now?'upcoming':'active';
}
export function growthPagePath(page:Pick<GrowthPage,'kind'|'slug'|'locale'>) {
  const prefix=page.locale==='ar'?'/ar':'';
  return `${prefix}/${{brand:'brands',category:'shop',guide:'health-guides',campaign:'offers',collection:'routines'}[page.kind]}/${page.slug}`;
}

// Points buy fixed-value vouchers. No reward is active until staff publish complete rules.
export const rewardsPolicySchema=z.object({
 enabled:z.boolean().default(false),revision:z.number().int().nonnegative().default(0),
 pointsPerAed:z.number().int().min(1).max(100).default(1),
 pointsPerVoucher:z.number().int().min(1).max(1000000).default(500),
 voucherValueMinor:z.number().int().min(100).max(100000).default(1000),
 voucherDays:z.number().int().min(1).max(365).default(30),
 minimumSpendMinor:z.number().int().nonnegative().max(1000000).default(5000),
 eligibleCategoryIds:z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(100).default([]),
 referrerPoints:z.number().int().nonnegative().max(10000).default(0),
 welcomePoints:z.number().int().nonnegative().max(10000).default(0),
 terms:z.string().trim().max(6000).default(''),
}).strict().superRefine((value,ctx)=>{if(value.enabled&&(!value.terms||!value.eligibleCategoryIds.length))ctx.addIssue({code:'custom',message:'Add programme terms and eligible categories before enabling rewards.'});});
export type RewardsPolicy=z.infer<typeof rewardsPolicySchema>;
