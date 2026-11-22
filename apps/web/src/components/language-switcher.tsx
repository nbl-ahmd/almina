'use client';
import { useRouter } from 'next/navigation';
import { localeCookie, type Locale } from '../lib/i18n';

/** Switches the storefront language preference. The choice is a UI preference only; content stays CMS-reviewed. */
export function LanguageSwitcher({ locale, label, size = 'compact' }: { locale: Locale; label: string; size?: 'compact' | 'default' | 'toggle' }) {
  const router = useRouter();
  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  if (size === 'toggle') {
    const next = locale === 'en' ? 'ar' : 'en';
    return <div className="language-switcher language-toggle" aria-label={label} role="group">
      <button data-slot="language-option" type="button" className="language-toggle-button" aria-label={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'} onClick={() => choose(next)}>
        <span lang={next} dir={next === 'ar' ? 'rtl' : 'ltr'}>{next === 'ar' ? 'العربية' : 'English'}</span>
      </button>
    </div>;
  }
  const dimensions = size === 'default' ? 'text-sm' : 'text-[13px]';
  // Opt out of inherited commerce-button styling; these are quiet utility actions.
  const style = (active: boolean) => `${dimensions} inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-none border-0 bg-transparent px-1 py-2 [font-family:inherit] leading-5  underline-offset-4 decoration-1  hover:underline focus-visible:outline-2 focus-visible:outline-offset-2  motion-safe:active:scale-[0.97] ${active ? 'font-semibold' : 'font-normal  no-underline'}`;
  return <div className="language-switcher flex shrink-0 items-center gap-2" aria-label={label} role="group" dir="ltr">
    <button data-slot="language-option" type="button" lang="en" aria-pressed={locale === 'en'} className={style(locale === 'en')} onClick={() => choose('en')}>English</button>
    <span aria-hidden="true">/</span>
    <button data-slot="language-option" type="button" lang="ar" dir="rtl" aria-pressed={locale === 'ar'} className={style(locale === 'ar')} onClick={() => choose('ar')}>العربية</button>
  </div>;
}
