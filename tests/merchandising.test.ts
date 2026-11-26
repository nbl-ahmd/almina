import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bannerDestination, catalogueBrands, sitemapBrands, collectionProducts, findCollection, uniqueProducts, prioritizeShelf } from '../apps/web/src/lib/catalog/merchandising';
import type { Product } from '../apps/web/src/lib/catalog/model';
const base:Product={_id:'aaaaaaaaaaaaaaaaaaaaaaaa',product_id:'PD1',name:'Sebamed Body Wash',category:{_id:'bbbbbbbbbbbbbbbbbbbbbbbb',name:'Personal Care'},price:60,stock:3};
test('price-point collection uses active sale price and excludes unavailable or hidden products',()=>{
  const collection=findCollection('under-50')!;
  assert.deepEqual(collectionProducts(collection,[base]),[]);
  assert.equal(collectionProducts(collection,[{...base,sale:true,salePrice:45}]).length,1);
  assert.equal(collectionProducts(collection,[{...base,sale:false,salePrice:45}]).length,0);
  for(const patch of [{stock:0},{disabled:true},{category:{...base.category,disabled:true}}]) assert.equal(collectionProducts(collection,[{...base,price:40,...patch}]).length,0);
});
test('collection boundaries and duplicate products remain explicit',()=>{
  const skin=findCollection('skin-essentials')!;
  assert.equal(collectionProducts(skin,[base]).length,0);
  assert.equal(collectionProducts(skin,[{...base,name:'CeraVe Cleanser'}]).length,1);
  assert.equal(uniqueProducts([base,base]).length,1);
  assert.equal(findCollection('arbitrary-input'),undefined);
});
test('banner destinations preserve safe admin links without executable or protocol-relative URLs',()=>{
  assert.equal(bannerDestination('/collections/skin-essentials'),'/collections/skin-essentials');
  assert.equal(bannerDestination('https://example.com/sale'),'https://example.com/sale');
  for(const value of ['javascript:alert(1)','//evil.example','/\\evil.example','http://example.com','https://user:pass@example.com','/offers\n',undefined]) assert.equal(bannerDestination(value),null);
});
test('brand navigation uses explicit brand or recognizable pack name, not invented logos',()=>{
  assert.deepEqual(catalogueBrands([base,base]),['Sebamed']);
  assert.deepEqual(catalogueBrands([{...base,name:'Unknown care'}]),[]);
  assert.deepEqual(catalogueBrands([{...base,stock:0}]),[]);
});

test('the sitemap lists every brand with enough stock, not just the eight-brand shelf',()=>{
  let next=0;const items=(brand:string,count:number,stock=3)=>Array.from({length:count},(_,i)=>({...base,_id:(next++).toString(16).padStart(24,'0'),name:`${brand} item ${i}`,brand,stock}));
  const many=Array.from({length:12},(_,i)=>items(`Brand${String.fromCharCode(65+i)}`,3)).flat();
  assert.equal(catalogueBrands(many).length,8);
  assert.equal(sitemapBrands(many).length,12);
  assert.deepEqual(sitemapBrands([...items('Thin',2),...items('Full',3)]),['Full']);
  assert.deepEqual(sitemapBrands(items('Gone',3,0)),[]);
  assert.deepEqual(sitemapBrands(items('Thin',2),2),['Thin']);
});

test('small shopping collections survive overlap while fresh products lead',()=>{
  const other={...base,_id:'cccccccccccccccccccccccc',name:'Another product'};
  assert.deepEqual(prioritizeShelf([base], [base]), [base]);
  assert.deepEqual(prioritizeShelf([base,other,base], [base]), [other,base]);
});
