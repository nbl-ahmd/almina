'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { Locale } from '../lib/i18n';
import { accountText } from '../lib/account/copy';
const AccountLocale = createContext<Locale>('en');
/** Scoped to account and private wholesale routes; no global storefront provider. */
export function AccountLanguage({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <AccountLocale.Provider value={locale}>{children}</AccountLocale.Provider>;
}
export function useAccountCopy() {
  const locale = useContext(AccountLocale);
  return { locale, a: (text: string | undefined) => accountText(locale, text ?? '') };
}
