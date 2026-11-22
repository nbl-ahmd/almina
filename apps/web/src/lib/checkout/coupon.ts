import type { Locale } from '../i18n';

const storageKey = 'almina.checkout.coupon.v1';

export function readCoupon() {
  try { return sessionStorage.getItem(storageKey) ?? ''; } catch { return ''; }
}

export function saveCoupon(code: string) {
  try {
    if (code) sessionStorage.setItem(storageKey, code);
    else sessionStorage.removeItem(storageKey);
  } catch { /* The coupon still works for this page when browser storage is unavailable. */ }
}

export function couponError(code: string, locale: Locale) {
  const ar = locale === 'ar';
  switch (code) {
    case 'COUPON_MINIMUM': return ar ? 'أضف المزيد من المنتجات المؤهلة لاستخدام هذا الرمز.' : 'Add more eligible items to meet this coupon’s minimum spend.';
    case 'COUPON_UNAVAILABLE': return ar ? 'هذا الرمز غير متاح لهذه السلة. تحقق من الرمز أو جرّب رمزًا آخر.' : 'This coupon is unavailable for this basket. Check the code or try another.';
    case 'COUPON_COMBINATION': return ar ? 'استخدم رمز خصم واحدًا أو قسيمة مكافآت واحدة لكل طلب.' : 'Use one coupon or reward voucher per order.';
    case 'COUPON_PAYMENT_MINIMUM': return ar ? 'الإجمالي بعد الخصم أقل من الحد الأدنى للدفع الإلكتروني. اختر طريقة دفع أخرى أو أزل الرمز.' : 'The discounted total is below the online payment minimum. Change payment method or remove the coupon.';
    default: return '';
  }
}
