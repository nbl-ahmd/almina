export function normalizeSearch(value:string){
 return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g,'')
 .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
 .replace(/[’']/g,'').replace(/([\p{L}])(\d)/gu,'$1 $2').replace(/(\d)\s*(ml|mg|kg|g|l)\b/g,'$1 $2').replace(/[^\p{L}\p{N}.]+/gu,' ')
 .replace(/\bmoisturis(er|ers|ing)\b/g,(_,suffix:string)=>`moisturiz${suffix}`).replace(/\bnappies\b/g,'nappy')
 .replace(/\bdiapers\b/g,'diaper').replace(/\bwipes\b/g,'wipe').replace(/\s+/g,' ').trim().slice(0,160);
}
export function exactIdentifier(value:string){
 const trimmed=value.trim();if(/\d+(?:ml|mg|mcg|g|kg|iu)$/i.test(trimmed))return undefined;
 return /^(?:\d{8,80}|PD\d+|(?=[a-zA-Z0-9_-]*\d)[a-zA-Z][a-zA-Z0-9_-]{4,79})$/i.test(trimmed)?trimmed:undefined;
}
export const queryHashInput=(query:string,locale:string)=>locale+':'+normalizeSearch(query);
