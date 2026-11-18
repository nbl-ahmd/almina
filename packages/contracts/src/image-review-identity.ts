import { imageIdentityFields, imageIdentitySchema, type ImageIdentity, type ImageIdentityField, type ImageReviewComparison } from './image-review';

const norm = (value: string) => value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[’']/g, '').replace(/[µμ]/g, 'u').replace(/\s+/g, ' ').trim();
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const metric = (raw: string) => {
  const matches = [...norm(raw).matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|ml|l|g)\b/g)];
  if (matches.length !== 1) return null;
  const m = matches[0]!, unit = m[2]!, n = Number(m[1]!.replace(',', '.'));
  return `${n * (unit === 'kg' || unit === 'l' ? 1000 : 1)}:${unit === 'kg' ? 'g' : unit === 'l' ? 'ml' : unit}`;
};
export function reviewStrength(raw: string): string | null {
  const value = norm(raw).replace(/i\.?u\.?/g, 'iu').replace(/\bunits?\b/g, 'iu')
    .replace(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g|iu)\b/g, '$1 $3 + $2 $3');
  const re = /(\d+(?:[.,]\d+)?)\s*(mcg|ug|mg|iu|g|%)(?:\s*\/\s*(\d+(?:[.,]\d+)?)?\s*(ml|l|g))?/g;
  const parts = [...value.matchAll(re)].map(m => {
    const unit = m[2]!, denominator = m[4] ?? '', n = Number(m[1]!.replace(',', '.')) * (unit === 'g' ? 1000 : unit === 'mcg' || unit === 'ug' ? 0.001 : 1);
    return [Number((n / ((m[3] ? Number(m[3].replace(',', '.')) : 1) * (denominator === 'l' ? 1000 : 1))).toPrecision(12)), ['g', 'mcg', 'ug'].includes(unit) ? 'mg' : unit, denominator === 'l' ? 'ml' : denominator];
  });
  if (!parts.length || /\d/.test(value.replace(re, '').replace(/\b(?:b\d+|vitamin)\b/g, ''))) return null;
  return JSON.stringify([parts, value.match(/\b[wv]\s*\/\s*[wv]\b/)?.[0].replace(/\s/g, '') ?? '']);
}
function form(raw: string) {
  return norm(raw).replace(/film[- ]coated\s*/g, '').replace(/\btablets?|tabs?\b/g, 'tablet').replace(/\bcapsules?|caps?\b/g, 'capsule')
    .replace(/\bsoftgels?\b/g, 'softgel').replace(/\bsuppositories\b/g, 'suppository').replace(/\borodispersible|dispersible\b/g, 'odt');
}
function count(raw: string) {
  const s = norm(raw), m = s.match(/^(\d+)\s*(?:veg(?:etable|etarian)?\s+)?(tablets?|capsules?|softgels?|caplets?|pens?|vials?|ampoules?|sachets?|pessaries|ovules?|suppositories|wipes?|diapers?|condoms?|count|ct|pcs|s)?$/);
  if (!m) return null;
  const unit = (m[2] ?? 'count').replace(/s$/, '');
  return { value: Number(m[1]), unit: ['ct', 'pc', ''].includes(unit) ? 'count' : unit };
}
export function reviewGtin(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value)) return null;
  const digits = [...value].map(Number), check = digits.pop()!;
  const sum = digits.reverse().reduce((n, digit, index) => n + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check ? value : null;
}
const words = (s: string) => norm(s).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !/^(?:ml|mg|mcg|g|count|tablet|tablets|capsule|capsules|cream|gel|lotion)$/.test(w) && !/^\d+$/.test(w)).sort().join(' ');
export function isCoreImageIdentityField(field: ImageIdentityField) {
  return field === 'name' || field === 'brand';
}

