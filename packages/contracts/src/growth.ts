import { cloudinaryImage } from './media';
import { z } from 'zod';
import { localLink } from './links';
import { homeSectionSchema, maxDataSections } from './home-layout';
const short = z.string().trim().max(200);
const text = z.string().trim().max(12000);
export const growthSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const growthKinds = ['brand','category','guide','campaign','collection','page'] as const;
export { localLink };
const safeImage = z.union([z.literal(''), z.url().refine(value => value.startsWith('https://') && !new URL(value).username && !new URL(value).password)]);
export const growthPageSchema = z.object({
  kind:z.enum(growthKinds),slug:growthSlug,locale:z.enum(['en','ar']).default('en'),
  title:short.min(3),description:z.string().trim().max(320),body:text.default(''),
  image:safeImage.default(''),imageAlt:short.default(''),
  mobileImage:safeImage.default(''),
  // hero: main carousel · secondary: paired campaign cards · strip: thin wide section banner · popup: storefront offer/info modal.
  homepagePlacement:z.enum(['none','hero','secondary','strip','popup']).default('none'),
  // Hero artwork: 'image' is a finished banner (the whole slide links); 'overlay' adds the title, text and button on the start side,
  // over a safe zone the designer leaves empty. Existing campaigns default to 'image' so no text is drawn over finished artwork.
  heroLayout:z.enum(['image','overlay']).default('image'),textTone:z.enum(['dark','light']).default('dark'),
  ctaHref:z.union([z.literal(''),localLink]).default(''),
  stripSlot:z.enum(['home-promo','home-top','home-middle','home-bottom','listing']).default('home-middle'),
  // Popup: 'card' is artwork above a title and message; 'image' is a designed 3:4 poster (Life Pharmacy) with one button under it.
  popupLayout:z.enum(['card','image']).default('card'),
  priority:z.number().int().min(0).max(100).default(0),
  ctaLabel:z.string().trim().max(60).default(''),
  productIds:z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(80).default([]),
  categories:z.array(z.object({label:short.min(1),href:localLink})).max(24).default([]),
  faqs:z.array(z.object({question:short.min(3),answer:z.string().trim().min(3).max(1500)})).max(15).default([]),
  published:z.boolean().default(false),healthContent:z.boolean().default(false),reviewer:short.default(''),
  startsAt:z.iso.datetime().nullable().default(null),endsAt:z.iso.datetime().nullable().default(null),
  // A curated bundle is a genuine, staff-chosen complementary set. No discount is implied.
  bundle:z.boolean().default(false),bundleReason:z.string().trim().max(600).default(''),
  terms:z.string().trim().max(3000).default(''),revision:z.number().int().nonnegative().default(0),
  // Staff-built pages (kind 'page', at /pages/<slug>): the same sections the homepage builder offers.
  sections:z.array(homeSectionSchema).max(20).default([]),
}).strict().superRefine((page,ctx)=>{
  if(page.sections.length){
    if(page.kind!=='page')ctx.addIssue({code:'custom',path:['sections'],message:'Only a custom page can hold sections.'});
    if(page.sections.some(section=>section.type==='builtin'))ctx.addIssue({code:'custom',path:['sections'],message:'Built-in homepage sections cannot be placed on a custom page.'});
    if(new Set(page.sections.map(section=>section.id)).size!==page.sections.length)ctx.addIssue({code:'custom',path:['sections'],message:'Each section needs its own id.'});
    if(page.sections.filter(section=>section.type==='products'||section.type==='categories').length>maxDataSections)ctx.addIssue({code:'custom',path:['sections'],message:`Use at most ${maxDataSections} product row and category card sections.`});
  }
  if(page.homepagePlacement!=='none'){
    if(page.productIds.length>40)ctx.addIssue({code:'custom',path:['productIds'],message:'Homepage campaigns support up to 40 pinned products.'});
    if(page.kind!=='campaign')ctx.addIssue({code:'custom',path:['homepagePlacement'],message:'Only campaigns can appear in homepage campaign positions.'});
    if(new Set(page.productIds).size!==page.productIds.length)ctx.addIssue({code:'custom',path:['productIds'],message:'Choose each campaign product once.'});
    if(page.published&&page.homepagePlacement==='popup'){
      if(!page.description&&!page.image)ctx.addIssue({code:'custom',path:['description'],message:'A popup needs a message or artwork.'});
      if(page.image&&!page.imageAlt)ctx.addIssue({code:'custom',path:['imageAlt'],message:'Describe the popup artwork.'});
      if(page.popupLayout==='image'&&!page.image)ctx.addIssue({code:'custom',path:['image'],message:'An image popup needs its poster artwork.'});
    }else if(page.published){
      const needsButton=page.homepagePlacement==='secondary'||(page.homepagePlacement==='hero'&&page.heroLayout==='overlay');
      if(!page.image||!page.imageAlt||!page.terms||(needsButton&&!page.ctaLabel))ctx.addIssue({code:'custom',path:['image'],message:needsButton?'Homepage campaigns need desktop artwork, image description, button text and offer terms before publishing.':'Banners need artwork, an image description and offer terms before publishing.'});
    }
  }
  if(page.startsAt&&page.endsAt&&page.startsAt>=page.endsAt)ctx.addIssue({code:'custom',path:['endsAt'],message:'End must follow start.'});
  if(page.published&&(!page.description||(!page.body&&!(page.kind==='page'&&page.sections.length))))ctx.addIssue({code:'custom',path:['body'],message:'Published pages need useful original content and a description.'});
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
  return `${prefix}/${{brand:'brands',category:'shop',guide:'health-guides',campaign:'offers',collection:'routines',page:'pages'}[page.kind]}/${page.slug}`;
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

export const campaignWarningSchema=z.object({
  code:z.enum(['missing-artwork','unapproved-artwork','missing-mobile-artwork','missing-alt','missing-cta','missing-terms','expired','upcoming','no-products','product-unavailable','out-of-stock','missing-photo']),
  message:z.string(),productId:z.string().optional(),
});
export const campaignReviewSchema=z.object({warnings:z.array(campaignWarningSchema).max(250),checkedAt:z.iso.datetime()});
export type CampaignReview=z.infer<typeof campaignReviewSchema>;

/** Same render/save policy for staff preview and both campaign artwork sizes. */
export function campaignImageUrl(value: string, cloudName?: string): string | null {
  const cloudinary=cloudinaryImage(value,cloudName);if(cloudinary)return cloudinary;
  if(value.length>1000)return null;
  try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='cdn.alminapharmacy.com'&&!url.port&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/cdn\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|avif)$/.test(url.pathname)?url.href:null;}catch{return null;}
}

// Existing strict v1 clients must not receive fields they do not understand.
export const legacyGrowthPageSchema=growthPageSchema.transform(page=>{
 const {mobileImage,homepagePlacement,priority,ctaLabel,heroLayout,textTone,ctaHref,stripSlot,popupLayout,sections,...legacy}=page;
 void [mobileImage,homepagePlacement,priority,ctaLabel,heroLayout,textTone,ctaHref,stripSlot,popupLayout,sections];return legacy;
});
