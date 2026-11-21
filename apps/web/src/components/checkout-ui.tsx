'use client';
import { BanknotesIcon, CheckIcon, CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { t, type Locale } from '../lib/i18n';

export function CheckoutProgress({ stage, locale }: { stage: 'details' | 'payment' | 'complete'; locale: Locale }) {
  const active = ['details', 'payment', 'complete'].indexOf(stage);
  const labels = locale === 'ar' ? ['تفاصيل التوصيل', 'المراجعة والدفع', 'اكتمل الطلب'] : ['Delivery details', 'Review & payment', 'Complete'];
  return <ol className="checkout-progress" aria-label={locale === 'ar' ? 'مراحل إتمام الطلب' : 'Checkout progress'}>{labels.map((label, index) => <li key={label} aria-current={index === active ? 'step' : undefined} data-complete={index < active}>
    <span className="checkout-step-number" aria-hidden="true">{index < active ? <CheckIcon className="size-4" /> : index + 1}</span><span>{label}</span>
  </li>)}</ol>;
}

export function PaymentChoices({ locale, value, online, testMode, legacyCard, onChange }: {
  locale: Locale; value: string; online: boolean; testMode: boolean; legacyCard: boolean; onChange: (value: string) => void;
}) {
  const ar = locale === 'ar';
  const choices = [
    { value: 'cash', title: t(locale, 'checkoutCash'), description: ar ? 'ادفع نقداً عند وصول طلبك.' : 'Pay when your order arrives.', icon: BanknotesIcon },
    ...(online ? [{ value: 'stripe', title: t(locale, 'checkoutCreditDebitCard'), description: testMode ? (ar ? 'وضع الاختبار — لا تُحصّل أموال حقيقية.' : 'Test mode — no real charge.') : (ar ? 'أكمل الدفع في صفحة الدفع الآمن.' : 'Continue to secure payment.'), icon: CreditCardIcon }] : []),
    ...(legacyCard ? [{ value: 'card', title: t(locale, 'checkoutCard'), description: ar ? 'طريقة الدفع المحفوظة لهذا الطلب.' : 'Saved payment method for this order.', icon: CreditCardIcon }] : []),
  ];
  return <fieldset className="m-0 min-w-0 border-0 p-0"><legend className="mb-4 text-lg font-semibold">{t(locale, 'checkoutPaymentMethod')}</legend><div className="checkout-payment-choices">{choices.map(choice => {
    const Glyph = choice.icon;
    return <label key={choice.value} className="checkout-payment-choice" data-selected={value === choice.value}>
      <input type="radio" name="payment" value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} />
      <Glyph className="checkout-payment-icon size-6" aria-hidden="true" /><span className="min-w-0"><span className="block text-sm font-semibold leading-5">{choice.title}</span><span className="mt-1 block text-xs leading-5">{choice.description}</span></span>
      <span className="checkout-radio-mark" aria-hidden="true">{value === choice.value ? <CheckIcon className="size-3.5" /> : null}</span>
    </label>;
  })}</div></fieldset>;
}

export function SecureCheckoutLabel({ locale }: { locale: Locale }) {
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium"><LockClosedIcon className="size-4" aria-hidden="true" />{locale === 'ar' ? 'إتمام الطلب بأمان' : 'Secure checkout'}</span>;
}

export function ConfirmationMark() {
  return <span aria-hidden="true"><CheckIcon strokeWidth={2} /></span>;
}
