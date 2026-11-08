import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginCandidates } from '../apps/api/src/modules/delivery/login-availability';
import { branchLoginAvailabilityQuerySchema, branchLoginAvailabilitySchema, branchUsernameSchema } from '@almina/contracts';
import { accessPolicy, upstreamQuery, projectAdminResponse } from '../apps/web/src/lib/admin/policy';
import { lookupPolicy } from '../apps/api/src/modules/auth/retained-policy';

test('login suggestions are deterministic, bounded, valid and do not accumulate suffixes',()=>{
  assert.deepEqual(loginCandidates('almina').slice(0,4),['almina','almina-store','almina-store-2','almina-store-3']);
  for(const input of ['almina','almina-store','almina-store-2','x'.repeat(100)]){
    const candidates=loginCandidates(input);assert.ok(candidates.length<=21);assert.equal(new Set(candidates).size,candidates.length);
    assert.ok(candidates.every(value=>branchUsernameSchema.safeParse(value).success));
  }
});
test('availability is administrator-only and returns only reviewed suggestion data',()=>{
  const path='auth/branch-login-availability';
  assert.equal(accessPolicy('GET',path),'admin');assert.equal(lookupPolicy('GET','/api/'+path)?.policy,'admin');
  assert.equal(upstreamQuery(path,new URLSearchParams({username:' almina '})),'username=almina');
  for(const raw of [{username:{$ne:null}},{username:'almina',role:'admin'},{username:'not allowed'}])assert.equal(branchLoginAvailabilityQuerySchema.safeParse(raw).success,false);
  assert.throws(()=>upstreamQuery(path,new URLSearchParams('username=one&username=two')));
  const value={username:'almina',available:false,suggestion:'almina-store'};
  assert.deepEqual(projectAdminResponse(path,value),value);
  assert.equal(branchLoginAvailabilitySchema.safeParse({...value,password:'not-returned'}).success,false);
});
