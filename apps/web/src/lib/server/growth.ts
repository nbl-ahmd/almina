import 'server-only';
import { cache } from 'react';
import { commercePolicySchema, growthPageSchema, homeLayoutAdminSchema, homeLayoutSchema, pharmacyProfileSchema, branchDirectorySchema, type GrowthPage } from '@almina/contracts';
import { z } from 'zod';
import { getWebEnvironment } from './env';
import type { ShippingPolicy } from '../policies';
async function read(path:string) {
  const response=await fetch(new URL('/api/v1/growth/'+path,getWebEnvironment().API_ORIGIN),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)});
  if(response.status===404)return null;
  if(!response.ok)throw new Error('Content service unavailable');
  return (await response.json() as {data:unknown}).data;
}
export const getPharmacyProfile=cache(async()=>pharmacyProfileSchema.parse(await read('profile')??{}));
export const getBranchDirectory=cache(async()=>{try{return branchDirectorySchema.parse(await read('branches')??{});}catch{return branchDirectorySchema.parse({});}});
export async function getGrowthPages(kind?:GrowthPage['kind'],locale='en',offset=0){const query=new URLSearchParams({merchandising:'1',locale,offset:String(offset),...(kind?{kind}:{})});return z.object({items:z.array(growthPageSchema),hasNext:z.boolean()}).parse(await read('pages?'+query)??{items:[],hasNext:false});}
export const getGrowthPage=cache(async(kind:GrowthPage['kind'],slug:string,locale='en')=>{const row=await read('page?'+new URLSearchParams({kind,slug,locale,merchandising:'1'}));return row?growthPageSchema.parse(row):null;});

// Live delivery policy used by /shipping and by Product JSON-LD. A missing or
// unavailable policy omits shippingDetails rather than publishing invented fees.
export const getShippingPolicy=cache(async():Promise<ShippingPolicy|null>=>{try{return commercePolicySchema.parse(await read('shipping'));}catch{return null;}});

export async function getProductReviews(productId:string){
 try{return z.object({items:z.array(z.object({rating:z.number().int().min(1).max(5),displayName:z.string(),title:z.string(),body:z.string(),createdAt:z.string(),verifiedPurchase:z.literal(true)})),ratingCount:z.number().int().nonnegative(),average:z.number().nullable()}).parse(await read('reviews?productId='+encodeURIComponent(productId)));}catch{return null;}
}

export async function getHomepageCampaigns(locale: 'en' | 'ar') { return z.array(growthPageSchema).max(24).parse(await read('campaigns?'+new URLSearchParams({locale}))??[]); }

/** Published homepage layout, or null for the built-in homepage (no layout, unpublished, invalid or service unavailable). */
export const getHomeLayout=cache(async(locale:'en'|'ar')=>{try{const row=await read('home-layout?'+new URLSearchParams({locale}));const parsed=row?homeLayoutSchema.safeParse(row):null;return parsed?.success?parsed.data:null;}catch{return null;}});

/** Staff preview of the saved (unpublished) homepage layout. Only an admin session can read it; anyone else gets null. */
export async function getHomeLayoutDraft(locale:'en'|'ar'){
 try{
  const {currentIdentity,sessionHeader}=await import('./admin/gateway');
  if((await currentIdentity())?.role!=='admin')return null;
  const response=await fetch(new URL('/api/v1/admin/growth/home-layout?'+new URLSearchParams({locale}),getWebEnvironment().API_ORIGIN),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000),headers:{cookie:await sessionHeader(),origin:getWebEnvironment().WEB_ORIGIN}});
  if(!response.ok)return null;
  const parsed=homeLayoutAdminSchema.safeParse((await response.json() as {data:unknown}).data);
  return parsed.success?parsed.data:null;
 }catch{return null;}
}

/** Every brand shoppers can see, or null when the service cannot say (the caller then uses the brands on the current catalogue page). */
export async function getCatalogueBrands(){try{return z.array(z.string().min(1)).max(2000).parse(await read('brands'));}catch{return null;}}

/** All published brand pages (the list endpoint returns 50 at a time). */
export async function getAllBrandPages(locale:'en'|'ar'){
 const pages:GrowthPage[]=[];
 for(let offset=0;offset<=1000;offset+=50){const result=await getGrowthPages('brand',locale,offset).catch(()=>null);if(!result)break;pages.push(...result.items);if(!result.hasNext)break;}
 return pages;
}
