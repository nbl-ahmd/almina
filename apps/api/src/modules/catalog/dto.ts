import { productContentNames, productContentSchema } from '@almina/contracts';
import { familyFieldNames, familyProfile } from '@almina/contracts';
import type { Document } from 'mongodb';
import { productDtoSchema, categoryDtoSchema, bannerDtoSchema } from '@almina/contracts';

import { id, text, number } from '../dto-values.js';
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
export const productProjection = { ...Object.fromEntries([...familyFieldNames,...productContentNames,'catalogManaged','stockReviewedAt','websiteStockProposed'].map(key=>[key,1])), _id: 1, product_id: 1, name: 1, category: 1, cloudinaryImages: 1, images: 1, gdriveFileIds: 1,
  price: 1, stock: 1, vat: 1, sale: 1, featured: 1, disabled: 1, salePrice: 1, salePercent: 1, saleBadge: 1, saleType: 1, description: 1 };
export const categoryProjection = { _id: 1, name: 1, image: 1, gdriveFileId: 1, color: 1, disabled: 1 };
export const bannerProjection = { _id: 1, name: 1, image: 1, gdriveFileId: 1, link: 1 };

export function productDto(doc: Document) {
  return productDtoSchema.parse({ ...(familyProfile(doc)??{}), ...productContentSchema.parse(Object.fromEntries(productContentNames.filter(key=>doc[key]!==undefined).map(key=>[key,doc[key]]))), id: id(doc._id), productId: doc.product_id, categoryId: id(doc.category), name: doc.name,
    images: strings(doc.images), cloudinaryImages: strings(doc.cloudinaryImages), gdriveFileIds: strings(doc.gdriveFileIds), price: doc.price, stock: doc.stock,
    vat: doc.vat === true, sale: doc.sale === true, featured: doc.featured === true, disabled: doc.disabled === true,
    salePrice: number(doc.salePrice), salePercent: number(doc.salePercent), saleBadge: text(doc.saleBadge),
    saleType: text(doc.saleType), description: text(doc.description) });
}
export function categoryDto(doc: Document) {
  return categoryDtoSchema.parse({ id: id(doc._id), name: doc.name, image: text(doc.image), gdriveFileId: text(doc.gdriveFileId),
    color: text(doc.color), disabled: doc.disabled === true });
}
export function bannerDto(doc: Document) {
  return bannerDtoSchema.parse({ id: id(doc._id), name: doc.name, image: doc.image, gdriveFileId: text(doc.gdriveFileId), link: doc.link });
}
