import 'server-only';
import { cache } from 'react';
import { growthPageSchema, pharmacyProfileSchema, branchDirectorySchema, type GrowthPage } from '@almina/contracts';
import { z } from 'zod';
import { getWebEnvironment } from './env';
async function read(path:string) {
  const response=await fetch(new URL('/api/v1/growth/'+path,getWebEnvironment().API_ORIGIN),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)});
  if(response.status===404)return null;
  if(!response.ok)throw new Error('Content service unavailable');
  return (await response.json() as {data:unknown}).data;
}
export const getPharmacyProfile=cache(async()=>pharmacyProfileSchema.parse(await read('profile')??{}));
export const getBranchDirectory=cache(async()=>{try{return branchDirectorySchema.parse(await read('branches')??{});}catch{return branchDirectorySchema.parse({});}});
export async function getGrowthPages(kind?:GrowthPage['kind'],locale='en',offset=0){const query=new URLSearchParams({locale,offset:String(offset),...(kind?{kind}:{})});return z.object({items:z.array(growthPageSchema),hasNext:z.boolean()}).parse(await read('pages?'+query)??{items:[],hasNext:false});}
export const getGrowthPage=cache(async(kind:GrowthPage['kind'],slug:string,locale='en')=>{const row=await read('page?'+new URLSearchParams({kind,slug,locale}));return row?growthPageSchema.parse(row):null;});

export async function getProductReviews(productId:string){
 try{return z.object({items:z.array(z.object({rating:z.number().int().min(1).max(5),displayName:z.string(),title:z.string(),body:z.string(),createdAt:z.string(),verifiedPurchase:z.literal(true)})),ratingCount:z.number().int().nonnegative(),average:z.number().nullable()}).parse(await read('reviews?productId='+encodeURIComponent(productId)));}catch{return null;}
}
