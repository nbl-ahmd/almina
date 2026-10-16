import { z } from 'zod';
const text = z.string().trim().max(120).optional();
export const productFamilyFields = {
  familyKey: z.string().trim().max(80).refine(value => value === '' || /^[a-z0-9][a-z0-9_-]{2,79}$/.test(value)).optional(),
  familyName: z.string().trim().max(200).optional(), familyBrand: text, familyForm: text, familyStrength: text,
  variantSize: text, variantFlavour: text, variantPackSize: text,
};
export type ProductFamilyFields = z.infer<z.ZodObject<typeof productFamilyFields>>;
export const familyFieldNames = Object.keys(productFamilyFields) as (keyof ProductFamilyFields)[];
export const optionFields = ['variantSize', 'variantFlavour', 'variantPackSize'] as const;
export const optionLabels = { variantSize: 'Size', variantFlavour: 'Flavour', variantPackSize: 'Pack size' } as const;
export function validateProductFamily(value: ProductFamilyFields, ctx: z.RefinementCtx) {
  const other = familyFieldNames.some(key => key !== 'familyKey' && !!value[key]);
  if ((!value.familyKey && other) || (value.familyKey && (!value.familyName || !value.familyBrand || !value.familyForm || !value.familyStrength || !optionFields.some(key => !!value[key])))) {
    ctx.addIssue({ code: 'custom', path: ['familyKey'], message: 'A family needs a key, name, brand, form, strength identity and at least one option. Clear all family fields for a standalone product.' });
  }
}
export const productFamilySchema = z.object(productFamilyFields).strict().superRefine(validateProductFamily);
export function familyProfile(value: Record<string, unknown>): ProductFamilyFields | null {
  const parsed = productFamilySchema.safeParse(Object.fromEntries(familyFieldNames.filter(key => value[key] !== undefined).map(key => [key, value[key]])));
  return parsed.success && parsed.data.familyKey ? parsed.data : null;
}
export function variantLabel(value: ProductFamilyFields) {
  return optionFields.filter(key => value[key]).map(key => `${optionLabels[key]}: ${value[key]}`).join(' · ');
}
export function strengthSignature(name: string) {
  return (name.match(/\d+(?:[.,]\d+)?\s*(?:mcg|µg|μg|mg|iu|%)(?:\s*\/\s*\d+(?:[.,]\d+)?\s*(?:ml|g))?/gi) ?? []).map(value => value.replace(/\s/g, '').toLowerCase().replace(/[µμ]g/g, 'mcg')).sort().join('|');
}
export function sameFamilyIdentity(left: ProductFamilyFields & {name?: string}, right: ProductFamilyFields & {name?: string}) {
  const normalize = (value?: string) => (value ?? '').normalize('NFKC').trim().toLowerCase();
  return ['familyKey','familyName','familyBrand','familyForm','familyStrength'].every(key => normalize(left[key as keyof ProductFamilyFields]) === normalize(right[key as keyof ProductFamilyFields]))
    && strengthSignature(left.name ?? '') === strengthSignature(right.name ?? '');
}
