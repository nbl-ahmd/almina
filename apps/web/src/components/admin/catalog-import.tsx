"use client";
import { inputClass, selectClass, fileClass, labelClass as fieldLabel } from './shadcn/styles';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Badge, Callout, Card, buttonVariants } from './ui';
import { useConfirm } from './confirm-dialog';
import Link from '../app-link';
import { useSyncExternalStore, useState } from 'react';
import { adminRequest } from './controls';
type Row={sourceKey:string;name:string;action:string;price:string;previousPrice?:string;websiteStockProposed:number;changedFields:string[]};
type Preview={previewId?:string;total?:number;errors?:{row:number;field:string;message:string}[];warnings?:{row:number;field:string;message:string}[];rows?:Row[];unmappedCategories?:string[]};
const importKey='almina.catalog-import.preview';
function savedImport(){try{return localStorage.getItem(importKey)||'';}catch{return '';}}
function subscribeImport(change:()=>void){window.addEventListener('storage',change);window.addEventListener('almina-catalog-import',change);return ()=>{window.removeEventListener('storage',change);window.removeEventListener('almina-catalog-import',change);};}
export function CatalogImport({categories}:{categories:{id:string;name:string}[]}) {
  const { ask, dialog } = useConfirm();
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
  const reference=preview?.previewId||savedId;
  const importable=preview?.total??preview?.rows?.length??0;
  const step=(number:number,title:string)=><span className="flex items-center gap-2"><span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{number}</span>{title}</span>;
  return <>
    {dialog}
    {error?<Callout tone="danger" role="alert"><p>{error}</p></Callout>:null}{status?<Callout tone="success" role="status"><p>{status}</p>{status.startsWith('Draft import complete')?<Link href="/admin/products?view=hidden">Review imported products</Link>:null}</Callout>:null}
    <Card title={step(1,'Choose the prepared file')} description="Importing keeps every product hidden and saves the approved 1–10 opening-stock estimates. Published products are never overwritten."
      aside={<a className={buttonVariants({ variant: "outline", size: "sm" })} href="/api/admin/catalog-import/template" download="catalog-import.csv"><ArrowDownTrayIcon className="size-4" aria-hidden="true" />Download CSV template</a>}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={fieldLabel}>Source namespace<input className={inputClass} value={namespace} aria-describedby="namespace-hint" onChange={event=>{setNamespace(event.target.value);setPreview(null);}} disabled={pending} /></label>
        <label className={fieldLabel}>Prepared CSV or JSON<input type="file" className={fileClass} accept=".csv,.json,text/csv,application/json" disabled={pending} onChange={event=>{setFile(event.target.files?.[0]??null);setPreview(null);setMapping({});}} /></label>
      </div>
      <p id="namespace-hint" className="m-0 mt-2 text-[13px] text-mute">Keep the same namespace and source keys for later updates; a new namespace creates new products. Use VAT-inclusive AED prices. Files up to 3 MB.</p>
      {preview?.unmappedCategories?.length?<fieldset className="m-0 mt-4 grid gap-3 rounded-lg border-0 bg-warn-soft p-4"><legend className="float-left mb-1 w-full text-[13px] font-semibold text-warn">Match these file categories to website categories, then preview again. <Link className="underline" href="/admin/categories">Manage categories</Link></legend>
        <div className="grid gap-3 md:grid-cols-2">{preview.unmappedCategories.map(name=><label key={name} className={fieldLabel}>Map {name}<select className={selectClass} value={mapping[name]??''} onChange={event=>setMapping(value=>({...value,[name]:event.target.value}))}><option value="">Choose website category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>)}</div></fieldset>:null}
      <div className="mt-4"><button className={buttonVariants({ variant: "default" })} disabled={pending||!file} onClick={review}>Preview import</button></div>
    </Card>
    <Card title={step(2,'Check the preview')} description={preview?.rows?.length?`${importable.toLocaleString('en-AE')} ${importable===1?'product':'products'} · first 50 shown`:'The changes appear here before anything is saved.'}>
      {preview?.errors?.length?<div role="alert" className="mb-3 rounded-lg bg-bad-soft p-4 text-[13px] text-bad"><h3 className="m-0 text-sm font-semibold">Fix these values before importing</h3><ul className="m-0 mt-2 list-disc pl-5">{preview.errors.slice(0,50).map((issue,index)=><li key={index}>Row {issue.row} · {issue.field}: {issue.message}</li>)}</ul></div>:null}
      {preview?.warnings?.length?<details className="mb-3 rounded-lg bg-warn-soft p-4 text-[13px] text-warn"><summary className="cursor-pointer font-semibold">{preview.warnings.length}{preview.warnings.length===500?'+':''} product review warnings</summary><ul className="m-0 mt-2 list-disc pl-5">{preview.warnings.slice(0,30).map((issue,index)=><li key={index}>Row {issue.row}: {issue.message}</li>)}</ul><p className="m-0 mt-2">Draft import is allowed. Publishing still requires the missing information.</p></details>:null}
      {preview?.rows?.length?<div className="overflow-x-auto rounded-lg border border-line" tabIndex={0} role="region" aria-label="Import preview"><table className="w-full min-w-[820px] border-collapse text-[13px]"><thead><tr>{['Source key','Product','Action','Gross AED','Proposed stock','Changed fields'].map(value=><th key={value} scope="col" className="whitespace-nowrap bg-soft px-3 py-2 text-left text-xs font-semibold text-mute">{value}</th>)}</tr></thead><tbody>{preview.rows.slice(0,50).map(row=><tr key={row.sourceKey} className="border-t border-line"><td className="px-3 py-2 font-mono text-xs">{row.sourceKey}</td><td className="px-3 py-2">{row.name}</td><td className="px-3 py-2"><Badge tone={row.action==='create'?'success':'neutral'}>{row.action}</Badge></td><td className="px-3 py-2 tabular-nums">{row.previousPrice?`${row.previousPrice} → `:''}{row.price}</td><td className="px-3 py-2 tabular-nums">{row.websiteStockProposed}</td><td className="max-w-xs truncate px-3 py-2 text-mute">{row.changedFields?.join(', ')}</td></tr>)}</tbody></table></div>:null}
    </Card>
    <Card title={step(3,'Import, or undo')} description={reference?`Import reference: ${reference.slice(0,12)}`:'Preview a file to enable these actions.'}>
      <div className="flex flex-wrap items-center gap-2">
        <button className={buttonVariants({ variant: "default" })} disabled={pending||!preview?.previewId} onClick={()=>execute('commit')}>Import reviewed drafts</button>
        <button className={buttonVariants({ variant: "outline" })} disabled={pending||!savedId} onClick={()=>execute('commit')}>Resume saved import</button>
        <button className={buttonVariants({ variant: "outline" })} disabled={pending||!reference} onClick={report}>Download change report</button>
        <button className={buttonVariants({ variant: "danger" })} disabled={pending||!reference} onClick={async()=>{if(await ask('Roll back unchanged drafts from this import? Edited or published products will be protected.',{action:'Roll back import',danger:true}))void execute('rollback');}}>Roll back saved import</button>
      </div>
    </Card>
  </>;
}
