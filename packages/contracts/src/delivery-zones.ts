import { z } from 'zod';
export const deliveryPointSchema = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).strict();
export type DeliveryPoint = z.infer<typeof deliveryPointSchema>;
const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
type Position = [number, number];
function cross(a: Position, b: Position, c: Position) { return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); }
function on(a: Position,b: Position,p: Position) { return Math.abs(cross(a,b,p))<1e-12 && p[0]>=Math.min(a[0],b[0]) && p[0]<=Math.max(a[0],b[0]) && p[1]>=Math.min(a[1],b[1]) && p[1]<=Math.max(a[1],b[1]); }
function intersects(a: Position,b: Position,c: Position,d: Position) { return (cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b); }
function inside(p: Position,ring: Position[]) { let hit=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i]!,b=ring[j]!;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit; }
export function validDeliveryPolygon(rings: Position[][]) {
  if (!rings.length || rings.length>6) return false;
  for (let r=0;r<rings.length;r++) {
    const ring=rings[r]!; if(ring.length<4||ring.length>201||ring[0]![0]!==ring.at(-1)![0]||ring[0]![1]!==ring.at(-1)![1])return false;
    if(new Set(ring.slice(0,-1).map(p=>p.join(','))).size!==ring.length-1)return false;
    const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);if(Math.max(...xs)-Math.min(...xs)>10||Math.max(...ys)-Math.min(...ys)>10)return false;
    let area=0;for(let i=0;i<ring.length-1;i++){const a=ring[i]!,b=ring[i+1]!;area+=a[0]*b[1]-b[0]*a[1];for(let j=i+1;j<ring.length-1;j++){if(j===i+1||(i===0&&j===ring.length-2))continue;if(intersects(a,b,ring[j]!,ring[j+1]!))return false;}}if(Math.abs(area)<1e-10)return false;
    if(r>0&&!inside(ring[0]!,rings[0]!))return false;
    for(let previous=0;previous<r;previous++){const other=rings[previous]!;for(let i=0;i<ring.length-1;i++)for(let j=0;j<other.length-1;j++)if(intersects(ring[i]!,ring[i+1]!,other[j]!,other[j+1]!))return false;if(previous>0&&(inside(ring[0]!,other)||inside(other[0]!,ring)))return false;}
  }return true;
}
export const deliveryPolygonSchema = z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(coordinate).min(4).max(201)).min(1).max(6) }).strict().refine(value=>validDeliveryPolygon(value.coordinates),'Use closed, non-crossing polygons with valid interior holes.');
export type DeliveryPolygon = z.infer<typeof deliveryPolygonSchema>;
const minor = z.number().int().nonnegative().max(10000000);
export const deliveryZoneSchema = z.object({ id:z.uuid(), revision:z.number().int().nonnegative(), name:z.string().trim().min(2).max(100), active:z.boolean(),
  color:z.string().regex(/^#[a-f0-9]{6}$/i), geometry:deliveryPolygonSchema, priority:z.number().int().min(0).max(1000),
  branches:z.array(z.object({branchId:z.uuid(),priority:z.number().int().min(0).max(1000)}).strict()).min(1).max(20).refine(rows=>new Set(rows.map(row=>row.branchId)).size===rows.length),
  deliveryFeeMinor:minor, minimumOrderMinor:minor, estimatedMinutes:z.number().int().min(5).max(10080),
}).strict();
export type DeliveryZone = z.infer<typeof deliveryZoneSchema>;
export const zoneDeliverySchema=z.object({branchId:z.uuid(),branchName:z.string(),zoneId:z.uuid(),zoneName:z.string(),zoneRevision:z.number().int().nonnegative(),estimatedMinutes:z.number().int().positive()}).strict();
export type ZoneDelivery = z.infer<typeof zoneDeliverySchema>;
export const zoneSettingsSchema=z.object({active:z.boolean(),revision:z.number().int().nonnegative()}).strict();
