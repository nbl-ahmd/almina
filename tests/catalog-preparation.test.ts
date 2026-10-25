import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validGtin, productContentSchema, publicationIssues, storePublicationIssues } from '@almina/contracts';
import { parseCatalogImport } from '../apps/api/src/modules/catalog/import';
import { feedProduct,feedCsv,feedXml,feedIssues } from '../apps/web/src/lib/catalog/feed';
import { productData,pageMetadata } from '../apps/web/src/lib/seo';
const item={_id:'a'.repeat(24),product_id:'PD1',name:'Example shampoo 100 ml',price:10.5,stock:3,category:{_id:'b'.repeat(24),name:'Hair care'},brand:'Example',description:'Verified product description',saleUnit:'One bottle',packLabel:'100 ml',productType:'general' as const,condition:'new' as const,contentReviewed:true,stockVerified:true,imageRights:'authorized' as const,cloudinaryImages:['https://res.cloudinary.com/example/image/upload/v1/product.webp'],googleApproved:true,metaApproved:true,identifierStatus:'not-assigned' as const};
test('incomplete ERP identities cannot publish even when review flags are checked',()=>{
  for(const name of ['...Mxmn','…Vmx','S','***VitaSpray',''])assert.ok(publicationIssues({...item,name}).includes('Complete product name / identity'));
  assert.ok(publicationIssues({...item,productType:'prescription'}).some(issue=>issue.startsWith('Product classification')));
  assert.ok(publicationIssues({...item,productType:'unreviewed'}).some(issue=>issue.startsWith('Product classification')));
});
test('honest missing-photo store listings retain medical gates and stay excluded from advertising feeds',()=>{
  const noPhoto={...item,brand:'',cloudinaryImages:[],imageRights:'unreviewed' as const};
  assert.deepEqual(storePublicationIssues(noPhoto),[]);
  assert.ok(publicationIssues(noPhoto).includes('Product image'));
  assert.equal(feedProduct('https://shop.example.invalid',noPhoto,[],'google'),null);
  for(const productType of ['unreviewed','prescription'])assert.ok(storePublicationIssues({...noPhoto,productType}).some(issue=>issue.startsWith('Product classification')));
  assert.ok(storePublicationIssues({...noPhoto,name:'...Mxmn'}).includes('Complete product name / identity'));
  assert.ok(storePublicationIssues({...noPhoto,cloudinaryImages:item.cloudinaryImages}).includes('Image usage permission'));
});
test('verified GTINs retain leading zeroes and reject invalid check digits; missing barcode is not a GTIN',()=>{
  assert.equal(validGtin('00012345600012'),true);assert.equal(validGtin('00012345600013'),false);
  assert.equal(productContentSchema.safeParse({gtin:'',brand:'Example'}).success,true);
  assert.equal(productContentSchema.safeParse({gtin:'bad'}).success,false);
  assert.equal(productContentSchema.safeParse({imageSource:'https://user:pass@example.invalid/photo.jpg'}).success,false);
});
test('catalog import parses 7k bounded rows literally without formula evaluation or prototype headers',()=>{
  const content='sourceKey,name\r\n'+Array.from({length:7137},(_,index)=>`source-${index},"Product, ${index}"`).join('\r\n');
  const rows=parseCatalogImport(content,'csv') as Record<string,string>[];assert.equal(rows.length,7137);assert.equal(rows[3]!.name,'Product, 3');
  assert.throws(()=>parseCatalogImport('sourceKey,__proto__\na,b','csv'));
  assert.throws(()=>parseCatalogImport('sourceKey,sourceKey\na,b','csv'));
  assert.throws(()=>parseCatalogImport('sourceKey,name\na,b,c','csv'));
});
test('channel feeds use SKU IDs, exact images, gross prices and platform-specific stock values',()=>{
  assert.deepEqual(publicationIssues(item),[]);
  const google=feedProduct('https://shop.example.invalid',item,item.cloudinaryImages,'google')!;
  const meta=feedProduct('https://shop.example.invalid',{...item,stock:0},item.cloudinaryImages,'meta')!;
  assert.equal(google.id,'PD1');assert.equal(google.price,'10.50 AED');assert.equal(google.availability,'in_stock');assert.equal(google.identifier_exists,'no');
  assert.equal(meta.availability,'out of stock');assert.equal(google.gtin,'');assert.equal(google.image_link,item.cloudinaryImages[0]);
  assert.ok(feedXml('https://shop.example.invalid',[{...google,title:'A & B <test>'}]).includes('A &amp; B &lt;test&gt;'));
  const shippingXml=feedXml('https://shop.example.invalid',[google],{feeMinor:1000,currency:'AED'});
  assert.ok(shippingXml.includes('<g:price>10.00 AED</g:price>'));
  assert.ok(shippingXml.includes('<g:max_transit_time>5</g:max_transit_time>'));
  assert.ok(!feedXml('https://shop.example.invalid',[google]).includes('<g:shipping>'));
  assert.ok(feedCsv([{...meta,description:'=HYPERLINK("bad")'}]).includes("'=HYPERLINK"));
  assert.equal(feedProduct('https://shop.example.invalid',{...item,googleApproved:false},item.cloudinaryImages,'google'),null);
  assert.equal(feedProduct('https://shop.example.invalid',{...item,productType:'otc'},item.cloudinaryImages,'meta'),null);
  assert.equal(feedProduct('https://shop.example.invalid',{...item,identifierStatus:'unknown'},item.cloudinaryImages,'google'),null);
  assert.ok(feedIssues(item,'google',[]).includes('Public HTTPS product image'));
});
test('pagination is self-canonical while search/filter and invalid pagination remain excluded',()=>{
  const googleBot={index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1};
  const meta=pageMetadata('https://shop.example.invalid',true,'Hair care','Description','/categories/hair',{page:'2'});
  assert.deepEqual(meta.alternates,{canonical:'https://shop.example.invalid/categories/hair?page=2'});assert.deepEqual(meta.robots,{index:true,follow:true,googleBot});
  assert.deepEqual(pageMetadata('https://shop.example.invalid',true,'Hair','D','/products',{page:'bad'}).robots,{index:false,follow:true,googleBot:{...googleBot,index:false}});
  assert.deepEqual(pageMetadata('https://shop.example.invalid',true,'Hair','D','/products',{page:'2',q:'cream'}).robots,{index:false,follow:true,googleBot:{...googleBot,index:false}});
  assert.deepEqual(pageMetadata('https://shop.example.invalid',true,'Item','D','/products/item--PD1',{page:'2'}).robots,{index:false,follow:true,googleBot:{...googleBot,index:false}});
  const data=productData('https://shop.example.invalid',item,item.cloudinaryImages,[],{},null);
  assert.equal(data.offers.availability,'https://schema.org/InStock');assert.equal(data.brand!.name,'Example');
});

