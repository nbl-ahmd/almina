import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from './app-link';
import { Icon } from './icon';
import styles from './product-information.module.css';
import { categoryHref, literalPackFromName, type Product } from '../lib/catalog/model';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { businessContact, policyPaths } from '../lib/policies';

const sectionTitles = new Set(['Key benefits', 'Suitable for', 'Pack details']);

/** Render catalogue text as text, including older imports that contain markup. */
function Description({ text }: { text: string }) {
  return (
    <div className={styles.description}>
      {text.split(/\n\s*\n/).filter(block => block.trim()).map((block, index) => {
        const lines = block.trim().split('\n');
        const heading = sectionTitles.has(lines[0]?.trim() ?? '') ? lines.shift() : undefined;
        const bullets = lines.length > 0 && lines.every(line => /^[•*-]\s+/.test(line.trim()));
        return (
          <div key={index}>
            {heading ? <h3 dir="auto">{heading}</h3> : null}
            {bullets ? (
              <ul>{lines.map((line, item) => <li dir="auto" key={item}>{line.trim().replace(/^[•*-]\s+/, '')}</li>)}</ul>
            ) : lines.length ? <p dir="auto">{lines.join('\n')}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ProductInformation({ product, locale }: { product: Product; locale: Locale }) {
  const t = (key: string) => u(locale, key);
  const summary = product.summary?.trim();
  const description = product.description?.trim();
  const sections = [
    ['product-warnings', 'Warnings & precautions', product.warnings],
    ['product-usage', 'How to use', product.usage],
    ['product-ingredients', 'Ingredients / materials', product.ingredients],
    ['product-storage', 'Storage', product.storage],
  ].filter((section): section is [string, string, string] => Boolean(section[2]?.trim()));
  const sparse = !summary && !description && !sections.length;
  const facts = [
    ['Brand', product.brand || product.familyBrand],
    ['Pack size', product.packLabel || product.variantPackSize || product.variantSize || literalPackFromName(product.name)?.label],
    ['Sold as', product.saleUnit],
    ['Form', product.productForm],
    ['Strength', product.strength],
    ['Manufacturer', product.manufacturer],
    ['GTIN', product.gtin],
    ['Product ID', product.product_id],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]?.trim()));

  return (
    <section className={styles.information} data-sparse={sparse || undefined} aria-labelledby="product-about-title">
      <div className={styles.overview}>
        <div id="product-description" className={styles.about}>
          <h2 id="product-about-title">{t('About this product')}</h2>
          {summary ? <p className={styles.summary} dir="auto">{summary}</p> : null}
          {description && description !== summary ? <Description text={description} /> : null}
          {!summary && !description ? <p className={styles.missing}>
            {locale === 'ar' ? 'لا يتوفر وصف لهذا المنتج حالياً.' : 'A description for this product is currently unavailable.'}
          </p> : null}
        </div>
        {sections.length ? (
          <div className={styles.disclosures}>
            {sections.map(([id, title, value]) => (
              <details key={id} id={id} open={id === 'product-warnings'}>
                <summary>{t(title)}<ChevronDownIcon aria-hidden="true" /></summary>
                <Description text={value} />
              </details>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.factsAndHelp}>
        <section id="product-facts" aria-labelledby="product-specifications-title">
          <h2 id="product-specifications-title">{t('Product specifications')}</h2>
          <dl className={styles.facts}>
            <div><dt>{t('Category')}</dt><dd>
              <Link className={styles.link} href={categoryHref(product.category)}>{t(product.category.name)}</Link>
            </dd></div>
            {facts.map(([label, value]) => (
              <div key={label}><dt>{t(label)}</dt><dd><bdi>{value}</bdi></dd></div>
            ))}
          </dl>
        </section>
        <section id="product-support" className={styles.help}>
          <h2>{t('Need help choosing?')}</h2>
          <p>{t('Ask Al Mina Pharmacy about product details or use before you order.')}</p>
          <div className={styles.actions}>
            <a className={styles.link} href={`tel:${businessContact.telephone}`}><Icon name="phone" />{t('Call the pharmacy')}</a>
            <Link className={styles.link} href="/contact">{t('Contact pharmacy')}</Link>
          </div>
        </section>
        <section className={styles.help}>
          <h2>{locale === 'ar' ? 'التوصيل والإرجاع' : 'Delivery and returns'}</h2>
          <p>{t('Checkout confirms the delivery charge and final total before you place an order.')}</p>
          <div className={styles.actions}>
            <Link className={styles.link} href={policyPaths.shipping}>{t('Delivery & shipping')}</Link>
            <Link className={styles.link} href={policyPaths.returns}>{t('Returns & refunds')}</Link>
          </div>
        </section>
      </div>
    </section>
  );
}
