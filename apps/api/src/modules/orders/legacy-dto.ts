import type { Document } from 'mongodb';
import { historicalStatus } from './status.js';

// Compatibility view for existing staff screens. New lines always come from immutable snapshots.
export function legacyOrderDto(order: Document): Document {
  const snapshotAvailable = order.schemaVersion === 2 && Array.isArray(order.lines);
  const cartItems = snapshotAvailable ? order.lines.map((line: Document) => ({ quantity: line.quantity, ...(line.variantLabel ? { variantLabel: line.variantLabel } : {}),
    _id: { _id: line.productId, product_id: line.sku, barcode: line.barcode, name: line.name,
      price: line.unitPriceMinor / 100, sale: line.salePriceMinor !== null,
      salePrice: line.salePriceMinor === null ? null : line.salePriceMinor / 100, category: { name: '' }, image: null },
    taxMinor: line.taxMinor, lineTotalMinor: line.lineTotalMinor,
  })) : (Array.isArray(order.cartItems) ? order.cartItems : []).map((item: Document) => ({ ...item,
    _id: item._id && typeof item._id.name === 'string' ? { ...item._id, category: item._id.category ?? { name: '' } } : {
      _id: item._id ?? null, name: 'Historical product unavailable', category: { name: '' }, price: null, salePrice: null, image: null,
    } }));
  const { statusHistory: _history, commerceMigration: _migration, ...view } = order;
  void _history; void _migration;
  return { ...view, status: historicalStatus(order), snapshotAvailable, cartItems };
}
