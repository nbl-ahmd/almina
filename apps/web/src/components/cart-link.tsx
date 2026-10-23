'use client';
import Link from 'next/link';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { cartCountText, t, type Locale } from '../lib/i18n';
import { useCartCount } from '../lib/catalog/use-cart-count';

export function CartLink({ locale = 'en' }: { locale?: Locale }) {
  const count = useCartCount();
  return <Link className="header-cart group relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ocean md:min-h-12 md:w-auto md:gap-2 md:px-4" href="/cart" aria-label={count ? cartCountText(locale,count) : t(locale,'headerCart')}><ShoppingCartIcon className="size-[21px] shrink-0" aria-hidden="true" /><span className="hidden md:inline">{t(locale,'navCart')}</span>{count ? <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-ink ring-2 ring-surface md:static md:h-auto md:min-w-5 md:ring-0" aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}</Link>;
}