test('production feed response is gated, paginated and fails closed on outages, duplicate IDs and invalid cursors',async()=>{
  const {catalogFeedResponse}=await import('../apps/web/src/lib/catalog/feed-response');
  const config={production:true,enabled:true,checkoutEnabled:true,origin:'https://shop.example.invalid'};
  const image=()=>item.cloudinaryImages;
  const page=async()=>({products:[item],nextCursor:null,storeOpen:true,policyReady:true});
  const google=await catalogFeedResponse('google.xml',config,page,image);assert.equal(google.status,200);assert.ok((await google.text()).includes('<g:price>10.50 AED</g:price>'));
  const meta=await catalogFeedResponse('meta.csv',config,page,image);assert.equal(meta.status,200);assert.ok((await meta.text()).includes('"in stock"'));assert.equal(meta.headers.get('Cache-Control'),'no-store');
  for(const patch of [{production:false},{enabled:false},{checkoutEnabled:false}])assert.equal((await catalogFeedResponse('google.xml',{...config,...patch},page,image)).status,404);
  assert.equal((await catalogFeedResponse('other.xml',config,page,image)).status,404);
  assert.equal((await catalogFeedResponse('google.xml',config,async()=>{throw new Error('Private upstream detail');},image)).status,503);
  assert.equal((await catalogFeedResponse('google.xml',config,async()=>({...await page(),storeOpen:false}),image)).status,503);
  let calls=0;
  const repeated=await catalogFeedResponse('google.xml',config,async()=>({...await page(),nextCursor:calls++===0?'c'.repeat(24):null}),image);assert.equal(repeated.status,503);
  calls=0;
  const paged=await catalogFeedResponse('google.xml',config,async()=>({products:[{...item,product_id:`PD${++calls}`}],nextCursor:calls===1?'c'.repeat(24):null,storeOpen:true,policyReady:true}),image);assert.equal(paged.status,200);assert.equal((await paged.text()).split('<item>').length-1,2);
});
