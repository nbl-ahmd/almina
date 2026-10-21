'use client';
import { useRouter } from 'next/navigation';
import { localeCookie, type Locale } from '../lib/i18n';

/** Switches the storefront language preference. The choice is a UI preference only; content stays CMS-reviewed. */
export function LanguageSwitcher({ locale, label, size = 'compact' }: { locale: Locale; label: string; size?: 'compact' | 'default' }) {
  const router = useRouter();
  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const dimensions = size === 'default' ? 'min-h-11 px-4 text-sm' : 'min-h-11 px-3 text-xs';
  const style = (active: boolean) => `${dimensions} rounded-full border-0 shadow-none transition-[color,background-color] ${active ? 'bg-ink font-semibold text-white' : 'bg-transparent font-normal text-muted hover:text-ink'}`;
  return <div className="language-switcher flex items-center gap-1" aria-label={label} role="group">
    <button type="button" lang="en" aria-pressed={locale === 'en'} className={style(locale === 'en')} onClick={() => choose('en')}>English</button>
    <button type="button" lang="ar" aria-pressed={locale === 'ar'} className={style(locale === 'ar')} onClick={() => choose('ar')}>العربية</button>
  </div>;
}
