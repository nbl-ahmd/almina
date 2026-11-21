import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from './app-link';
import styles from './product-detail.module.css';
import { optionFields, optionLabels, sameFamilyIdentity } from '@almina/contracts';
import { productHref, productOptionLabel, displayPrice, money, type Product } from '../lib/catalog/model';
export async function ProductOptions({ product, variants }: {product:Product;variants:Product[]}) {
  const locale = await getLocale();
  const members=variants.filter(member=>member.familyKey===product.familyKey&&sameFamilyIdentity(member,product));
  if (!product.familyKey||members.length<2) return null;
  return <section className={`product-options ${styles.options}`} aria-label={u(locale,"Product options")}><h2>{u(locale,"Choose your option")}</h2>
    {optionFields.filter(key=>product[key]).map(key=><fieldset key={key} className={styles.optionGroup}><legend className={styles.legend}>{u(locale,optionLabels[key])}</legend><div className={styles.choices}>{[...new Set(members.map(member=>member[key]).filter(Boolean))].map(value=>{
      const exact=members.find(member=>member[key]===value&&optionFields.every(other=>other===key||member[other]===product[other]));
      const target=exact;
      if (!target) return <span key={value} aria-disabled="true" className={styles.choice}><bdi>{value}</bdi><span className="text-xs">{u(locale,"Unavailable combination")}</span></span>;
      return <Link key={value} href={productHref(target)} prefetch={false} aria-current={target._id===product._id?'page':undefined} data-store-control="option" data-product-variant className={styles.choice}><bdi>{value}</bdi>{target.stock===0?<span className="text-xs text-muted">{u(locale,"Out of stock")}</span>:null}</Link>;
    })}</div></fieldset>)}
    {optionFields.filter(key=>product[key]).length > 1 ? <details className={styles.combinations}><summary className={styles.disclosure}>{u(locale,"View all available combinations")}</summary><ul className={styles.combinationList}>{members.map(member=><li key={member._id}><Link data-store-control="option" data-product-variant className={styles.choice} href={productHref(member)} prefetch={false} aria-current={member._id===product._id?'page':undefined}><span>{productOptionLabel(member)}{member.stock===0?' · '+u(locale,'Out of stock'):''}</span><span className={styles.combinationPrice}>{money(displayPrice(member),locale)}</span></Link></li>)}</ul></details> : null}
    <p className={styles.selection}>{locale === "en" ? "Selected: " : "الخيار المحدد: "}{productOptionLabel(product)} · {money(displayPrice(product),locale)}</p>
  </section>;
}
