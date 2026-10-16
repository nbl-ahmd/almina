import {readProduct,type Product} from './model';
import {feedProduct,feedXml,feedCsv,type FeedChannel} from './feed';
export async function catalogFeedResponse(channel:string,config:{production:boolean;enabled:boolean;checkoutEnabled:boolean;origin:string},readPage:(channel:FeedChannel,cursor?:string)=>Promise<unknown>,images:(product:Product)=>string[]){
  if(!config.production||!config.enabled||!config.checkoutEnabled||!['google.xml','meta.csv'].includes(channel))return new Response('Not found',{status:404});
  const seen=new Set<string>();
  const kind=channel==='google.xml'?'google':'meta',rows:Record<string,string>[]=[];let cursor:string|undefined;let scanned=0;
  try{do{
    const value=await readPage(kind,cursor);
    if(!value||typeof value!=='object'||!('products'in value)||!Array.isArray(value.products)||!('storeOpen'in value)||value.storeOpen!==true||!('policyReady'in value)||value.policyReady!==true||!('nextCursor'in value))throw new Error('Export not ready');
    scanned+=value.products.length;if(scanned>20000)throw new Error('Export bound exceeded');
    for(const raw of value.products){const product=readProduct(raw);if(!product)throw new Error('Invalid export product');const row=feedProduct(config.origin,product,images(product).filter(image=>!image.startsWith('/')),kind);if(row){if(seen.has(row.id!))throw new Error('Duplicate feed ID');seen.add(row.id!);rows.push(row);}}
    const next=value.nextCursor;if(next!==null&&(typeof next!=='string'||!/^[a-f0-9]{24}$/i.test(next)||(cursor!==undefined&&next<=cursor)))throw new Error('Invalid cursor');cursor=next??undefined;
    if(rows.length>20000)throw new Error('Export bound exceeded');
  }while(cursor);
  return new Response(kind==='google'?feedXml(config.origin,rows):feedCsv(rows),{headers:{'Content-Type':kind==='google'?'application/xml; charset=utf-8':'text/csv; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  }catch{return new Response('Catalog feed temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'300'}});}
}
