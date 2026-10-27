import { ObjectId,type Document } from 'mongodb';
import { searchDocument } from '../../../apps/api/src/modules/search/enrichment';
export const categoryId=new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');
const names=[['CeraVe Moisturising Cream 454g','CeraVe','cream','moisturizer',75],['CeraVe Foaming Cleanser 236ml','CeraVe','foam','cleanser',65],['Cetaphil Moisturizing Cream 500g','Cetaphil','cream','moisturizer',55],['Bioderma Atoderm Cream','Bioderma','cream','moisturizer',110],['Pampers Premium Care Size 4','Pampers','','diaper',45],['Accu-Chek Instant Blood Glucose Monitor','Accu-Chek','','glucose monitor',120],["Johnson's Baby Shampoo 500ml","Johnson's",'liquid','shampoo',25],['Daily Sunscreen SPF 50','Care Brand','cream','sunscreen',40],['Everyday Baby Wipes','Care Brand','','wipe',12]] as const;
export const searchProducts:Document[]=names.map(([name,brand,form,kind,price],i)=>{
 const _id=new ObjectId((i+1).toString(16).padStart(24,'0'));
 const row:Document={_id,product_id:`PD${1945+i}`,barcode:`62911012345${i}0`,name,brand,productForm:form,price,stock:20,category:categoryId,
 productType:'general',contentReviewed:true,published:true,disabled:false,active:true,audience:'retail',
 searchEnrichment:{productId:String(_id),aliases:[],searchKeywords:[],concerns:kind==='moisturizer'?['dry skin']:[],useCases:[],features:[],audience:i===4||i===6||i===8?'baby':'',bodyArea:'',productKind:kind,provenance:'verified',reviewed:true,version:1}};
 row.searchDocument=searchDocument(row,'Personal Care');return row;
});
export const withCategory=(row:Document):Document=>({...row,category:{_id:categoryId,name:'Personal Care'}});
/** Atlas response fixtures, NOT a full-text search emulator. Real retrieval is covered by the opt-in Atlas suite. */
export const lexicalFixtures:Record<string,number[]>={cerave:[0,1],'cerave cream':[0],'cerave moistrizer':[0],cetaphill:[2],
 'cream for dry skin':[0,2,3],'dry skin cream':[0,2,3],'sun cream':[7],sunscreen:[7],nappy:[4],diaper:[4],
 'sugar checking machine':[5],'glucose monitor':[5],'baby shampoo 900ml':[],"johnsons baby shampoo":[6],'baby shampoo':[6],'pampers size 4':[4],'products under 50':[4,6,7,8],PD1945:[0],'6291101234500':[0],'واقي الشمس':[7],'baby care':[4,6,8]};
export const goldenQueries=Object.entries(lexicalFixtures).map(([query,indices])=>({query,expectedProducts:(query==='baby shampoo 900ml'?[6]:indices).map(i=>searchProducts[i]!.product_id as string)}));
