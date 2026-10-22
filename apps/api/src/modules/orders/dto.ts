import type { Document } from 'mongodb';
import { wholesaleBusinessFields, orderSummaryDtoSchema, orderDetailDtoSchema } from '@almina/contracts';
import { historicalStatus } from './status.js';
import { id, text, number } from '../dto-values.js';
export const orderSummaryProjection = { channel:1,'wholesale.businessName':1,'wholesale.typeId':1, _id: 1, orderId: 1, status: 1, schemaVersion: 1, 'totals.totalMinor': 1, createdAt: 1, dispatched: 1, canceled: 1,
  'customer.city': 1, 'customer.totalAmount': 1, billno: 1, billamount: 1 };
export const orderDetailProjection = { ...Object.fromEntries(Object.keys(wholesaleBusinessFields).map(key=>['wholesale.'+key,1])), channel:1,'wholesale.businessName':1,'wholesale.typeId':1, _id: 1, orderId: 1, status: 1, schemaVersion: 1, totals: 1, createdAt: 1, dispatched: 1, canceled: 1,
  billno: 1, billamount: 1, cartItems: 1, lines: 1,
  ...Object.fromEntries(['name', 'mobile', 'email', 'emirate', 'city', 'buildingname', 'flatno', 'note', 'payment', 'address',
    'maplink', 'totalprice', 'totalSalePrice', 'totalVat', 'totalAmount', 'deliveryFee'].map(field => [`customer.${field}`, 1])) };

export function orderSummaryDto(doc: Document) {
  const totalMinor = number(doc.totals?.totalMinor);
  const totalAmount = doc.schemaVersion === 2 ? totalMinor === null ? null : totalMinor / 100 : number(doc.customer?.totalAmount);
  return orderSummaryDtoSchema.parse({ ...(doc.channel==='wholesale'?{channel:'wholesale',wholesale:{businessName:doc.wholesale?.businessName,typeId:doc.wholesale?.typeId}}:{}), id: id(doc._id), orderId: doc.orderId, status: historicalStatus(doc),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    dispatched: doc.dispatched === true, canceled: doc.canceled === true,
    city: text(doc.customer?.city), totalAmount, billno: text(doc.billno), billamount: number(doc.billamount) });
}
export function orderDetailDto(doc: Document) {
  const customer: Document = {};
  for (const field of ['name', 'mobile', 'email', 'emirate', 'city', 'buildingname', 'flatno', 'note', 'payment', 'address', 'maplink', 'totalprice']) {
    customer[field] = text(doc.customer?.[field]);
  }
  for (const field of ['totalSalePrice', 'totalVat', 'totalAmount', 'deliveryFee']) customer[field] = number(doc.customer?.[field]);
  return orderDetailDtoSchema.parse({ ...orderSummaryDto(doc), ...(doc.channel==='wholesale'?{wholesale:{businessName:doc.wholesale?.businessName,typeId:doc.wholesale?.typeId,...Object.fromEntries(Object.keys(wholesaleBusinessFields).map(key=>[key,doc.wholesale?.[key]]))}}:{}), customer,
    items: Array.isArray(doc.cartItems) ? doc.cartItems.map((item: Document) => ({ productId: /^[a-f0-9]{24}$/i.test(String(item._id)) ? String(item._id) : null, quantity: number(item.quantity) })) : [],
    snapshotAvailable: doc.schemaVersion === 2 && Array.isArray(doc.lines),
    lines: doc.schemaVersion === 2 ? doc.lines ?? null : null, totals: doc.schemaVersion === 2 ? doc.totals ?? null : null });
}
