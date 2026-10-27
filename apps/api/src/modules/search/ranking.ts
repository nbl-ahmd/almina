import type { SearchRule } from '@almina/contracts/search';
import { hasProductPhoto } from '@almina/contracts';
import { currentPrice,searchFamilyKey } from './policy.js';
import { searchLimits } from './config.js';
import type { Candidate } from './search-types.js';
export function businessBoost(candidate:Candidate){const p=candidate.product;
 const age=p.searchSignals?.updatedAt?Math.max(0,Date.now()-new Date(p.searchSignals.updatedAt).getTime()):0;
 const decay=Number.isFinite(age)?Math.exp(-age/(14*86400000)):0;
 const signal=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.min(1,Math.max(0,v))*decay:0;
 return Math.min(searchLimits.commercialCap,(p.stock>0?0.02:0)+(p.featured===true?0.005:0)+(hasProductPhoto(p)?0.005:0)+(p.sale===true?0.002:0)+signal(p.searchSignals?.popularity)*0.009+signal(p.searchSignals?.conversion)*0.009);
}
export function rankCandidates(lexical:Candidate[],semantic:Candidate[],rules:SearchRule[],sort='relevance',groupFamilies=true){
 const merged=new Map<string,Candidate>();
 for(const candidate of [...lexical,...semantic]){const id=String(candidate.product._id),prior=merged.get(id);merged.set(id,prior?{...prior,semanticRank:candidate.semanticRank??prior.semanticRank,lexicalRank:candidate.lexicalRank??prior.lexicalRank,tier:Math.min(prior.tier,candidate.tier)}:{...candidate});}
 const hidden=new Set(rules.filter(r=>r.type==='hide').map(r=>r.productId));
 const candidates=[...merged.values()].filter(c=>!hidden.has(String(c.product._id)));
 for(const c of candidates){c.fusion=(c.lexicalRank?1/(searchLimits.rrfK+c.lexicalRank):0)+(c.semanticRank?1/(searchLimits.rrfK+c.semanticRank):0);
 c.business=Math.min(searchLimits.commercialCap,businessBoost(c)+rules.filter(r=>r.productId===String(c.product._id)&&r.type==='boost').reduce((n,r)=>n+r.boost,0));}
 const pin=(c:Candidate)=>rules.find(r=>r.type==='pin'&&r.productId===String(c.product._id))?.position??1000;
 candidates.sort((a,b)=>{
 if(sort==='price-asc'||sort==='price-desc')return (currentPrice(a.product)-currentPrice(b.product))*(sort==='price-asc'?1:-1)||String(a.product._id).localeCompare(String(b.product._id));
 if(sort==='name')return String(a.product.name).localeCompare(String(b.product.name))||String(a.product._id).localeCompare(String(b.product._id));
 return a.tier-b.tier||(sort==='relevance-cheap'?currentPrice(a.product)-currentPrice(b.product):0)||pin(a)-pin(b)||((b.fusion??0)*searchLimits.rrfK+(b.business??0))-((a.fusion??0)*searchLimits.rrfK+(a.business??0))||String(a.product._id).localeCompare(String(b.product._id));
 });
 if(!groupFamilies)return candidates;
 const families=new Map<string,Candidate>();
 for(const c of candidates){const key=searchFamilyKey(c.product),prior=families.get(key);
 if(!prior){families.set(key,{...c,product:{...c.product,familyOptionCount:1,familyPriceVaries:false}});}else {prior.product.familyOptionCount=Math.min(60,prior.product.familyOptionCount+1);if(currentPrice(prior.product)!==currentPrice(c.product))prior.product.familyPriceVaries=true;}}
 return [...families.values()];
}
