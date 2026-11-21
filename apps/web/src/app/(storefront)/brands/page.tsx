import Link from '../../../components/app-link';
import { knownGrowthBrands } from '../../../components/growth-landing';
import { StorefrontIntro } from '../../../components/storefront-intro';
import { metadataFor } from '../../../lib/server/seo';
import { getProducts } from '../../../lib/server/catalog';
export function generateMetadata(){return metadataFor('Shop pharmacy brands','Explore skincare, baby and personal care brands at Al Mina Pharmacy in Ras Al Khaimah.','/brands',{});}
export default async function BrandsPage(){const available=await Promise.all(Object.entries(knownGrowthBrands).map(async([slug,name])=>({slug,name,available:(await getProducts({q:name})).products.length>0})));return <><StorefrontIntro title="Find your familiar brands" description="Explore the brands currently available at Al Mina. Compare products, pack sizes and prices." /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{available.filter(item=>item.available).map(item=><Link key={item.slug} href={'/brands/'+item.slug} className="flex min-h-28 items-center rounded-2xl border bg-white p-5 text-lg font-medium">{item.name}</Link>)}</div></>;}
