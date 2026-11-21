import { SavedProducts } from '../../../components/saved-products';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { StorefrontInformation } from '../../../components/storefront-information';

export async function generateMetadata() {
  return { title: await getLocale() === 'ar' ? 'المنتجات المحفوظة' : 'Saved products', robots: { index: false, follow: false } };
}

export default async function SavedPage() {
  const locale = await getLocale();
  return <StorefrontInformation locale={locale}>
    <SavedProducts locale={locale} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />
  </StorefrontInformation>;
}
