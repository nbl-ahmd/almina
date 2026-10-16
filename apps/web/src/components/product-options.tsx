import Link from 'next/link';
import { optionFields, optionLabels, sameFamilyIdentity } from '@almina/contracts';
import { productHref, productOptionLabel, displayPrice, money, type Product } from '../lib/catalog/model';
export function ProductOptions({ product, variants }: {product:Product;variants:Product[]}) {
  const members=variants.filter(member=>member.familyKey===product.familyKey&&sameFamilyIdentity(member,product));
  if (!product.familyKey||members.length<2) return null;
  return <section className="product-options mb-5 rounded-xl border border-border bg-white p-4" aria-label="Product options"><h2 className="mb-1 text-base">Choose your option</h2><p className="mb-4 text-xs text-ocean">{product.familyName}</p>
    {optionFields.filter(key=>product[key]).map(key=><fieldset key={key} className="m-0 mb-3 min-w-0 border-0 p-0 last:mb-0"><legend className="mb-2 text-xs font-semibold text-ocean">{optionLabels[key]}</legend><div className="flex flex-wrap gap-2">{[...new Set(members.map(member=>member[key]).filter(Boolean))].map(value=>{
      const exact=members.find(member=>member[key]===value&&optionFields.every(other=>other===key||member[other]===product[other]));
      const target=exact;
      if (!target) return <span key={value} aria-disabled="true" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-page px-3 py-2 text-sm text-muted">{value}<span className="text-[10px]">Unavailable combination</span></span>;
      return <Link key={value} href={productHref(target)} prefetch={false} aria-current={target._id===product._id?'page':undefined} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-page px-3 py-2 text-sm text-ocean hover:border-teal hover:text-teal aria-[current=page]:border-teal aria-[current=page]:bg-accent/40 aria-[current=page]:font-semibold">{value}{target.stock===0?<span className="text-[10px] text-muted">Out of stock</span>:null}</Link>;
    })}</div></fieldset>)}
    {optionFields.filter(key=>product[key]).length > 1 ? <details className="mt-3 text-sm text-ocean"><summary className="min-h-11 cursor-pointer py-3">View all available combinations</summary><ul className="m-0 flex list-none flex-col gap-1 p-0">{members.map(member=><li key={member._id}><Link className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:border-teal hover:text-teal" href={productHref(member)} prefetch={false} aria-current={member._id===product._id?'page':undefined}><span>{productOptionLabel(member)}{member.stock===0?' · Out of stock':''}</span><span className="shrink-0 text-xs">{money(displayPrice(member))}</span></Link></li>)}</ul></details> : null}
    <p className="mt-3 mb-0 border-t border-border pt-3 text-xs leading-relaxed text-ocean">Selected: {productOptionLabel(product)} · {money(displayPrice(product))}</p>
  </section>;
}
