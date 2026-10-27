// Merchant API product-input mapping for the reviewed Google feed rows.
// Kept separate from the web runtime so the preparation tooling can reuse the
// exact feed output without importing server-only catalogue code.

export type MerchantFeedRow = Record<string, string>;

export type MerchantProductInput = {
  contentLanguage: 'en';
  feedLabel: string;
  offerId: string;
  productAttributes: {
    title: string;
    description: string;
    link: string;
    imageLink: string;
    additionalImageLinks?: string[];
    availability: 'IN_STOCK' | 'OUT_OF_STOCK';
    condition: 'NEW' | 'USED' | 'REFURBISHED';
    price: { amountMicros: string; currencyCode: 'AED' };
    brand?: string;
    gtins?: string[];
    mpn?: string;
    identifierExists?: false;
    googleProductCategory?: string;
    productTypes?: string[];
    itemGroupId?: string;
    size?: string;
  };
};

const conditions = { new: 'NEW', used: 'USED', refurbished: 'REFURBISHED' } as const;

function amountMicros(price: string) {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))? AED$/.exec(price);
  if (!match) throw new Error('Invalid AED feed price');
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return String(minor * 10_000);
}

/**
 * Converts one feed row into the REST body accepted by
 * `productInputs.insert`. The feed row has already passed publication,
 * image, identifier and channel-approval checks; this function only maps
 * those reviewed values and rejects malformed money or condition values.
 */
export function merchantProductInput(row: MerchantFeedRow, feedLabel = 'AE'): MerchantProductInput {
  if (!row.id || !row.title || !row.description || !row.link || !row.image_link || !row.price) {
    throw new Error('Incomplete feed row');
  }
  const condition = conditions[row.condition as keyof typeof conditions];
  if (!condition) throw new Error('Unsupported feed condition');
  if (row.availability !== 'in_stock' && row.availability !== 'out_of_stock') {
    throw new Error('Unsupported feed availability');
  }
  const additional = row.additional_image_link?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
  return {
    contentLanguage: 'en',
    feedLabel,
    offerId: row.id,
    productAttributes: {
      title: row.title,
      description: row.description,
      link: row.link,
      imageLink: row.image_link,
      ...(additional.length ? { additionalImageLinks: additional } : {}),
      availability: row.availability === 'in_stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
      condition,
      price: { amountMicros: amountMicros(row.price), currencyCode: 'AED' },
      ...(row.brand ? { brand: row.brand } : {}),
      ...(row.gtin ? { gtins: [row.gtin] } : {}),
      ...(row.mpn ? { mpn: row.mpn } : {}),
      ...(row.identifier_exists === 'no' ? { identifierExists: false as const } : {}),
      ...(row.google_product_category ? { googleProductCategory: row.google_product_category } : {}),
      ...(row.product_type ? { productTypes: [row.product_type] } : {}),
      ...(row.item_group_id ? { itemGroupId: row.item_group_id } : {}),
      ...(row.size ? { size: row.size } : {}),
    },
  };
}
