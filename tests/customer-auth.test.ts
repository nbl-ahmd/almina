import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair,exportJWK,createLocalJWKSet,SignJWT } from 'jose';
import { verifyGoogleCredential,customerToken,googleEmailIsAuthoritative,customerAuthOptions } from '../apps/api/src/modules/growth/customers';
test('Google credentials require the correct signature, issuer, audience, time and verified email',async()=>{
 const keys=await generateKeyPair('RS256'),jwk=await exportJWK(keys.publicKey);jwk.kid='synthetic';jwk.alg='RS256';const resolve=createLocalJWKSet({keys:[jwk]}),aud='synthetic.apps.googleusercontent.com';
 async function sign(overrides:Record<string,unknown>={}){return new SignJWT({email:'synthetic@example.invalid',email_verified:true,sub:'synthetic-google-id',iss:'https://accounts.google.com',aud,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...overrides}).setProtectedHeader({alg:'RS256',kid:'synthetic'}).sign(keys.privateKey);}
 assert.equal((await verifyGoogleCredential(await sign(),aud,resolve)).email,'synthetic@example.invalid');
 for(const invalid of [{aud:'other.apps.googleusercontent.com'},{iss:'https://evil.invalid'},{email_verified:false},{email:'invalid'},{sub:''},{exp:undefined},{exp:0},{iat:Math.floor(Date.now()/1000)-3600}])await assert.rejects(verifyGoogleCredential(await sign(invalid),aud,resolve),{code:'UNAUTHORIZED'});
 const other=await generateKeyPair('RS256');const forged=await new SignJWT({}).setProtectedHeader({alg:'RS256',kid:'synthetic'}).sign(other.privateKey);await assert.rejects(verifyGoogleCredential(forged,aud,resolve),{code:'UNAUTHORIZED'});
});
test('customer and staff cookies remain separate and duplicate customer cookies reject',()=>{const token='a'.repeat(43);assert.equal(customerToken('almina_session='+token,true),undefined);assert.equal(customerToken('almina_customer='+token+'; almina_customer='+token,true),undefined);assert.equal(customerToken('almina_customer='+token,true),token);assert.equal(customerToken('almina_customer='+token,false),undefined);});

test('Google email ownership and provider configuration fail safely',()=>{
 assert.equal(googleEmailIsAuthoritative({email:'user@gmail.com'}),true);
 assert.equal(googleEmailIsAuthoritative({email:'user@example.invalid'}),false);
 assert.equal(googleEmailIsAuthoritative({email:'user@example.invalid',hd:'example.invalid'}),true);
 const previous=process.env.CUSTOMER_GOOGLE_CLIENT_ID;try{process.env.CUSTOMER_GOOGLE_CLIENT_ID='https://bad.invalid/.apps.googleusercontent.com';assert.equal(customerAuthOptions().googleClientId,null);}finally{if(previous===undefined)delete process.env.CUSTOMER_GOOGLE_CLIENT_ID;else process.env.CUSTOMER_GOOGLE_CLIENT_ID=previous;}
});
