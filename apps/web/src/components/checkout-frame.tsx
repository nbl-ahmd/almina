import type { ReactNode } from 'react';
import type { Locale } from '../lib/i18n';
import tokens from './storefront-system/tokens.module.css';
import controls from './storefront-system/boundary.module.css';

export function CheckoutFrame({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <div lang={locale} data-storefront-checkout className={`checkout-frame ${tokens.system} ${controls.boundary}`}>
    <div className="checkout-content">{children}</div>
  </div>;
}
