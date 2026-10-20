'use client';
import { useRouter } from 'next/navigation';
import { localeCookie, type Locale } from '../lib/i18n';

/** Switches the storefront language preference. The choice is a UI preference only; content stays CMS-reviewed. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const style = (active: boolean) => `min-h-7 rounded-full border-0 px-2.5 py-0.5 text-xs ${active ? 'bg-white font-semibold text-brand' : 'bg-transparent font-normal text-ink hover:text-brand'}`;
  return <div className="language-switcher flex items-center gap-1" aria-label={label} role="group">
    <button type="button" lang="en" aria-pressed={locale === 'en'} className={style(locale === 'en')} onClick={() => choose('en')}>English</button>
    <button type="button" lang="ar" aria-pressed={locale === 'ar'} className={style(locale === 'ar')} onClick={() => choose('ar')}>العربية</button>
  </div>;
}
