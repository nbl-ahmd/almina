import { GrowthActivity } from './growth-activity';
import Image from 'next/image';
import Link from './app-link';
import { notFound } from 'next/navigation';
import { campaignImageUrl,campaignState,growthPagePath,type GrowthPage } from '@almina/contracts';
import { getGrowthPage } from '../lib/server/growth';
import { getProductById, getProducts } from '../lib/server/catalog';
import { metadataFor } from '../lib/server/seo';
import { getWebEnvironment } from '../lib/server/env';
import { breadcrumbData, collectionData, faqData } from '../lib/seo';
import { brandSlug } from '../lib/catalog/merchandising';
import { categoryHref, money, productHref, type Product } from '../lib/catalog/model';
import { StructuredData } from './structured-data';
import { ProductGrid, Breadcrumb } from './storefront';
import { StorefrontIntro } from './storefront-intro';
import { BundleAdd } from './bundle-add';
const brands:Record<string,string>={cerave:'CeraVe',bioderma:'Bioderma',cetaphil:'Cetaphil',sebamed:'Sebamed','philips-avent':'Philips Avent',chicco:'Chicco',johnson:'Johnson',gum:'GUM',huggies:'Huggies',pampers:'Pampers'};
const brandName=(product:Product)=>(product.brand||product.familyBrand||'').trim();
/** Facts only, from the live catalogue: how many products, which categories, the current price range. No claims about efficacy. */
function brandFacts(name:string,products:Product[]){
  const live=products.filter(item=>item.stock>0);
  const categories=[...new Map(products.map(item=>[item.category._id,item.category])).values()];
  const prices=live.map(item=>item.salePrice&&item.salePrice<item.price?item.salePrice:item.price).filter(value=>value>0);
  const list=(items:string[])=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
  const parts=[`Al Mina Pharmacy currently lists ${products.length} ${name} ${products.length===1?'product':'products'}${categories.length?` in ${list(categories.slice(0,4).map(item=>item.name))}`:''}${live.length<products.length?`, with ${live.length} in stock today`:''}.`];
  if(prices.length)parts.push(prices.length>1&&Math.min(...prices)!==Math.max(...prices)?`Current prices range from ${money(Math.min(...prices),'en')} to ${money(Math.max(...prices),'en')}.`:`The current price is ${money(prices[0]!,'en')}.`);
  parts.push('Each product page shows its pack size, current price and availability, and delivery charges and the final total are confirmed at checkout.');
  return {text:parts.join(' '),categories};
}
async function resolve(kind:GrowthPage['kind'],slug:string,locale='en') {
  const custom=await getGrowthPage(kind,slug,locale);
  if(custom)return custom;
  if(kind!=='brand'||locale!=='en')return null;
  // Curated names first; otherwise any brand that appears on a live catalogue product gets a landing page.
  let name=brands[slug];
  if(!name){
    // Search can miss punctuation ("Dolce & Gabbana"), so retry with the first word before giving up.
    for(const q of [slug.replace(/-/g,' '),slug.split('-')[0]!]){
      const found=(await getProducts({q}).catch(()=>({products:[]}))).products.find(item=>brandSlug(brandName(item))===slug);
      if(found){name=brandName(found);break;}
    }
  }
  if(!name)return null;
  if(!(await getProducts({q:name})).products.length)return null;
  return {kind:'brand',slug,locale:'en',title:name,description:`Explore ${name} products, current AED prices and availability at Al Mina Pharmacy in Ras Al Khaimah.`,body:`Browse the available ${name} range below. Compare pack sizes and product details to find the option that suits your routine.\n\nEach product page includes its current price and available details. Check the packaging directions and ask the pharmacy if you need help choosing. Delivery charges and the final total are confirmed at checkout.`,image:'',imageAlt:'',mobileImage:'',homepagePlacement:'none',priority:0,ctaLabel:'',heroLayout:'image',textTone:'dark',ctaHref:'',stripSlot:'home-middle',popupLayout:'card',productIds:[],categories:[],faqs:[],published:true,healthContent:false,reviewer:'',startsAt:null,endsAt:null,bundle:false,bundleReason:'',terms:'',revision:0} satisfies GrowthPage;
}
export async function growthMetadata(kind:GrowthPage['kind'],slug:string,locale='en') {
  const page=await resolve(kind,slug,locale);if(!page)notFound();
  // Generated brand pages (no staff page yet) use the search phrasing; staff pages keep the title they wrote.
  const generated=kind==='brand'&&page.revision===0;
  const metadata=metadataFor(generated?`${page.title} Products in Ras Al Khaimah`:page.title,page.description,growthPagePath(page),{});
  const other=await getGrowthPage(kind,slug,locale==='en'?'ar':'en');
  const english=locale==='en'?page:other;
  return {...metadata,...(other?{alternates:{...metadata.alternates,languages:{'en-AE':growthPagePath(locale==='en'?page:other),'ar-AE':growthPagePath(locale==='ar'?page:other),...(english?{'x-default':growthPagePath(english)}:{})}}}:{})};
}
export async function GrowthLanding({kind,slug,locale='en'}:{kind:GrowthPage['kind'];slug:string;locale?:string}) {
  const page=await resolve(kind,slug,locale);if(!page)notFound();
  const state=campaignState(page);
  const selected=await Promise.all(page.productIds.slice(0,40).map(id=>getProductById(id)));
  const brandLabel=kind==='brand'?(brands[slug]||page.title.replace(/ at Al Mina Pharmacy$/,'')):'';
  const searched=kind==='brand'&&!page.productIds.length?(await getProducts({q:brandLabel})).products:[];
  // A brand page lists that brand only; curated names whose products lack a brand field keep the search result.
  const exact=searched.filter(item=>brandSlug(brandName(item))===slug);
  // Only built-in names fall back to plain search results; a brand staff added shows its own products or none.
  const products=page.productIds.length?selected.filter(item=>item!==null):kind==='brand'?(exact.length?exact:brands[slug]?searched:[]):[];
  const facts=kind==='brand'&&products.length?brandFacts(brandLabel,products):null;
  const origin=getWebEnvironment().WEB_ORIGIN;
  return <GrowthActivity kind="campaign" campaign={kind==='campaign'&&state==='active'&&!page.healthContent?slug:undefined}><article lang={locale} dir={locale==='ar'?'rtl':'ltr'} className="space-y-6"><StructuredData data={breadcrumbData(origin,[{name:'Home',path:'/'},...(kind==='brand'?[{name:'Brands',path:'/brands'}]:[]),{name:page.title,path:growthPagePath(page)}])} />{kind==='brand'||kind==='category'||kind==='collection'?<StructuredData data={collectionData(origin,{name:page.title,description:page.description,path:growthPagePath(page)},products.map(item=>({name:item.name,href:productHref(item)})))} />:null}{faqData(page.faqs)?<StructuredData data={faqData(page.faqs)} />:null}<Breadcrumb title={page.title} /><StorefrontIntro title={page.title} description={page.description} />
    {kind==='brand'&&page.image&&campaignImageUrl(page.image,getWebEnvironment().CLOUDINARY_CLOUD_NAME)?<span className="brand-landing-logo"><Image src={campaignImageUrl(page.image,getWebEnvironment().CLOUDINARY_CLOUD_NAME)!} alt={page.imageAlt||`${page.title} logo`} width={240} height={240} sizes="120px" /></span>
      :page.image?<Image src={page.image} alt={page.imageAlt} width={1400} height={500} sizes="100vw" className="h-auto max-h-96 w-full rounded-2xl object-contain" />:null}
    {kind==='campaign'&&state!=='active'?<div role="status" className="rounded-2xl p-5"><h2 className="mb-2 text-xl">{locale==='ar'?(state==='ended'?'انتهت هذه العروض':'العروض قريباً'):(state==='ended'?'These offers have ended':'Coming soon')}</h2><p className="mb-0 text-sm">{locale==='ar'?'تصفح المنتجات والعروض المتاحة حالياً.':'This page stays available for reference. Explore our current range and offers.'}</p><Link className="inline-flex min-h-11 items-center" href="/offers">{locale==='ar'?'العروض الحالية':'View current offers'}</Link></div>:null}
    {page.categories.length?<nav className="flex flex-wrap gap-2" aria-label="Explore this collection">{page.categories.map(item=><Link key={item.href} className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 text-sm" href={item.href}>{item.label}</Link>)}</nav>:null}
    {facts?<section className="brand-facts" aria-label={`${brandLabel} at a glance`}><p className="m-0 max-w-prose text-sm leading-7">{facts.text}</p>{facts.categories.length?<nav className="mt-3 flex flex-wrap gap-2" aria-label={`${brandLabel} by category`}>{facts.categories.map(category=><Link key={category._id} className="qc-chip" href={categoryHref(category)}>{category.name}</Link>)}</nav>:null}</section>:null}
    {facts&&page.revision===0?null:<div className="max-w-prose space-y-4 text-sm leading-7">{page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>}
    {kind==='collection'&&page.bundle&&products.length?<section className="rounded-2xl p-5"><h2 className="mb-2 text-2xl">{locale==='ar'?'مجموعة مختارة':'Curated together'}</h2><p className="mb-4 text-sm leading-7">{page.bundleReason}</p><BundleAdd items={products.filter(item=>item.stock>0).map(item=>({id:item._id,name:item.name,stock:item.stock}))} /><p className="mb-0 mt-3 text-xs">{locale==='ar'?'اختيار فريق الصيدلية. تطبق الأسعار الحالية والتوفر عند الدفع.':'Chosen by the pharmacy team. Standard prices and current availability apply at checkout.'}</p></section>:null}
    {products.length&&(kind!=='campaign'||state==='active')?<section><h2 className="mb-4 text-2xl">{locale==='ar'?'تسوق المنتجات':'Shop the range'}</h2><ProductGrid products={products} headingLevel={3} /></section>:null}
    {page.faqs.length?<section className="max-w-3xl"><h2 className="mb-4 text-2xl">{locale==='ar'?'أسئلة شائعة':'Helpful answers'}</h2>{page.faqs.map(faq=><details key={faq.question} className="border-b py-2"><summary className="min-h-11 cursor-pointer py-3 font-medium">{faq.question}</summary><p className="text-sm leading-7">{faq.answer}</p></details>)}</section>:null}
    {page.terms?<section className="rounded-2xl p-5"><h2 className="mb-3 text-lg">{locale==='ar'?'الشروط':'Offer terms'}</h2><p className="mb-0 whitespace-pre-wrap text-sm leading-6">{page.terms}</p></section>:null}
    {page.reviewer?<p className="text-xs">{locale==='ar'?'تمت المراجعة بواسطة':'Reviewed by'} {page.reviewer}</p>:null}
  </article></GrowthActivity>;
}
export { brands as knownGrowthBrands };
