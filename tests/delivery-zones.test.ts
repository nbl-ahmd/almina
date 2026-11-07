import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { deliveryPolygonSchema, deliveryZoneSchema, customerInputSchema } from '@almina/contracts';
import { distanceMeters } from '../apps/api/src/modules/delivery/service';
import { accessPolicy,upstreamQuery } from '../apps/web/src/lib/admin/policy';
import { lookupPolicy } from '../apps/api/src/modules/auth/retained-policy';
const square=[[55,25],[56,25],[56,26],[55,26],[55,25]];
test('zones validate closed simple bounded polygons, holes and branch priorities',()=>{
 assert.ok(deliveryPolygonSchema.safeParse({type:'Polygon',coordinates:[square]}).success);
 for(const ring of [square.slice(0,-1),[[55,25],[56,26],[55,26],[56,25],[55,25]],[[55,25],[55,25],[56,26],[55,25]],[[181,25],[56,25],[56,26],[181,25]],[[55,25],[80,25],[80,26],[55,25]]])assert.equal(deliveryPolygonSchema.safeParse({type:'Polygon',coordinates:[ring]}).success,false);
 assert.ok(deliveryPolygonSchema.safeParse({type:'Polygon',coordinates:[square,[[55.2,25.2],[55.4,25.2],[55.4,25.4],[55.2,25.2]]]}).success);
 assert.equal(deliveryPolygonSchema.safeParse({type:'Polygon',coordinates:[square,[[54,24],[54.1,24],[54.1,24.1],[54,24]]]}).success,false);
 const branchId=randomUUID(),zone={id:randomUUID(),revision:0,name:'Synthetic zone',active:true,color:'#2563eb',priority:1,geometry:{type:'Polygon',coordinates:[square]},branches:[{branchId,priority:1}],deliveryFeeMinor:500,minimumOrderMinor:1000,estimatedMinutes:45};
 assert.ok(deliveryZoneSchema.safeParse(zone).success);assert.equal(deliveryZoneSchema.safeParse({...zone,branches:[...zone.branches,...zone.branches]}).success,false);assert.equal(deliveryZoneSchema.safeParse({...zone,deliveryFeeMinor:1.5}).success,false);
 assert.equal(distanceMeters({latitude:25,longitude:55},{latitude:25,longitude:55}),0);assert.ok(distanceMeters({latitude:25,longitude:55},{latitude:25.1,longitude:55})>11000);
});
test('coordinates are additive, finite and cannot carry caller-controlled branch or pricing data',()=>{
 const raw={name:'Synthetic',mobile:'0501234567',email:'synthetic@example.invalid',emirate:'Ras al-Khaimah',city:'Synthetic area',address:'Synthetic address',payment:'cash'};
 assert.ok(customerInputSchema.safeParse(raw).success);assert.ok(customerInputSchema.safeParse({...raw,coordinates:{latitude:25.7,longitude:55.9}}).success);
 for(const coordinates of [{latitude:NaN,longitude:55},{latitude:91,longitude:55},{latitude:25,longitude:181},{latitude:'25',longitude:55},{latitude:25,longitude:55,branchId:randomUUID()}])assert.equal(customerInputSchema.safeParse({...raw,coordinates}).success,false);
 assert.equal(customerInputSchema.safeParse({...raw,branchId:randomUUID()}).success,false);
});
test('branch allocation writes do not require list-only URL filters',()=>{assert.equal(upstreamQuery('auth/branch-inventory',new URLSearchParams()),'');const id=randomUUID();assert.match(upstreamQuery('auth/branch-inventory',new URLSearchParams({branchId:id})),/branchId=/);assert.throws(()=>upstreamQuery('auth/branch-inventory',new URLSearchParams({unexpected:'1'})));});
test('delivery administration is consistently administrator-only at both gateways',()=>{
 for(const [method,path] of [['GET','auth/delivery-zones'],['GET','auth/branch-inventory'],['POST','auth/delivery-zone'],['POST','auth/delivery-zone-delete'],['POST','auth/delivery-settings'],['POST','auth/branch-inventory'],['PUT','orders/aaaaaaaaaaaaaaaaaaaaaaaa/branch']]){assert.equal(accessPolicy(method!,path!),'admin');assert.equal(lookupPolicy(method!,'/api/'+path)?.policy,'admin');}
});
test('optional Geoapify setup is explicit and cannot start without a server key',async()=>{
 const {readLocationOptions}=await import('../apps/api/src/modules/location/reverse');
 assert.equal(readLocationOptions({}).provider,'nominatim');
 assert.throws(()=>readLocationOptions({GEOCODING_PROVIDER:'geoapify'}));
 const configured=readLocationOptions({GEOCODING_PROVIDER:'geoapify',GEOAPIFY_API_KEY:'synthetic-geocoding-key'});
 assert.equal(configured.endpoint,'https://api.geoapify.com/v1/geocode/reverse');assert.equal(configured.provider,'geoapify');
});
