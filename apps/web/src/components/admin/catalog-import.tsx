"use client";
import { inputClass, selectClass } from './shadcn/styles';
import { buttonVariants } from './ui';
import Link from '../app-link';
import { useSyncExternalStore, useState } from 'react';
import { adminRequest } from './controls';
type Row={sourceKey:string;name:string;action:string;price:string;previousPrice?:string;websiteStockProposed:number;changedFields:string[]};
type Preview={previewId?:string;total?:number;errors?:{row:number;field:string;message:string}[];warnings?:{row:number;field:string;message:string}[];rows?:Row[];unmappedCategories?:string[]};
const importKey='almina.catalog-import.preview';
function savedImport(){try{return localStorage.getItem(importKey)||'';}catch{return '';}}
function subscribeImport(change:()=>void){window.addEventListener('storage',change);window.addEventListener('almina-catalog-import',change);return ()=>{window.removeEventListener('storage',change);window.removeEventListener('almina-catalog-import',change);};}
export function CatalogImport({categories}:{categories:{id:string;name:string}[]}) {
  const [file,setFile]=useState<File|null>(null),[namespace,setNamespace]=useState('erp-2026-10-15'),[mapping,setMapping]=useState<Record<string,string>>({});
  const savedId=useSyncExternalStore(subscribeImport,savedImport,()=> '');
  const [preview,setPreview]=useState<Preview|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
  async function review(){
    if(!file)return;setPending(true);setError('');setStatus('');
    try{if(file.size>3*1024*1024)throw new Error('Use a file smaller than 3 MB.');
      const result=await adminRequest('catalog-import/preview','POST',{namespace,categoryMapping:mapping,format:file.name.toLowerCase().endsWith('.json')?'json':'csv',content:await file.text()}) as Preview;
      setPreview(result);if(result.previewId){try{localStorage.setItem(importKey,result.previewId);window.dispatchEvent(new Event('almina-catalog-import'));}catch{/* Current tab retains the reference. */}}
    }catch(error){setError(error instanceof Error?error.message:'Review failed.');}finally{setPending(false);}
  }
  async function execute(action:'commit'|'rollback'){
    const previewId=preview?.previewId||savedId;if(!previewId)return;
    setPending(true);setError('');
    try{let result:{complete:boolean;processed?:number;total?:number};
      do{result=await adminRequest(`catalog-import/${action}`,'POST',{previewId}) as typeof result;setStatus(action==='commit'?`${result.processed} / ${result.total} draft products processed`:'Rolling back unchanged draft products…');}while(!result.complete);
      setStatus(action==='commit'?'Draft import complete. Review products before publishing.':'Rollback complete. Created drafts were archived; prior drafts were restored.');
    }catch(error){setError(error instanceof Error?error.message:'Interrupted. Use Resume to continue safely.');}finally{setPending(false);}
  }
  async function report(){
    const previewId=preview?.previewId||savedId;if(!previewId)return;setError('');setPending(true);
    try{const records:unknown[]=[];let offset:number|null=0;let details:Record<string,unknown>={};
      do{const value=await adminRequest('catalog-import/report','POST',{previewId,offset}) as {report:unknown[];nextOffset:number|null};records.push(...value.report);details=value;offset=value.nextOffset;}while(offset!==null);
      const url=URL.createObjectURL(new Blob([JSON.stringify({...details,report:records},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`catalog-import-${previewId.slice(0,12)}.json`;a.click();URL.revokeObjectURL(url);
    }catch{setError('Report unavailable. Sign in with the account that created the preview.');}finally{setPending(false);}
  }
  return <section className="mb-4 grid gap-4 rounded-xl bg-surface p-5 border border-line md:p-6" aria-labelledby="catalog-import-title"><h2 id="catalog-import-title">Review and import drafts</h2><p>Use stable source keys and VAT-inclusive AED prices. Importing saves the approved 1–10 opening-stock estimates and keeps products hidden. Review stock and product details before publishing. Keep the same namespace and source keys for future updates; a new namespace creates new products. Repeated source keys update only reviewed draft changes; published products are never overwritten.</p>
    <p><a href="/api/admin/catalog-import/template" download="catalog-import.csv">Download CSV template</a> · <Link href="/admin/categories">Manage category mappings</Link> · <Link href="/admin/products">Review imported products</Link></p>
    <label>Source namespace<input className={inputClass} value={namespace} onChange={event=>{setNamespace(event.target.value);setPreview(null);}} disabled={pending} /></label>
    <label>Prepared CSV or JSON<input type="file" accept=".csv,.json,text/csv,application/json" disabled={pending} onChange={event=>{setFile(event.target.files?.[0]??null);setPreview(null);setMapping({});}} /></label>
    {preview?.unmappedCategories?.map(name=><label key={name}>Map {name}<select className={selectClass} value={mapping[name]??''} onChange={event=>setMapping(value=>({...value,[name]:event.target.value}))}><option value="">Choose website category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>)}
    <div className="flex flex-wrap items-center gap-2"><button className={buttonVariants({ variant: "default" })} disabled={pending||!file} onClick={review}>Preview import</button><button className={`${buttonVariants({ variant: "outline" })}`} disabled={pending||!preview?.previewId} onClick={()=>execute('commit')}>Import reviewed drafts</button><button className={`${buttonVariants({ variant: "outline" })}`} disabled={pending||!savedId} onClick={()=>execute('commit')}>Resume saved import</button><button className={`${buttonVariants({ variant: "outline" })}`} disabled={pending||!(preview?.previewId||savedId)} onClick={report}>Download change report</button><button className={`${buttonVariants({ variant: "danger" })}`} disabled={pending||!(preview?.previewId||savedId)} onClick={()=>{if(window.confirm('Roll back unchanged drafts from this import? Edited or published products will be protected.'))void execute('rollback');}}>Roll back saved import</button></div>
    {preview?.previewId||savedId?<p className="m-0 text-[13px] text-mute">Import reference: {(preview?.previewId||savedId).slice(0,12)}</p>:null}
    {error?<p role="alert">{error}</p>:null}{status?<p role="status">{status}</p>:null}
    {preview?.errors?.length?<div role="alert" className="rounded-lg bg-bad-soft p-4 text-[13px] text-bad"><div><h3>Fix these values before importing</h3><ul>{preview.errors.slice(0,50).map((issue,index)=><li key={index}>Row {issue.row} · {issue.field}: {issue.message}</li>)}</ul></div></div>:null}
    {preview?.warnings?.length?<details><summary>{preview.warnings.length}{preview.warnings.length===500?'+':''} product review warnings</summary><ul>{preview.warnings.slice(0,30).map((issue,index)=><li key={index}>Row {issue.row}: {issue.message}</li>)}</ul><p>Draft import is allowed. Publishing still requires the missing reviews and information.</p></details>:null}
    {preview?.rows?.length?<div className="mb-4 overflow-x-auto rounded-lg bg-surface border border-line"><h3>{preview.total??preview.rows.length} {(preview.total??preview.rows.length)===1?'product':'products'} · first 50 shown</h3><table className="min-w-[900px]" role="table"><thead role="rowgroup"><tr role="row">{['Source key','Product','Action','Gross AED','Proposed stock','Changed fields'].map(value=><th key={value} scope="col" role="columnheader">{value}</th>)}</tr></thead><tbody role="rowgroup">{preview.rows.slice(0,50).map(row=><tr key={row.sourceKey} role="row"><td role="cell">{row.sourceKey}</td><td role="cell" data-label="Product">{row.name}</td><td role="cell" data-label="Action">{row.action}</td><td role="cell" data-label="Gross AED">{row.previousPrice?`${row.previousPrice} → `:''}{row.price}</td><td role="cell" data-label="Proposed stock">{row.websiteStockProposed}</td><td role="cell" data-label="Changed fields" className="block max-w-xs truncate">{row.changedFields?.join(', ')}</td></tr>)}</tbody></table></div>:null}
  </section>;
}
