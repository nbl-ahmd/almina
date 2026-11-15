import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from './app-link';
import type { Product } from '../lib/catalog/model';
import { categoryHref } from '../lib/catalog/model';
import { Icon } from './icon';

const sectionTitles = new Set(['Key benefits', 'Suitable for', 'Pack details']);

/** Plain text only: preserve older descriptions and never interpret imported HTML. */
function Description({ text }: { text: string }) {
  return <div className="space-y-5 text-sm leading-7 text-ocean wrap-anywhere">
    {text.split(/\n\s*\n/).filter(block => block.trim()).map((block, index) => {
      const lines = block.trim().split('\n');
      const heading = sectionTitles.has(lines[0] ?? '') ? lines.shift() : undefined;
      const bullets = lines.length > 0 && lines.every(line => /^[•*-]\s+/.test(line));
      return <div key={index}>
        {heading ? <h3 className="mb-2 text-base font-bold text-ink">{heading}</h3> : null}
        {bullets ? <ul className="m-0 list-disc space-y-1 pl-5 marker:text-teal">{lines.map((line, item) => <li key={item}>{line.replace(/^[•*-]\s+/, '')}</li>)}</ul>
          : <p className="m-0 whitespace-pre-wrap">{lines.join('\n')}</p>}
      </div>;
    })}
  </div>;
}

export async function ProductInformation({ product }: { product: Product }) {
  const locale = await getLocale();
  const sections = [
    ['product-usage', 'How to use', product.usage],
    ['product-ingredients', 'Ingredients / materials', product.ingredients],
    ['product-warnings', 'Warnings & precautions', product.warnings],
    ['product-storage', 'Storage', product.storage],
  ].filter((section): section is [string, string, string] => Boolean(section[2]?.trim()));
  const facts = [
    ['Brand', product.brand || product.familyBrand], ['Pack size', product.packLabel],
    ['Sold as', product.saleUnit], ['Form', product.productForm], ['Strength', product.strength],
    ['Manufacturer', product.manufacturer], ['GTIN', product.gtin], ['Product ID', product.product_id],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));
  return <section className="product-info-panel rounded-2xl border border-border bg-surface p-5 md:p-7" aria-label={u(locale,"Product details")}>
    <nav className="mb-7 flex gap-5 scrollbar-none overflow-x-auto border-b border-border text-sm font-semibold whitespace-nowrap" aria-label={u(locale,"Product information sections")}>
      <a className="inline-flex min-h-11 items-center border-b-2 border-ink text-ink" href="#product-description">{u(locale,"Overview")}</a>
      {product.usage ? <a className="inline-flex min-h-11 items-center text-muted hover:text-ink" href="#product-usage">{u(locale,"How to use")}</a> : null}
      <a className="inline-flex min-h-11 items-center text-muted hover:text-ink" href="#product-facts">{u(locale,"Specifications")}</a>
    </nav>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] lg:gap-12">
      <div className="min-w-0 max-w-prose">
        <div id="product-description" className="scroll-mt-6 pb-6">
          <h2 className="mb-4 text-xl font-bold">{u(locale,"About this product")}</h2>
          <Description text={product.description || u(locale,'Contact the pharmacy for more information about this product.')} />
        </div>
        {sections.map(([id, title, value]) => <details key={id} id={id} className="group scroll-mt-6 border-t border-border">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
            {u(locale,title)}<span className="text-ocean group-open:hidden"><Icon name="plus" /></span><span className="hidden text-ocean group-open:block"><Icon name="minus" /></span>
          </summary>
          <div className="pb-5"><Description text={value} /></div>
        </details>)}
      </div>
      <aside className="min-w-0 space-y-7 border-t border-border pt-6 lg:border-t-0 lg:border-s lg:ps-8 lg:pt-0">
        <div id="product-facts" className="scroll-mt-6" aria-labelledby="product-specifications-title">
          <h2 id="product-specifications-title" className="mb-4 text-lg font-bold">{u(locale,"Product specifications")}</h2>
          <dl className="m-0 divide-y divide-border border-y border-border text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 py-3"><dt className="text-muted">{u(locale,"Category")}</dt><dd className="m-0 wrap-anywhere"><Link className="text-muted hover:text-ink" href={categoryHref(product.category)}>{u(locale,product.category.name)}</Link></dd></div>
            {facts.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 py-3"><dt className="text-muted">{u(locale,label)}</dt><dd className="m-0 font-medium wrap-anywhere">{value}</dd></div>)}
          </dl>
        </div>
        <div id="product-support" className="border-t border-border pt-5">
          <h2 className="mb-2 text-base font-bold">{u(locale,"Need help choosing?")}</h2>
          <p className="mb-3 text-sm leading-6 text-ocean">{u(locale,"Ask Al Mina Pharmacy about product details or use before you order.")}</p>
          <a className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal" href="tel:+971504825007"><Icon name="phone" />{u(locale,"Call the pharmacy")}</a>
        </div>
      </aside>
    </div>
  </section>;
}
