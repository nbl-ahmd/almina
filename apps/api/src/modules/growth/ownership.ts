// Verified email owns guest purchases too. Retain historical case while matching it exactly.
export const normalizedEmail=(value:string)=>value.trim().toLowerCase();
export function customerOrderFilter(email:string){const value=normalizedEmail(email),escaped=value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return {$or:[{customerEmailKey:value},{'customer.email':{$regex:'^'+escaped+'$',$options:'i'}}]};}
