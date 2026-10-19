import type { Db,Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';

const querySchema=z.object({days:z.coerce.number().int().refine(value=>[7,30,90].includes(value))}).strict();
const emptySummary=()=>({orders:0,revenueMinor:0,averageOrderMinor:0,completed:0,cancelled:0});

/** Aggregated commerce reporting. Customer and delivery PII never leaves this module. */
export async function growthMetrics(db:Db,raw:unknown,now=new Date()){
 const parsed=querySchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
 const days=parsed.data.days,period=days*86400000,end=new Date(now),start=new Date(end.getTime()-period),previousStart=new Date(start.getTime()-period);
 const base={schemaVersion:2,createdAt:{$gte:start,$lt:end}};
 const previous={schemaVersion:2,createdAt:{$gte:previousStart,$lt:start}};
 const aggregate=(filter:Record<string,unknown>)=>db.collection('orders').aggregate<Document>([
  {$match:filter},{$group:{_id:null,orders:{$sum:1},revenueMinor:{$sum:{$ifNull:['$totals.totalMinor',0]}},completed:{$sum:{$cond:[{$eq:['$status','dispatched']},1,0]}},cancelled:{$sum:{$cond:[{$eq:['$status','cancelled']},1,0]}}}},
 ],{maxTimeMS:5000}).toArray();
 const cohortStart=new Date(end.getTime()-90*86400000);
 const [currentRows,previousRows,dailyRows,topRows,cohortRows]=await Promise.all([
  aggregate(base),aggregate(previous),
  db.collection('orders').aggregate<Document>([{$match:base},{$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},orders:{$sum:1},revenueMinor:{$sum:{$ifNull:['$totals.totalMinor',0]}}}},{$sort:{_id:1}}],{maxTimeMS:5000}).toArray(),
  db.collection('orders').aggregate<Document>([{$match:base},{$unwind:'$totals.lines'},{$group:{_id:{productId:'$totals.lines.productId',name:'$totals.lines.name'},quantity:{$sum:{$ifNull:['$totals.lines.quantity',0]}},revenueMinor:{$sum:{$ifNull:['$totals.lines.lineTotalMinor',0]}}}},{$sort:{quantity:-1,revenueMinor:-1}},{$limit:8}],{maxTimeMS:5000}).toArray(),
  db.collection('orders').aggregate<Document>([
   {$match:{schemaVersion:2,status:'dispatched',createdAt:{$gte:cohortStart,$lt:end}}},
   {$set:{_customerKey:{$ifNull:['$customerEmailKey',{$cond:[{$eq:[{$type:'$customer.email'},'string']},{$toLower:'$customer.email'},null]}]}}},
   {$match:{_customerKey:{$type:'string',$ne:''}}},
   {$group:{_id:'$_customerKey',firstFulfilledOrder:{$min:'$createdAt'},fulfilledOrders:{$sum:1}}},
   {$group:{_id:{$dateToString:{format:'%Y-%m',date:'$firstFulfilledOrder',timezone:'UTC'}},customers:{$sum:1},repeatCustomers:{$sum:{$cond:[{$gt:['$fulfilledOrders',1]},1,0]}},repeatOrders:{$sum:{$max:[0,{$subtract:['$fulfilledOrders',1]}]}}}},
   {$sort:{_id:1}},{$project:{_id:0,month:'$_id',customers:1,repeatCustomers:1,repeatOrders:1}},
  ],{maxTimeMS:5000}).toArray(),
 ]);
 const summarize=(row?:Document)=>row?{orders:Number(row.orders)||0,revenueMinor:Number(row.revenueMinor)||0,averageOrderMinor:row.orders?Math.round(Number(row.revenueMinor)/Number(row.orders)):0,completed:Number(row.completed)||0,cancelled:Number(row.cancelled)||0}:emptySummary();
 const byDay=new Map(dailyRows.map(row=>[String(row._id),{orders:Number(row.orders),revenueMinor:Number(row.revenueMinor)}]));
 const daily=Array.from({length:days},(_,index)=>{const date=new Date(start.getTime()+index*86400000),key=date.toISOString().slice(0,10);return {date:key,...(byDay.get(key)??{orders:0,revenueMinor:0})};});
 return {days,from:start.toISOString(),to:end.toISOString(),current:summarize(currentRows[0]),previous:summarize(previousRows[0]),daily,
  topProducts:topRows.map(row=>({productId:String(row._id?.productId??''),name:String(row._id?.name??'Product'),quantity:Number(row.quantity)||0,revenueMinor:Number(row.revenueMinor)||0})),
  cohorts:cohortRows.map(row=>({month:String(row.month),customers:Number(row.customers)||0,repeatCustomers:Number(row.repeatCustomers)||0,repeatOrders:Number(row.repeatOrders)||0}))};
}
