import { readSaved,savedKey,setSaved } from './saved';
// Account-backed lists are never put into guest storage. Signing out restores the guest list.
let accountIds:string[]|null=null;
let loading:Promise<void>|null=null;
let generation=0;
export function currentSaved(){return accountIds??readSaved(localStorage.getItem(savedKey));}
export function resetSavedAccount(){generation++;accountIds=null;loading=null;window.dispatchEvent(new Event('almina-saved-change'));}
export function loadSavedAccount(){
 const started=generation;
 loading??=fetch('/api/customer/saved',{cache:'no-store'}).then(async response=>{if(response.status===401||response.status===404)return;if(!response.ok)throw Error('Saved list unavailable');const value=await response.json();if(started!==generation)return;accountIds=readSaved(JSON.stringify(value.data.ids));window.dispatchEvent(new Event('almina-saved-change'));}).catch(()=>{if(started===generation)loading=null;});
 return loading;
}
export async function changeSaved(id:string,remove:boolean){
 const started=generation;
 await loadSavedAccount();
 if(started!==generation)throw Error('Account changed. Please try again.');
 if(accountIds===null){const ids=currentSaved();setSaved(remove?ids.filter(value=>value!==id):[...ids,id]);return;}
 const response=await fetch('/api/customer/saved',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify({productId:id,remove})});
 if(!response.ok)throw Error('Unable to update your saved list. Please try again.');
 const value=await response.json();if(started!==generation)return;
 accountIds=readSaved(JSON.stringify(value.data.ids));window.dispatchEvent(new Event('almina-saved-change'));
}
