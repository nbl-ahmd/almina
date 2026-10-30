import { customerInputSchema } from '@almina/contracts';
import type { Locale } from '../i18n';
export const detailFields = ['name', 'mobile', 'email', 'emirate', 'city', 'address'] as const;
export type DetailField = typeof detailFields[number];
export function normalizeCheckoutMobile(value:string){return value.replace(/[\u0660-\u0669]/g,digit=>String(digit.charCodeAt(0)-0x0660)).replace(/[\s()-]/g,'');}
export function detailError(field: DetailField, value: unknown, locale: Locale): string | undefined {
  if (customerInputSchema.shape[field].safeParse(field==='mobile'&&typeof value==='string'?normalizeCheckoutMobile(value):value).success) return;
  const labels: Record<DetailField, [string, string]> = {
    name: ['Enter your full name.', 'أدخل اسمك الكامل.'],
    mobile: ['Enter a valid mobile number, including the country code if needed.', 'أدخل رقم هاتف متحرك صحيحاً، مع رمز الدولة عند الحاجة.'],
    email: ['Enter a valid email address for your order confirmation.', 'أدخل بريداً إلكترونياً صحيحاً لتأكيد طلبك.'],
    emirate: ['Choose your emirate.', 'اختر الإمارة.'],
    city: ['Enter your city or area.', 'أدخل المدينة أو المنطقة.'],
    address: ['Enter your street address.', 'أدخل عنوان الشارع.'],
  };
  return labels[field][locale === 'ar' ? 1 : 0];
}
export function detailErrors(values: Record<string, unknown>, locale: Locale) {
  const errors: Partial<Record<DetailField, string>> = {};
  for (const field of detailFields) { const message = detailError(field, values[field], locale); if (message) errors[field] = message; }
  return errors;
}
