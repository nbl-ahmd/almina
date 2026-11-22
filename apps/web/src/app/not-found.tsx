import './(storefront)/storefront.css';
import './(storefront)/storefront-pages.css';
import './(storefront)/storefront-chrome.css';
import { storefrontFontVariables } from '../lib/storefront-fonts';
import { getLocale } from '../lib/server/i18n';
import { Navigation, Footer } from '../components/navigation';
import StorefrontNotFound from './(storefront)/not-found';
export default async function NotFound() {
  const locale = await getLocale();
  return <div className={`storefront-shell ${storefrontFontVariables}`} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}><Navigation locale={locale} /><main id="main-content"><StorefrontNotFound /></main><Footer locale={locale} /></div>;
}
