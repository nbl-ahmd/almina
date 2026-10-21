import { HttpError } from '../../errors.js';
import { wholesalePriceSchema, type WholesalePrice } from '@almina/contracts';
import type { Document } from 'mongodb';
export function permittedWholesaleProduct(account: Document, type: Document, product: Document, category?: Document) {
    if (account.approval !== 'approved' || !(account.acceptedAt instanceof Date) || type.active !== true || account.typeId !== type._id)
        return false;
    if (product.disabled === true || product.active === false || product.published === false || product.archivedAt !== undefined || category?.disabled === true || category?.archivedAt !== undefined)
        return false;
    if (['disabled', 'active', 'published'].some(key => product[key] !== undefined && typeof product[key] !== 'boolean'))
        return false;
    // A business profile never bypasses the catalogue's publication/review decision.
    if (!['general', 'otc', 'prescription'].includes(product.productType) || product.contentReviewed !== true || (!type.allowMedicines && product.productType !== 'general'))
        return false;
    return account.scope === 'type' || (account.scope === 'assigned' && (account.productIds?.includes(String(product._id)) || account.categoryIds?.includes(String(product.category))));
}
export function wholesalePrice(terms: Document | undefined, typeId: string, quantity: number): WholesalePrice {
    if (terms?.enabled !== true || !Array.isArray(terms.prices))
        throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
    const parsed = wholesalePriceSchema.safeParse(terms.prices.find((price: Document) => price.typeId === typeId));
    if (!parsed.success)
        throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
    const price = parsed.data;
    if (!Number.isSafeInteger(quantity) || quantity < price.minimumQuantity || quantity > price.maximumQuantity || quantity % price.quantityMultiple !== 0)
        throw new HttpError(400, 'INVALID_REQUEST');
    return price;
}
export function decimalMinor(minor: number) { return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`; }
