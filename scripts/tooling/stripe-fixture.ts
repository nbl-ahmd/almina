// Synthetic provider for the loopback-only commerce fixture. No Stripe credentials or network.
import {randomUUID} from 'node:crypto';
import type {Document} from 'mongodb';
import type {StripeTransport} from '../../apps/api/src/modules/payments/stripe.js';
export function stripeFixture(){
  const sessions=new Map<string,Document>(),keys=new Map<string,string>();
  const transport:StripeTransport={
    async create(params,key){
      let id=keys.get(key);
      if(!id){id='cs_test_'+randomUUID().replaceAll('-','');keys.set(key,id);sessions.set(id,{id,livemode:false,mode:'payment',client_reference_id:params.client_reference_id,currency:'aed',amount_total:params.line_items![0]!.price_data!.unit_amount,status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/'+id,expires_at:params.expires_at,payment_intent:null});}
      return sessions.get(id);
    },
    async retrieve(id){if(!sessions.has(id))throw new Error('Unknown fixture session');return sessions.get(id);},
    async expire(id){sessions.get(id)!.status='expired';return sessions.get(id);},
    verify(){throw new Error('Fixture uses explicit paid/expiry controls; signature tests use the real SDK separately');},
  };
  return {transport,reset(){sessions.clear();keys.clear();},paid(){for(const remote of sessions.values()){remote.status='complete';remote.payment_status='paid';remote.payment_intent={id:'pi_synthetic',latest_charge:{amount:remote.amount_total,amount_refunded:0,refunded:false}};}},refunded(){for(const remote of sessions.values()){if(remote.payment_intent){remote.payment_intent.latest_charge.refunded=true;remote.payment_intent.latest_charge.amount_refunded=remote.amount_total;}}}};
}
