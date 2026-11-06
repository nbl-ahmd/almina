import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { localeCookie, parseLocale, type Locale } from '../i18n';

/** Reads the storefront language preference. Absent or invalid values fall back to English. */
export const getLocale = cache(async (): Promise<Locale> => {
  return parseLocale((await cookies()).get(localeCookie)?.value);
});
