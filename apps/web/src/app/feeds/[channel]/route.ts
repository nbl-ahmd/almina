import {getWebEnvironment} from '../../../lib/server/env';
import {productImages} from '../../../lib/server/catalog';
import {getShippingPolicy} from '../../../lib/server/growth';
import {lowestDeliveryFeeMinor} from '../../../lib/policies';
import {catalogFeedResponse} from '../../../lib/catalog/feed-response';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{channel:string}>}){
  const {channel}=await params,env=getWebEnvironment();
  const feeMinor=lowestDeliveryFeeMinor(await getShippingPolicy());
  return catalogFeedResponse(channel,{production:env.APP_ENV==='production',enabled:env.CATALOG_FEEDS_ENABLED,checkoutEnabled:env.CHECKOUT_ENABLED,origin:env.WEB_ORIGIN,
    ...(feeMinor===null?{}:{shipping:{feeMinor,currency:'AED'}})},async(kind,cursor)=>{
    const query=new URLSearchParams({channel:kind,...(cursor?{cursor}:{})});
    const response=await fetch(new URL(`/api/catalog-export/products?${query}`,env.LEGACY_API_ORIGIN),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Export unavailable');return response.json();
  },productImages);
}
