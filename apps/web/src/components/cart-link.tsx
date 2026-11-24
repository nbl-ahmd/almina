'use client';
import Link from './app-link';
import { ShoppingCartIcon } from './storefront-icons';
import { cartCountText, t, type Locale } from '../lib/i18n';
import { useCartCount } from '../lib/catalog/use-cart-count';

export function CartLink({ locale = 'en' }: { locale?: Locale }) {
  const count = useCartCount();
  return <Link className="header-cart group relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-colors md:min-h-12 md:w-auto md:gap-2 md:px-4" href="/cart" aria-label={count ? cartCountText(locale,count) : t(locale,'headerCart')}><ShoppingCartIcon className="size-[21px] shrink-0" aria-hidden="true" /><span className="hidden md:inline">{t(locale,'navCart')}</span>{count ? <span key={count} className="cart-badge absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold md:static" aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}</Link>;
}
