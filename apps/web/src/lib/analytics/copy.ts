import type { Locale } from '../i18n';

/** Shopper-facing wording for the analytics choice. It must stay true to `policy.ts` and the privacy page. */
export function consentCopy(locale: Locale, cookieless: boolean) {
  const ar = locale === 'ar';
  return {
    region: ar ? 'خيار التحليلات' : 'Analytics choice',
    title: ar ? 'هل تساعدنا في تحسين المتجر؟' : 'Help us improve the shop?',
    body: ar
      ? 'بإذنك نستخدم PostHog (بيانات مستضافة في الاتحاد الأوروبي) لمعرفة الصفحات والمنتجات العامة المفيدة وخطوات الشراء. لا نرسل تفاصيل الأدوية أو كلمات البحث أو بيانات الاتصال بك.'
      : 'With your permission we use PostHog (data hosted in the EU) to learn which pages, general products and checkout steps work. We never send medicine details, search words or your contact details.',
    without: cookieless
      ? (ar ? 'إذا رفضت أو لم تختر، نحصي الزيارات وخطوات التسوق دون هوية ودون تخزين أي شيء على جهازك.' : 'If you decline or don’t choose, we still count visits and shopping steps anonymously, storing nothing on your device.')
      : (ar ? 'لا يُرسل شيء ما لم توافق.' : 'Nothing is sent unless you allow it.'),
    allow: ar ? 'السماح' : 'Allow',
    decline: ar ? 'رفض' : 'Decline',
    privacy: ar ? 'سياسة الخصوصية' : 'Privacy policy',
    failed: ar ? 'تعذر حفظ اختيارك.' : 'Your choice could not be saved.',
  };
}
