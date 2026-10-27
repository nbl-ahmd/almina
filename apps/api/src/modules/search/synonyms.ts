import type { SearchSynonym } from '@almina/contracts/search';
import { normalizeSearch } from './query-normalizer.js';
export const seedSynonyms:SearchSynonym[]=[
 {key:'nappy-diaper',type:'equivalent',inputs:['nappy','nappies'],outputs:['diaper','diapers']},
 {key:'sun-cream',type:'equivalent',inputs:['sun cream','sunblock'],outputs:['sunscreen']},
 {key:'moisturiser',type:'equivalent',inputs:['moisturiser'],outputs:['moisturizer']},
 {key:'glucose-device',type:'customer_language',inputs:['blood sugar monitor','sugar checking machine','machine to check sugar at home'],outputs:['glucose monitor','glucometer']},
 {key:'cotton-buds',type:'equivalent',inputs:['cotton buds'],outputs:['cotton swabs']},
 {key:'johnsons-brand',type:'brand_alias',inputs:['johnsons'],outputs:["johnson's"]},
 {key:'diaper-arabic',type:'category_alias',inputs:['حفاضات'],outputs:['diaper']},
 {key:'sunscreen-arabic',type:'category_alias',inputs:['واقي شمس','واقي الشمس'],outputs:['sunscreen']},
 {key:'dry-skin',type:'customer_language',inputs:['cream for dry skin','dry skin cream'],outputs:['moisturizing cream']},
].map(v=>({...v,type:v.type as SearchSynonym['type'],enabled:true,locale:'both'}));
export function expandSynonyms(query:string,entries:SearchSynonym[],locale='en'){
 const normalized=normalizeSearch(query),expanded=new Set<string>();
 for(const entry of entries){if(!entry.enabled||entry.locale!=='both'&&entry.locale!==locale)continue;
 const sources=entry.type==='equivalent'?[...entry.inputs,...entry.outputs]:entry.inputs;
 const targets=entry.type==='equivalent'?[...entry.inputs,...entry.outputs]:entry.outputs;
 for(const source of sources){const s=normalizeSearch(source);if(!s||!(` ${normalized} `).includes(` ${s} `))continue;
 for(const target of targets){const value=normalizeSearch(target);if(value!==s)expanded.add((` ${normalized} `).replace(` ${s} `,` ${value} `).trim());}}
 }return [...expanded].slice(0,8);
}
export function atlasSynonym(entry:SearchSynonym){return entry.type==='equivalent'?{mappingType:'equivalent',synonyms:[...new Set([...entry.inputs,...entry.outputs].map(normalizeSearch))]}:{mappingType:'explicit',input:entry.inputs.map(normalizeSearch),synonyms:entry.outputs.map(normalizeSearch)};}
