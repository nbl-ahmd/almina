'use client';
import { useEffect, useRef, useState } from 'react';
import { deliveryPointSchema, deliveryPolygonSchema, type DeliveryPoint, type DeliveryPolygon } from '@almina/contracts';
import { adminRequest } from './controls';
type Place={name:string;point:DeliveryPoint;geometry:DeliveryPolygon|null};
export function DeliveryPlaceSearch({onLocate,onBoundary}:{onLocate:(point:DeliveryPoint)=>void;onBoundary:(geometry:DeliveryPolygon)=>void}){
 const [query,setQuery]=useState(''),[results,setResults]=useState<Place[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const version=useRef(0);useEffect(()=>()=>{version.current++;},[]);
 async function search(){const request=++version.current;if(query.trim().length<3){setMessage('Enter at least three characters.');return;}setBusy(true);setMessage('');setResults([]);try{
  const data=await adminRequest('auth/delivery-place-search','POST',{q:query.trim()});
  if(request!==version.current)return;
  if(!Array.isArray(data))throw Error('Place search is unavailable. You can still draw the area manually.');
  const places:Place[]=data.slice(0,5).flatMap(value=>{if(!value||typeof value!=='object')return[];const row=value as Record<string,unknown>,point=deliveryPointSchema.safeParse(row.point),geometry=deliveryPolygonSchema.safeParse(row.geometry);return typeof row.name==='string'&&point.success?[{name:row.name,point:point.data,geometry:geometry.success?geometry.data:null}]:[];});
  setResults(places);setMessage(places.length?'Choose a result to locate it. A search does not expand delivery coverage until you save its polygon.':'No places found. Try a nearby landmark or draw the area manually.');
 }catch{if(request===version.current)setMessage('Place search is unavailable right now. You can still draw the area manually.');}finally{if(request===version.current)setBusy(false);}}
 return <div className="delivery-place-search" role="search" aria-label="Find a delivery area"><div className="delivery-place-search__input"><label>Find a place in the UAE<input type="search" maxLength={100} value={query} placeholder="Area or landmark, e.g. Al Nakheel, RAK" onChange={event=>{version.current++;setBusy(false);setQuery(event.target.value);setResults([]);setMessage('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();void search();}}} /></label><button type="button" disabled={busy||query.trim().length<3} onClick={()=>void search()}>{busy?'Searching…':'Search places'}</button></div>{message?<p role="status">{message}</p>:null}{results.length?<ul>{results.map((place,index)=><li key={index}><span>{place.name}</span><div><button type="button" onClick={()=>onLocate(place.point)}>Show on map</button>{place.geometry?<button type="button" onClick={()=>{if(window.confirm('Use this mapped place boundary as the delivery draft? It replaces the current draft. Review it before saving.'))onBoundary(place.geometry!);}}>Use boundary</button>:<small>No usable boundary; draw around this place.</small>}</div></li>)}</ul>:null}<small>Search is sent only when you press Search. Use public place names, not customer details. Map data © OpenStreetMap contributors.</small></div>;
}
