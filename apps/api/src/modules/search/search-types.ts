import type { Document } from 'mongodb';
import type { SearchInput, SearchResponse, SearchSuggestions,SearchRule } from '@almina/contracts/search';
import type { SearchIntent } from './query-intent.js';
export type Candidate={product:Document;tier:number;lexicalRank?:number|undefined;semanticRank?:number|undefined;vectorScore?:number;matchedFields:string[];fusion?:number;business?:number};
export type RetrievalInput={input:SearchInput;text:string;intent:SearchIntent;expansions:string[];relaxed?:boolean;deadline?:number};
export interface SearchProvider {
 search(input:RetrievalInput):Promise<Candidate[]>;
 suggest(input:SearchInput,rules?:SearchRule[]):Promise<SearchSuggestions>;
 semanticSearch(input:RetrievalInput):Promise<Candidate[]>;
 alternatives?(source:Document,input:SearchInput):Promise<Document[]>;
 exactFallback?(input:SearchInput):Promise<Document[]>;
 hydrate(ids:string[],input:SearchInput,intent:SearchIntent):Promise<Document[]>;
}
export type SearchDiagnostic={searchId:string;requestId?:string;locale:'en'|'ar';queryHash:string;operation:'search'|'suggest';lexical:number;semantic:number;resultCount:number;relaxed:boolean;corrected:boolean;unavailable:boolean;parseMs:number;lexicalMs:number;vectorMs:number;fusionMs:number;durationMs:number};
export type SearchExecution={response:SearchResponse;candidates:Candidate[];diagnostic:SearchDiagnostic};
