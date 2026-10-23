import { z } from 'zod';
const count = z.number().int().nonnegative();
const money = count.max(Number.MAX_SAFE_INTEGER);
const summary = z.object({orders:count,revenueMinor:money,averageOrderMinor:money,completed:count,cancelled:count});
export const orderCostInputSchema = z.object({orderId:z.string().regex(/^[a-f0-9]{24}$/i),expectedRevision:count,
  productCostMinor:money,fulfilmentCostMinor:money,feesMinor:money}).strict();
export const orderCostViewSchema = z.object({orderId:z.string(),revision:count,recorded:z.boolean(),productCostMinor:money.nullable(),fulfilmentCostMinor:money.nullable(),feesMinor:money.nullable()});
export const growthMetricsResponseSchema = z.object({days:count,from:z.string(),to:z.string(),current:summary,previous:summary,
  daily:z.array(z.object({date:z.string(),orders:count,revenueMinor:money})),
  topProducts:z.array(z.object({productId:z.string(),name:z.string(),quantity:count,revenueMinor:money})),
  cohorts:z.array(z.object({month:z.string(),customers:count,repeatCustomers:count,repeatOrders:count})),
  economics:z.object({dispatchedOrders:count,costedOrders:count,taxUnknownOrders:count,netSalesMinor:money,recordedCostsMinor:money,contributionMinor:z.number().int().nullable()}),
  activity:z.array(z.object({event:z.string(),count})),campaigns:z.array(z.object({slug:z.string(),views:count,clicks:count})),
});
