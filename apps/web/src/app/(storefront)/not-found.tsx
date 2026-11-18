import Link from '../../components/app-link';
import { getLocale } from '../../lib/server/i18n';

export default async function NotFound() {
  const ar = await getLocale() === 'ar';
  return (
    <section className="empty-state">
      <h1>{ar ? 'الصفحة غير موجودة' : 'Page not found'}</h1>
      <p>{ar ? 'ربما نُقلت هذه الصفحة. تصفّح الصيدلية للعثور على ما تحتاج إليه.' : 'This page may have moved. Explore the pharmacy to find what you need.'}</p>
      <Link className="button" href="/">{ar ? 'العودة إلى الرئيسية' : 'Return home'}</Link>
    </section>
  );
}