export function compareImageIdentity(image: ImageIdentity, catalogue: ImageIdentity): ImageReviewComparison[] {
  return imageIdentityFields.map(field => {
    const a = image[field], b = catalogue[field];
    // Optional fields still need comparison if either source supplies a value.
    // An identifier recorded only in the catalogue remains optional corroboration.
    const required = isCoreImageIdentityField(field) || Boolean(a || (field !== 'barcode' && field !== 'gtin' && b));
    let x: string | null = norm(a) || null, y: string | null = norm(b) || null;
    if (field === 'name') { x = words(a) || null; y = words(b) || null; }
    if (field === 'form') { x = a ? form(a) : null; y = b ? form(b) : null; }
    if (field === 'size') { x = metric(a); y = metric(b); }
    if (field === 'strength') { x = reviewStrength(a); y = reviewStrength(b); }
    if (field === 'barcode' || field === 'gtin') { x = reviewGtin(a); y = reviewGtin(b) ?? reviewGtin(catalogue[field === 'barcode' ? 'gtin' : 'barcode']); }
    let status: ImageReviewComparison['status'] = !x || !y ? 'unknown' : x === y ? 'match' : field === 'name' ? 'unknown' : 'conflict';
    if (field === 'quantity') {
      const i = count(a), p = count(b);
      status = !i || !p ? 'unknown' : i.value !== p.value || (i.unit !== p.unit && i.unit !== 'count' && p.unit !== 'count') ? 'conflict' : 'match';
    }
    return { field, imageValue: a, catalogueValue: b, required, status };
  });
}
/** Leave an optional attribute blank when it has no catalogue value. */
export function canDiscardImageExtraction(image: ImageIdentity, catalogue: ImageIdentity, field: ImageIdentityField) {
  if ((field === 'barcode' || field === 'gtin') && (catalogue.barcode || catalogue.gtin)) return false;
  return !isCoreImageIdentityField(field) && !!image[field] && !catalogue[field];
}

export const imageReviewNetContentPattern = /^\d+(?:[.,]\d+)?\s*(?:kg|ml|g|l)$/i;
export function updateImageReviewNetContent(packLabel: string, value: string) {
  const existing = /\b\d+(?:[.,]\d+)?\s*(?:kg|ml|g|l)\b/i;
  return existing.test(packLabel) ? packLabel.replace(existing, () => value) : [packLabel, value].filter(Boolean).join(' · ');
}
export function imageReviewProductIdentity(product: Record<string, unknown>, observed?: ImageIdentity): ImageIdentity {
  const name = text(product.name);
  const inferred = (field: ImageIdentityField) => {
    const value = observed?.[field];
    return value && norm(name).includes(norm(value)) ? value : '';
  };
  const countMatch = name.match(/\b\d+\s*(?:tablets?|capsules?|softgels?|caplets?|pens?|sachets?|count)\b/i)?.[0] ?? '';
  const strength = [...name.matchAll(/(?:\d+(?:[.,]\d+)?\s*\/\s*)?\d+(?:[.,]\d+)?\s*(?:mcg|mg|iu|%)(?:\s*\/\s*(?:\d+(?:[.,]\d+)?)?\s*(?:ml|g))?/gi)].map(m => m[0]).join(' + ');
  return imageIdentitySchema.parse({
    name, brand: text(product.brand), line: inferred('line'), strength: text(product.strength) || strength,
    form: text(product.productForm) || name.match(/(?:odt |chewable |modified.release |delayed.release )?(?:tablets?|capsules?|softgels?|caplets?|cream|ointment|gel|lotion|syrup|shampoo|eye drops?|ear drops?|nasal spray|spray|suppositories|pessaries|powder|injection)\b/i)?.[0] || '',
    size: text(product.packLabel).match(/\d+(?:[.,]\d+)?\s*(?:kg|ml|g|l)\b/i)?.[0] || name.match(/\d+(?:[.,]\d+)?\s*(?:kg|ml|g|l)\b/i)?.[0] || '',
    quantity: text(product.variantPackSize) || text(product.packLabel).match(/\d+\s*(?:tablets?|capsules?|softgels?|count)\b/i)?.[0] || countMatch,
    multipack: inferred('multipack'), flavour: text(product.variantFlavour) || inferred('flavour'),
    shadeModel: text(product.mpn) || inferred('shadeModel'), variantSize: text(product.variantSize), ageStage: inferred('ageStage'),
    barcode: text(product.barcode), gtin: text(product.gtin),
  });
}
