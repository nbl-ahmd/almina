'use client';
import Link from './app-link';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { cartCountText, t, type Locale } from '../lib/i18n';
import { useCartCount } from '../lib/catalog/use-cart-count';

export function CartLink({ locale = 'en' }: { locale?: Locale }) {
  const count = useCartCount();
  return <Link className="header-cart" href="/cart" aria-label={count ? cartCountText(locale,count) : t(locale,'headerCart')}><ShoppingCartIcon className="size-[21px] shrink-0" aria-hidden="true" /><span className="header-cart-label">{t(locale,'navCart')}</span>{count ? <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-ink ring-2 ring-surface md:static md:h-auto md:min-w-5 md:ring-0" aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}</Link>;
}
