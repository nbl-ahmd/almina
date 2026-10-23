import { GrowthActivity } from './growth-activity';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { campaignState,growthPagePath,type GrowthPage } from '@almina/contracts';
import { getGrowthPage } from '../lib/server/growth';
import { getProductById, getProducts } from '../lib/server/catalog';
import { metadataFor } from '../lib/server/seo';
import { getWebEnvironment } from '../lib/server/env';
import { breadcrumbData } from '../lib/seo';
import { StructuredData } from './structured-data';
import { ProductGrid, Breadcrumb } from './storefront';
import { StorefrontIntro } from './storefront-intro';
import { BundleAdd } from './bundle-add';
const brands:Record<string,string>={cerave:'CeraVe',bioderma:'Bioderma',cetaphil:'Cetaphil',sebamed:'Sebamed','philips-avent':'Philips Avent',chicco:'Chicco',johnson:'Johnson',gum:'GUM',huggies:'Huggies',pampers:'Pampers'};
async function resolve(kind:GrowthPage['kind'],slug:string,locale='en') {
  const custom=await getGrowthPage(kind,slug,locale);
  if(custom)return custom;
  const name=kind==='brand'&&locale==='en'?brands[slug]:undefined;
  if(!name)return null;
  if(!(await getProducts({q:name})).products.length)return null;
  return {kind:'brand',slug,locale:'en',title:`${name} at Al Mina Pharmacy`,description:`Explore ${name} products, current AED prices and availability at Al Mina Pharmacy in Ras Al Khaimah.`,body:`Browse the available ${name} range below. Compare pack sizes and product details to find the option that suits your routine.\n\nEach product page includes its current price and available details. Check the packaging directions and ask the pharmacy if you need help choosing. Delivery charges and the final total are confirmed at checkout.`,image:'',imageAlt:'',mobileImage:'',homepagePlacement:'none',priority:0,ctaLabel:'',productIds:[],categories:[],faqs:[],published:true,healthContent:false,reviewer:'',startsAt:null,endsAt:null,bundle:false,bundleReason:'',terms:'',revision:0} satisfies GrowthPage;
}
export async function growthMetadata(kind:GrowthPage['kind'],slug:string,locale='en') {
  const page=await resolve(kind,slug,locale);if(!page)notFound();
  const metadata=metadataFor(page.title,page.description,growthPagePath(page),{});
  const other=await getGrowthPage(kind,slug,locale==='en'?'ar':'en');
  return {...metadata,...(other?{alternates:{...metadata.alternates,languages:{'en-AE':growthPagePath(locale==='en'?page:other),'ar-AE':growthPagePath(locale==='ar'?page:other)}}}:{})};
}
export async function GrowthLanding({kind,slug,locale='en'}:{kind:GrowthPage['kind'];slug:string;locale?:string}) {
  const page=await resolve(kind,slug,locale);if(!page)notFound();
  const state=campaignState(page);
  const selected=await Promise.all(page.productIds.slice(0,40).map(id=>getProductById(id)));
  const products=page.productIds.length?selected.filter(item=>item!==null):kind==='brand'?(await getProducts({q:brands[slug]||page.title.replace(/ at Al Mina Pharmacy$/,'')})).products:[];
  const origin=getWebEnvironment().WEB_ORIGIN;
  return <GrowthActivity kind="campaign" campaign={kind==='campaign'&&state==='active'&&!page.healthContent?slug:undefined}><article lang={locale} dir={locale==='ar'?'rtl':'ltr'} className="space-y-6"><StructuredData data={breadcrumbData(origin,[{name:'Home',path:'/'},{name:page.title,path:growthPagePath(page)}])} /><Breadcrumb title={page.title} /><StorefrontIntro title={page.title} description={page.description} artwork={kind==='brand'?'none':'care'} />
    {page.image?<Image src={page.image} alt={page.imageAlt} width={1400} height={500} sizes="100vw" className="h-auto max-h-96 w-full rounded-2xl object-contain" />:null}
    {kind==='campaign'&&state!=='active'?<div role="status" className="rounded-2xl bg-subtle p-5"><h2 className="mb-2 text-xl">{locale==='ar'?(state==='ended'?'انتهت هذه العروض':'العروض قريباً'):(state==='ended'?'These offers have ended':'Coming soon')}</h2><p className="mb-0 text-sm">{locale==='ar'?'تصفح المنتجات والعروض المتاحة حالياً.':'This page stays available for reference. Explore our current range and offers.'}</p><Link className="inline-flex min-h-11 items-center text-teal" href="/offers">{locale==='ar'?'العروض الحالية':'View current offers'}</Link></div>:null}
    {page.categories.length?<nav className="flex flex-wrap gap-2" aria-label="Explore this collection">{page.categories.map(item=><Link key={item.href} className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-4 text-sm" href={item.href}>{item.label}</Link>)}</nav>:null}
    <div className="max-w-prose space-y-4 text-sm leading-7 text-muted">{page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>
    {kind==='collection'&&page.bundle&&products.length?<section className="rounded-2xl bg-subtle p-5"><h2 className="mb-2 text-2xl">{locale==='ar'?'مجموعة مختارة':'Curated together'}</h2><p className="mb-4 text-sm leading-7 text-muted">{page.bundleReason}</p><BundleAdd items={products.filter(item=>item.stock>0).map(item=>({id:item._id,name:item.name,stock:item.stock}))} /><p className="mb-0 mt-3 text-xs text-muted">{locale==='ar'?'اختيار فريق الصيدلية. تطبق الأسعار الحالية والتوفر عند الدفع.':'Chosen by the pharmacy team. Standard prices and current availability apply at checkout.'}</p></section>:null}
    {products.length&&(kind!=='campaign'||state==='active')?<section><h2 className="mb-4 text-2xl">{locale==='ar'?'تسوق المنتجات':'Shop the range'}</h2><ProductGrid products={products} headingLevel={3} /></section>:null}
    {page.faqs.length?<section className="max-w-3xl"><h2 className="mb-4 text-2xl">{locale==='ar'?'أسئلة شائعة':'Helpful answers'}</h2>{page.faqs.map(faq=><details key={faq.question} className="border-b border-border py-2"><summary className="min-h-11 cursor-pointer py-3 font-medium">{faq.question}</summary><p className="text-sm leading-7 text-muted">{faq.answer}</p></details>)}</section>:null}
    {page.terms?<section className="rounded-2xl bg-subtle p-5"><h2 className="mb-3 text-lg">{locale==='ar'?'الشروط':'Offer terms'}</h2><p className="mb-0 whitespace-pre-wrap text-sm leading-6 text-muted">{page.terms}</p></section>:null}
    {page.reviewer?<p className="text-xs text-muted">{locale==='ar'?'تمت المراجعة بواسطة':'Reviewed by'} {page.reviewer}</p>:null}
  </article></GrowthActivity>;
}
export { brands as knownGrowthBrands };
