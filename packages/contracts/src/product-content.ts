import { z } from 'zod';
const text = (max: number) => z.string().trim().max(max).optional();
const choice = <T extends readonly [string, ...string[]]>(values:T) => z.preprocess(value=>value===''?undefined:value,z.enum(values).optional());
const flag = z.union([z.boolean(),z.enum(['true','false']).transform(value=>value==='true')]).optional();
export function validGtin(value:string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits=[...value].map(Number),check=digits.pop()!;
  return (10-digits.reverse().reduce((sum,digit,index)=>sum+digit*(index%2===0?3:1),0)%10)%10===check;
}
export const productAudienceFields = {
  audience: z.enum(['all', 'retail', 'wholesale']).optional(),
  wholesaleAudience: z.enum(['all', 'selected']).optional(),
  wholesaleTypeIds: z.preprocess(value => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  }, z.array(z.string().regex(/^[a-z][a-z0-9-]{1,39}$/)).max(50).refine(ids => new Set(ids).size === ids.length).optional()),
};
export function visibleToRetail(product: Record<string, unknown>): boolean {
  return product.audience === undefined || product.audience === 'all' || product.audience === 'retail';
}
export function visibleToWholesale(product: Record<string, unknown>, typeId: string): boolean {
  if (product.audience !== undefined && product.audience !== 'all' && product.audience !== 'wholesale') return false;
  if (product.wholesaleAudience === undefined || product.wholesaleAudience === 'all') return true;
  return product.wholesaleAudience === 'selected' && Array.isArray(product.wholesaleTypeIds) && product.wholesaleTypeIds.includes(typeId);
}
export const productContentFields = {
  ...productAudienceFields,
  brand:text(100), manufacturer:text(150), gtin:z.string().trim().refine(value=>!value||validGtin(value),'Use a valid GTIN check digit; leave unknown identifiers blank.').optional(),mpn:text(70),
  identifierStatus:choice(['unknown','assigned','not-assigned'] as const), saleUnit:text(100),packLabel:text(150),productForm:text(120),strength:text(120),
  summary:text(300), ingredients:text(3000),usage:text(3000),warnings:text(3000),storage:text(1000),
  seoTitle:text(150),seoDescription:text(320), productType:choice(['unreviewed','general','otc','prescription'] as const),
  condition:choice(['new','used','refurbished'] as const), googleProductCategory:text(150),
  imageSource:z.union([z.literal(''),z.url().refine(value=>value.startsWith('https://')&&!new URL(value).username&&!new URL(value).password)]).optional(),
  imageRights:choice(['unreviewed','authorized'] as const), contentReviewed:flag,stockVerified:flag, googleApproved:flag,metaApproved:flag,
};
export const productContentNames=Object.keys(productContentFields) as (keyof typeof productContentFields)[];
export const productContentSchema=z.object(productContentFields).strict();
export type ProductContent=z.infer<typeof productContentSchema>;
// Conservative ERP identity flags, not a medicine or prescription classifier.
export const incompleteProductNamePattern = /^(?:\s*(?:[.*]{2,}|…)|\s*[a-z]\s*$)/i;
export function hasProductPhoto(product:Record<string,unknown>):boolean {
  return [product.image,...(Array.isArray(product.images)?product.images:[]),...(Array.isArray(product.cloudinaryImages)?product.cloudinaryImages:[])].some(value=>typeof value==='string'&&value.trim().length>0&&!/^\/?product-placeholder\.svg$/.test(value.trim()));
}
export function publicationIssues(product:Record<string,unknown>):string[] {
  const issues:string[]=[];
  if(typeof product.name!=='string'||!product.name.trim()||incompleteProductNamePattern.test(product.name))issues.push('Complete product name / identity');
  if(!product.brand&&!product.familyBrand)issues.push('Brand');
  if(!product.saleUnit)issues.push('Saleable unit');
  if(!product.packLabel)issues.push('Pack / specification');
  if(!product.description)issues.push('Description');
  if(!['general','otc'].includes(String(product.productType)))issues.push('Product classification (prescription requires a separate dispensing workflow)');
  if(product.contentReviewed!==true)issues.push('Content review');
  if(product.stockVerified!==true)issues.push('Physical stock review');
  if(product.imageRights!=='authorized')issues.push('Image usage permission');
  if(!hasProductPhoto(product))issues.push('Product image');
  return issues;
}
// Selling in the store needs only an identifiable product that may legally be listed online: a complete name and a general or
// pharmacy-medicine (OTC) type. Prescription items are never sold online. Content, stock and image-rights review stamps are not
// required: the editor and the visibility toggle record them when a product goes live. Advertising feeds keep the strict
// publicationIssues() list (brand, description, pack size, real photo).
export function storePublicationIssues(product:Record<string,unknown>):string[] {
  const issues:string[]=[];
  if(typeof product.name!=='string'||!product.name.trim()||incompleteProductNamePattern.test(product.name))issues.push('Complete product name / identity');
  if(!['general','otc'].includes(String(product.productType)))issues.push('Product classification (prescription requires a separate dispensing workflow)');
  return issues;
}
