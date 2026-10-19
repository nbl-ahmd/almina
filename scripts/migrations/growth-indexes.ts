import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { indexPlan } from '../../apps/api/src/database/indexes.js';
const names=['customers','customer_sessions','customer_auth_codes','customer_auth_limits','catalog_search_terms','growth_pages','product_reviews','reward_vouchers','reward_ledger'] as const;
async function main(){
 const args=process.argv.slice(2);
 if(!args.length){process.stdout.write(JSON.stringify(Object.fromEntries(names.map(name=>[name,indexPlan[name]])),null,2)+'\n');return;}
 if(args.length!==1||args[0]!=='--apply')throw Error('Invalid arguments');
 const env=readApiEnvironment(process.env);if(env.database.mode!=='enabled')throw Error('Database disabled');
 const database=createDatabase(env.database);
 try{const db=await database.getDb();
 // Never repair, merge or expose an existing customer. Fail closed on duplicate/malformed keys.
 const malformed=await db.collection('customers').countDocuments({emailHash:{$not:{$regex:'^[a-f0-9]{64}$'}}},{maxTimeMS:3000});
 const duplicates=await db.collection('customers').aggregate([{$group:{_id:'$emailHash',count:{$sum:1}}},{$match:{count:{$gt:1}}},{$limit:1}],{maxTimeMS:3000}).hasNext();
 if(malformed||duplicates)throw Error('Customer key review required');
 for(const name of names)await db.collection(name).createIndexes([...indexPlan[name]!],{maxTimeMS:60000});
 process.stdout.write('{"event":"growth_indexes_applied"}\n');
 }finally{await database.close();}
}
void main().catch(()=>{process.stderr.write('{"event":"growth_index_migration_failed_review_customer_keys_and_indexes"}\n');process.exitCode=1;});
