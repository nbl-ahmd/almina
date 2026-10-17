import { ProductOptions } from '../../../../components/product-options';
import { ProductGallery } from '../../../../components/product-gallery';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { catalogAvailabilityConfirmed, getProductVariants, getProducts, productImages } from '../../../../lib/server/catalog';
import { resolveProductRoute } from '../../../../lib/server/product-route';
import { metadataFor } from '../../../../lib/server/seo';
import { getWebEnvironment } from '../../../../lib/server/env';
import { breadcrumbData, productData, type Query } from '../../../../lib/seo';
import { StructuredData } from '../../../../components/structured-data';
import { categoryHref, productOptionLabel, productHref, money, displayPrice } from '../../../../lib/catalog/model';
import { ProductGrid, Breadcrumb, StockState } from '../../../../components/storefront';
import { Icon } from '../../../../components/icon';
import { AddToCart } from '../../../../components/cart-controls';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Query> };
export async function generateMetadata({ params, searchParams }: Props) {
  const product = await resolveProductRoute((await params).slug);
  const image = productImages(product).find(image => !image.startsWith('/'));
  const optionLabel = productOptionLabel(product);
  const title = `${product.seoTitle || product.name}${optionLabel ? ` — ${optionLabel}` : ''}`;
  return metadataFor(title, `${optionLabel ? `${optionLabel}. ` : ''}${product.seoDescription || product.summary || product.description || `Explore ${product.name} in ${product.category.name} at Al Mina Pharmacy.`}`.slice(0,160), productHref(product), await searchParams, image);
}
export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await resolveProductRoute(slug);
  if (`/products/${slug}` !== productHref(product) && getWebEnvironment().STOREFRONT_REDIRECTS_VERIFIED) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') query.append(key, value);
      else if (Array.isArray(value)) for (const item of value) query.append(key, item);
    }
    permanentRedirect(`${productHref(product)}${query.size ? `?${query}` : ''}`);
  }
  const [related,variants,availabilityConfirmed] = await Promise.all([getProducts({ category: product.category._id }),getProductVariants(product),catalogAvailabilityConfirmed()]);
  const origin = getWebEnvironment().WEB_ORIGIN;
  const currentPrice = displayPrice(product);
  const saving = product.price > currentPrice && product.price > 0 ? Math.round((product.price - currentPrice) / product.price * 100) : 0;
  return <><StructuredData data={productData(origin, product, productImages(product).filter(image => !image.startsWith('/')),variants, Object.fromEntries(variants.map(member=>[member._id,productImages(member).filter(image=>!image.startsWith('/'))])),availabilityConfirmed && getWebEnvironment().CHECKOUT_ENABLED)} />
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }, { name: product.name, path: productHref(product) }])} />
    <div className="pdp-page"><Breadcrumb title={product.name} parents={[{ name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} />
    <div className="product-detail mb-8 grid items-start gap-6 md:grid-cols-2 md:gap-6 lg:gap-10">
      <div className="product-visual min-w-0"><div className="mb-3 flex flex-wrap gap-2 text-xs text-ocean"><Link className="rounded-full border border-border bg-accent/30 px-3 py-1.5 text-ocean" href={categoryHref(product.category)}>{product.category.name}</Link><span className="rounded-full border border-border bg-subtle px-3 py-1.5">Product ID: {product.product_id}</span></div><ProductGallery images={productImages(product)} name={product.name} />

      </div>
      <div className="product-information min-w-0"><div className="product-identity mb-3 flex items-center justify-between gap-3 text-xs text-ocean"><Link className="text-ocean" href={categoryHref(product.category)}>{product.category.name}</Link><span className="hidden md:block">SKU: {product.product_id}</span></div><h1 className="mb-3 text-2xl leading-tight font-bold tracking-tight wrap-anywhere md:text-3xl">{product.name}</h1>{product.description ? <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-ocean">{product.description.split('\n')[0]}</p> : null}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-subtle p-3"><StockState stock={product.stock} /><span className="text-xs text-ocean">Al Mina Pharmacy</span></div>
        <ProductOptions product={product} variants={variants} />
        <div className="product-price-panel mb-5 flex flex-wrap items-center gap-4 border-y border-border py-4 md:rounded-xl md:border md:bg-surface md:p-4"><div className="w-full text-xs font-semibold text-ocean md:w-auto">One-time purchase</div><p className="price m-0 text-3xl font-bold text-sale tabular-nums md:ml-auto md:text-2xl">{money(currentPrice)}</p>{saving ? <><del className="text-sm text-muted">{money(product.price)}</del><span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Save {saving}%</span></> : null}</div>
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"><span className="rounded-lg bg-accent p-2 text-teal"><Icon name="pin" /></span><div><h2 className="mb-1 text-base font-bold">Delivery in Ras Al Khaimah</h2><p className="m-0 text-sm leading-relaxed text-ocean">Checkout confirms the delivery charge and final total before you place an order.</p><Link className="inline-flex min-h-9 items-center text-xs text-teal" href="/contact#delivery">Delivery enquiries <Icon name="arrow" /></Link></div></div>
        <div className="pdp-purchase fixed inset-x-0 bottom-0 z-[19] border-t border-border bg-subtle px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-nav md:static md:mb-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none"><AddToCart key={product._id} id={product._id} name={product.name} stock={product.stock} quantityPicker priceLabel={money(currentPrice)} /></div>
        <div className="mb-4 grid grid-cols-2 gap-2"><Link className="product-contact flex min-h-11 items-center justify-center gap-2 rounded-full border border-ocean px-3 text-xs font-semibold text-ocean" href="/cart"><Icon name="bag" />View your cart</Link><Link className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-ocean px-3 text-xs font-semibold text-ocean" href="/contact"><Icon name="phone" />Contact pharmacy</Link></div>
        <div className="product-order-note flex items-start gap-2 rounded-lg border border-border bg-subtle p-3 text-xs leading-relaxed text-ocean"><Icon name="check" /><p className="m-0">Availability, delivery, VAT and your final total are reviewed at checkout.</p></div>
      </div>
    </div>
    <section className="product-info-panel rounded-xl border border-border bg-surface p-4 md:p-6"><nav className="mb-5 hidden gap-6 border-b border-border pb-3 text-sm font-semibold text-ocean md:flex" aria-label="Product information sections"><a className="inline-flex min-h-11 items-center gap-2 border-b-2 border-ocean" href="#product-description"><Icon name="check" />Product description</a><a className="inline-flex min-h-11 items-center" href="#product-facts">Product information</a><a className="inline-flex min-h-11 items-center" href="#product-support">Pharmacy support</a></nav><div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><div className="product-info-main"><details id="product-description" open className="mb-3 rounded-xl border border-border bg-surface md:border-0"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 p-4 md:px-0"><h2 className="m-0 text-base font-bold">Product description</h2><Icon name="plus" /></summary><p className="m-0 px-4 pb-5 text-sm leading-relaxed whitespace-pre-wrap text-ocean wrap-anywhere md:px-0">{product.description || 'No description available.'}</p></details><details id="product-facts" className="rounded-xl border border-border bg-surface"><summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 p-4"><h2 className="m-0 text-base font-bold">Product information</h2><Icon name="plus" /></summary><dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 px-4 pb-4 text-sm"><dt>Category</dt><dd className="m-0 wrap-anywhere"><Link className="text-ocean" href={categoryHref(product.category)}>{product.category.name}</Link></dd>{([['Brand',product.brand||product.familyBrand],['Pack',product.packLabel],['Sold as',product.saleUnit],['Form',product.productForm],['Strength',product.strength],['Manufacturer',product.manufacturer],['GTIN',product.gtin]] as const).filter(([,value])=>value).map(([label,value])=><div key={label} className="contents"><dt>{label}</dt><dd className="m-0 wrap-anywhere">{value}</dd></div>)}<dt>Product ID</dt><dd className="m-0">{product.product_id}</dd></dl></details>{([["Ingredients / materials",product.ingredients],["Usage",product.usage],["Warnings",product.warnings],["Storage",product.storage]] as const).filter(([,value])=>value).map(([label,value])=><details key={label} className="mt-3 rounded-xl border border-border bg-surface"><summary className="cursor-pointer p-4 text-sm font-semibold">{label}</summary><p className="px-4 pb-4 text-sm whitespace-pre-wrap text-ocean">{value}</p></details>)}</div><aside id="product-support" className="rounded-xl border border-border bg-subtle p-5"><h2 className="mb-2 text-base font-bold">Al Mina Pharmacy</h2><p className="text-xs text-ocean">Ras Al Khaimah, UAE</p><p className="text-sm leading-relaxed text-ocean">For product, delivery or order enquiries, contact your neighbourhood pharmacy.</p><a className="button button-secondary min-h-11 w-full rounded-lg px-3 text-xs text-ocean" href="tel:+971504825007"><Icon name="phone" />Call the pharmacy</a></aside></div></section>
    <section><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="mb-1 text-xl font-bold">Similar products</h2><p className="mb-0 text-xs text-ocean">Explore more in {product.category.name}.</p></div><Link className="inline-flex min-h-11 items-center gap-1 text-xs text-ocean" href={categoryHref(product.category)}>View category <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={related.products.filter(item => item._id !== product._id && (!product.familyKey || item.familyKey !== product.familyKey)).slice(0, 4)} /></section></div></>;
}
