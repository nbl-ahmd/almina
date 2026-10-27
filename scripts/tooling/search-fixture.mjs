import {randomUUID} from 'node:crypto';
// Synthetic transport fixtures for storefront behavior. This is deliberately not
// an Atlas retrieval emulator and supplies no evidence of live search relevance.
export function searchFixtureResponse(url,products,category){
 const q=url.searchParams.get('q')??'',normalized=q.toLowerCase(),correction=normalized==='dailyy'&&url.searchParams.get('literal')!=='true'?'Daily Care':null,relaxed=normalized==='daily care 900ml';
 let rows=products.filter(p=>((normalized==='dailyy'&&url.searchParams.get('literal')!=='true'||relaxed)&&p.product_id==='PD0001')||normalized==='بشرة'||normalized==='under 50'||p.name.toLowerCase().includes(normalized)||category.name.toLowerCase().includes(normalized));
 const min=Number(url.searchParams.get('minPrice')??0),max=Number(url.searchParams.get('maxPrice')??999999);
 const price=p=>p.sale&&p.salePrice>=0&&p.salePrice<=p.price?p.salePrice:p.price;
 rows=rows.filter(p=>price(p)>=min&&price(p)<=max&&(!url.searchParams.get('inStock')||p.stock>0));
 if(url.searchParams.get('sort')==='price-asc')rows.sort((a,b)=>price(a)-price(b));
 if(url.searchParams.get('sort')==='price-desc')rows.sort((a,b)=>price(b)-price(a));
 const page=Number(url.searchParams.get('page')??1),limit=Number(url.searchParams.get('limit')??30);
 const suggestions={products:rows.slice(0,6).map(p=>({name:p.name,href:`/products/daily-care--${p.product_id}`})),categories:category.name.toLowerCase().includes(normalized)||normalized==='بشرة'?[{name:category.name,href:`/categories/skin-care--${category._id}`}]:[],brands:normalized.startsWith('daily')?[{name:'Synthetic Care',href:'/search?q=Daily+Care'}]:[],collections:[],popular:[],related:[],unavailable:normalized==='unavailable'};
 if(url.pathname.endsWith('/suggest'))return {data:suggestions,requestId:randomUUID()};
 return {requestId:randomUUID(),data:{searchId:randomUUID(),query:q,normalizedQuery:normalized,interpretedQuery:relaxed?'daily care':normalized,interpretation:{concerns:[]},correction,relaxed,unavailable:normalized==='unavailable',products:rows.slice((page-1)*limit,page*limit),categories:suggestions.categories,brands:suggestions.brands,collections:[],querySuggestions:rows.length?[]:[{name:'Daily Care',href:'/search?q=Daily+Care'}],alternatives:[],facets:{scope:'bounded-relevant-candidates',categories:rows.length?[{value:category.name,count:rows.length}]:[],brands:[],forms:[],sizes:[],audiences:[],bodyAreas:[],concerns:[],features:[],inStock:rows.filter(p=>p.stock>0).length,price:rows.length?{min:Math.min(...rows.map(price)),max:Math.max(...rows.map(price))}:null},pagination:{page,hasNext:rows.length>page*limit,resultCount:rows.length,bounded:false}}};
}
