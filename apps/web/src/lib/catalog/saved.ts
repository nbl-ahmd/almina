// Local pattern (same as model.objectId) so the save button does not load the catalogue schemas.
const objectId = /^[a-f0-9]{24}$/i;
export const savedKey='almina.saved-products.v1';
export function readSaved(raw:string|null){try{const value:unknown=JSON.parse(raw??'[]');return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&objectId.test(id)))].slice(0,100):[];}catch{return [];}}
export function setSaved(ids:string[]){localStorage.setItem(savedKey,JSON.stringify(readSaved(JSON.stringify(ids))));window.dispatchEvent(new Event('almina-saved-change'));}
