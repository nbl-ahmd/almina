import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from './app-link';
import { optionFields, optionLabels, sameFamilyIdentity } from '@almina/contracts';
import { productHref, productOptionLabel, displayPrice, money, type Product } from '../lib/catalog/model';
export async function ProductOptions({ product, variants }: {product:Product;variants:Product[]}) {
  const locale = await getLocale();
  const members=variants.filter(member=>member.familyKey===product.familyKey&&sameFamilyIdentity(member,product));
  if (!product.familyKey||members.length<2) return null;
  return <section className="product-options mb-5 rounded-2xl border bg-white p-4" aria-label={u(locale,"Product options")}><h2 className="mb-1 text-base">{u(locale,"Choose your option")}</h2><p className="mb-4 text-xs">{product.familyName}</p>
    {optionFields.filter(key=>product[key]).map(key=><fieldset key={key} className="m-0 mb-3 min-w-0 border-0 p-0 last:mb-0"><legend className="mb-2 text-xs font-semibold">{u(locale,optionLabels[key])}</legend><div className="flex flex-wrap gap-2">{[...new Set(members.map(member=>member[key]).filter(Boolean))].map(value=>{
      const exact=members.find(member=>member[key]===value&&optionFields.every(other=>other===key||member[other]===product[other]));
      const target=exact;
      if (!target) return <span key={value} aria-disabled="true" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm">{value}<span className="text-xs">{u(locale,"Unavailable combination")}</span></span>;
      return <Link key={value} href={productHref(target)} prefetch={false} aria-current={target._id===product._id?'page':undefined} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm aria-[current=page]:font-semibold">{value}{target.stock===0?<span className="text-xs">{u(locale,"Out of stock")}</span>:null}</Link>;
    })}</div></fieldset>)}
    {optionFields.filter(key=>product[key]).length > 1 ? <details className="mt-3 text-sm"><summary className="min-h-11 cursor-pointer py-3">{u(locale,"View all available combinations")}</summary><ul className="m-0 flex list-none flex-col gap-1 p-0">{members.map(member=><li key={member._id}><Link className="flex min-h-11 items-center justify-between gap-3 rounded-full border px-3 py-2" href={productHref(member)} prefetch={false} aria-current={member._id===product._id?'page':undefined}><span>{productOptionLabel(member)}{member.stock===0?' · '+u(locale,'Out of stock'):''}</span><span className="shrink-0 text-xs">{money(displayPrice(member),locale)}</span></Link></li>)}</ul></details> : null}
    <p className="mt-3 mb-0 border-t pt-3 text-xs leading-relaxed">{locale === "en" ? "Selected: " : "الخيار المحدد: "}{productOptionLabel(product)} · {money(displayPrice(product),locale)}</p>
  </section>;
}
