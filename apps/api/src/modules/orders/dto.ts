import type { Document } from 'mongodb';
import { orderSummaryDtoSchema, orderDetailDtoSchema } from '@almina/contracts';
import { id, text, number } from '../dto-values.js';
export const orderSummaryProjection = { _id: 1, orderId: 1, createdAt: 1, dispatched: 1, canceled: 1,
  'customer.city': 1, 'customer.totalAmount': 1, billno: 1, billamount: 1 };
export const orderDetailProjection = { _id: 1, orderId: 1, createdAt: 1, dispatched: 1, canceled: 1,
  billno: 1, billamount: 1, cartItems: 1,
  ...Object.fromEntries(['name', 'mobile', 'email', 'emirate', 'city', 'buildingname', 'flatno', 'note', 'payment', 'address',
    'maplink', 'totalprice', 'totalSalePrice', 'totalVat', 'totalAmount', 'deliveryFee'].map(field => [`customer.${field}`, 1])) };

export function orderSummaryDto(doc: Document) {
  return orderSummaryDtoSchema.parse({ id: id(doc._id), orderId: doc.orderId,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    dispatched: doc.dispatched === true, canceled: doc.canceled === true,
    city: text(doc.customer?.city), totalAmount: number(doc.customer?.totalAmount), billno: text(doc.billno), billamount: number(doc.billamount) });
}
export function orderDetailDto(doc: Document) {
  const customer: Document = {};
  for (const field of ['name', 'mobile', 'email', 'emirate', 'city', 'buildingname', 'flatno', 'note', 'payment', 'address', 'maplink', 'totalprice']) {
    customer[field] = text(doc.customer?.[field]);
  }
  for (const field of ['totalSalePrice', 'totalVat', 'totalAmount', 'deliveryFee']) customer[field] = number(doc.customer?.[field]);
  return orderDetailDtoSchema.parse({ ...orderSummaryDto(doc), customer,
    items: Array.isArray(doc.cartItems) ? doc.cartItems.map((item: Document) => ({ productId: id(item._id), quantity: item.quantity })) : [],
    snapshotAvailable: false });
}
