import { Navigation, Footer } from '../components/navigation';
import StorefrontNotFound from './(storefront)/not-found';
import { getLocale } from '../lib/server/i18n';
import { storefrontLatin, storefrontArabic } from '../lib/storefront-fonts';
import './(storefront)/storefront.css';
export default async function NotFound() {
 const locale = await getLocale();
 return <div className={`storefront-shell ${locale === 'ar' ? storefrontArabic.className : storefrontLatin.className}`} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}><Navigation locale={locale} /><main id="main-content"><StorefrontNotFound /></main><Footer locale={locale} /></div>;
}
