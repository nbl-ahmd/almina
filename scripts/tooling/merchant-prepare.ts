import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readProduct, type Product } from '../../apps/web/src/lib/catalog/model';
import { feedIssues, feedProduct } from '../../apps/web/src/lib/catalog/feed';
import { cloudinaryImage } from '../../apps/web/src/lib/catalog/media';
import { merchantProductInput } from '../../apps/web/src/lib/catalog/merchant-api';

// Read-only preparation for the Google Merchant API. This script never writes
// to the catalogue or to Google. It applies the same publication, image,
// identifier and channel-approval checks as /feeds/google.xml and produces a
// review package that can be completed by pharmacy staff before a live sync.

const sourceOrigin = process.env.MERCHANT_PREP_API_ORIGIN ?? 'https://almina-of4b.onrender.com';
const outputDir = process.env.MERCHANT_PREP_OUTPUT ?? join('outputs', `merchant-preparation-${new Date().toISOString().slice(0, 10)}`);
const feedLabel = process.env.MERCHANT_PREP_FEED_LABEL ?? 'AE';
const pageSize = 100;
const maxProducts = 20_000;

function checkedOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('MERCHANT_PREP_API_ORIGIN must be a credential-free HTTPS origin.');
  }
  return url.origin;
}

const origin = checkedOrigin(sourceOrigin);

async function readPage(offset: number): Promise<unknown[]> {
  const url = new URL('/api/products', origin);
  url.search = new URLSearchParams({ disabledCat: 'false', groupFamilies: 'true', limit: String(pageSize), offset: String(offset) }).toString();
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Catalogue read failed with HTTP ${response.status}.`);
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error('Catalogue read returned an unexpected shape.');
  return value;
}

function detectedCloudName(products: Product[]) {
  const names = new Set<string>();
  for (const product of products) for (const value of product.cloudinaryImages ?? []) {
    const match = /^https:\/\/res\.cloudinary\.com\/([A-Za-z0-9_-]+)\/image\/upload\//.exec(value);
    if (match?.[1]) names.add(match[1]);
  }
  if (names.size > 1) throw new Error('Catalogue images use more than one Cloudinary account.');
  return [...names][0];
}

function safeFileName(value: string | undefined) {
  return value && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : null;
}

function productImages(product: Product, cloudName: string | undefined) {
  const cloudinary = (product.cloudinaryImages ?? []).flatMap(value => {
    const image = cloudinaryImage(value, cloudName);
    return image ? [image] : [];
  });
  const legacy = (product.images ?? []).flatMap(value => {
    const name = safeFileName(value);
    return name ? [`${origin}/api/products/images/${name}`] : [];
  });
  const cdn = safeFileName(product.image);
  const primary = cloudinary[0] ?? (cdn ? `https://cdn.alminapharmacy.com/cdn/products/${cdn}` : null) ?? legacy[0] ?? '/product-placeholder.svg';
  return [...new Set([primary, ...cloudinary, ...legacy])];
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

async function main() {
  const rawProducts: unknown[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await readPage(offset);
    rawProducts.push(...page);
    if (page.length < pageSize) break;
    if (rawProducts.length >= maxProducts) throw new Error('Catalogue exceeds the preparation bound.');
  }

  const products = rawProducts.flatMap(value => {
    const product = readProduct(value);
    return product ? [product] : [];
  });
  const invalidProducts = rawProducts.length - products.length;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? detectedCloudName(products);

  const rows = products.map(product => {
    const images = productImages(product, cloudName);
    const feedImages = images.filter(image => !image.startsWith('/'));
    const blockers = feedIssues(product, 'google', feedImages);
    const feedRow = feedProduct(product, feedImages, 'google');
    return {
      product,
      images: feedImages,
      blockers,
      feedRow,
      closeToReady: blockers.length > 0 && blockers.every(issue => ['Condition review', 'Channel approval', 'Manufacturer identifier review'].includes(issue)),
    };
  });

  const ready = rows.filter(row => row.feedRow !== null);
  const close = rows.filter(row => row.closeToReady);
  const blockerCounts = new Map<string, number>();
  for (const row of rows) for (const blocker of row.blockers) blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);

  const inputs = ready.flatMap(row => {
    try {
      return [merchantProductInput(row.feedRow!, feedLabel)];
    } catch {
      return [];
    }
  });

  const reviewHeader = [
    'product_id', 'name', 'product_type', 'brand', 'condition', 'identifier_status', 'gtin', 'mpn',
    'image_rights', 'google_approved', 'https_images', 'blockers', 'close_to_ready', 'ready',
  ];
  const reviewRows = [...rows].sort((a, b) => a.blockers.length - b.blockers.length || a.product.product_id.localeCompare(b.product.product_id));
  const reviewCsv = [
    reviewHeader.join(','),
    ...reviewRows.map(row => [
      row.product.product_id, row.product.name, row.product.productType, row.product.brand ?? row.product.familyBrand,
      row.product.condition, row.product.identifierStatus, row.product.gtin, row.product.mpn,
      row.product.imageRights, row.product.googleApproved === true ? 'true' : 'false', row.images.length,
      row.blockers.join('; '), row.closeToReady ? 'true' : 'false', row.feedRow ? 'true' : 'false',
    ].map(csvCell).join(',')),
  ].join('\r\n') + '\r\n';
  const closeCsv = [
    reviewHeader.join(','),
    ...close.map(row => [
      row.product.product_id, row.product.name, row.product.productType, row.product.brand ?? row.product.familyBrand,
      row.product.condition, row.product.identifierStatus, row.product.gtin, row.product.mpn,
      row.product.imageRights, row.product.googleApproved === true ? 'true' : 'false', row.images.length,
      row.blockers.join('; '), 'true', 'false',
    ].map(csvCell).join(',')),
  ].join('\r\n') + '\r\n';

  const report = {
    generatedAt: new Date().toISOString(),
    source: `${origin}/api/products`,
    feedLabel,
    note: 'Read-only preparation. No Merchant API request was made and no catalogue data was changed.',
    totalPublicProducts: rawProducts.length,
    parsedProducts: products.length,
    invalidProducts,
    readyForMerchantApi: ready.length,
    closeToReady: close.length,
    blockers: Object.fromEntries([...blockerCounts.entries()].sort((a, b) => b[1] - a[1])),
    closeToReadyProducts: close.map(row => ({
      productId: row.product.product_id,
      name: row.product.name,
      blockers: row.blockers,
      hasGtin: Boolean(row.product.gtin),
      hasMpn: Boolean(row.product.mpn),
    })),
  };

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n'),
    writeFile(join(outputDir, 'review.csv'), reviewCsv),
    writeFile(join(outputDir, 'close-to-ready.csv'), closeCsv),
    writeFile(join(outputDir, 'product-inputs.preview.json'), JSON.stringify({
      generatedAt: report.generatedAt,
      feedLabel,
      contentLanguage: 'en',
      note: 'Preview only. These products pass the existing Google feed gates; no Merchant API request was made.',
      products: inputs,
    }, null, 2) + '\n'),
  ]);

  console.log('Merchant preparation complete (read-only).');
  console.log(`Source: ${origin}/api/products`);
  console.log(`Products scanned: ${rawProducts.length} (parsed ${products.length}, invalid ${invalidProducts})`);
  console.log(`Ready for Merchant API: ${ready.length}`);
  console.log(`Close to ready: ${close.length}`);
  console.log(`Top blockers: ${[...blockerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => `${name} (${count})`).join(', ')}`);
  console.log(`Output: ${outputDir}`);
  console.log('No Merchant API request was made.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Merchant preparation failed.');
  process.exitCode = 1;
});
