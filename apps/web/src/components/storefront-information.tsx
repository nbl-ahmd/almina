import type { ReactNode } from 'react';
import type { Locale } from '../lib/i18n';
import tokens from './storefront-system/tokens.module.css';
import controls from './storefront-system/boundary.module.css';
import styles from './storefront-information.module.css';

export function StorefrontInformation({ children, locale }: { children: ReactNode; locale: Locale }) {
  return <div data-storefront-information lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className={`${styles.surface} ${tokens.system} ${controls.boundary}`}>
    <div className={styles.content}>{children}</div>
  </div>;
}
