'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Polygon, Marker } from 'leaflet';
import type { DeliveryPoint, DeliveryPolygon } from '@almina/contracts';
import 'leaflet/dist/leaflet.css';
import './delivery-map.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
export type MapZone={id:string;name:string;color:string;geometry:DeliveryPolygon};
export default function DeliveryMap({point,onPoint,geometry,onGeometry,zones=[],branches=[],locale='en'}:{point?:DeliveryPoint|null|undefined;onPoint?:(point:DeliveryPoint)=>void;geometry?:DeliveryPolygon|null|undefined;onGeometry?:(polygon:DeliveryPolygon|null)=>void;zones?:MapZone[];locale?:'en'|'ar';branches?:{id:string;name:string;location?:DeliveryPoint|null|undefined}[]}){
 const ar=locale==='ar';
 const element=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),pin=useRef<Marker|null>(null),polygon=useRef<Polygon|null>(null),[error,setError]=useState('');
 const syncGeometry=useRef<((value:DeliveryPolygon|null|undefined)=>void)|null>(null);
 const placePin=useRef<((point:DeliveryPoint)=>void)|null>(null),currentPoint=useRef(point),currentGeometry=useRef(geometry);
 useEffect(()=>{currentPoint.current=point;},[point]);
 const latest=useRef({onPoint,onGeometry});useEffect(()=>{latest.current={onPoint,onGeometry};},[onPoint,onGeometry]);
 useEffect(()=>{let stopped=false;let resize:ResizeObserver|undefined;void(async()=>{try{const L=await import('leaflet');if(onGeometry)await import('@geoman-io/leaflet-geoman-free');if(stopped||!element.current)return;
 const initial=point??branches.find(branch=>branch.location)?.location??{latitude:25.79,longitude:55.94};const instance=L.map(element.current,{scrollWheelZoom:false,zoomControl:false}).setView([initial.latitude,initial.longitude],12);map.current=instance;L.control.zoom({zoomInTitle:ar?'تكبير':'Zoom in',zoomOutTitle:ar?'تصغير':'Zoom out'}).addTo(instance);if(typeof ResizeObserver!=='undefined'){resize=new ResizeObserver(()=>instance.invalidateSize({animate:false}));resize.observe(element.current);}
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(instance);
 const icon=L.divIcon({className:'delivery-map-pin',html:'<span></span>',iconSize:[24,24],iconAnchor:[12,12]});
 const place=(value:DeliveryPoint)=>{if(pin.current)pin.current.setLatLng([value.latitude,value.longitude]);else{pin.current=L.marker([value.latitude,value.longitude],{icon,title:ar?'دبوس موقع التوصيل':'Delivery location pin',alt:ar?'دبوس موقع التوصيل':'Delivery location pin',draggable:!!latest.current.onPoint}).addTo(instance);pin.current.on('dragend',()=>{const value=pin.current!.getLatLng().wrap();latest.current.onPoint?.({latitude:value.lat,longitude:value.lng});});}};
 placePin.current=place;if(currentPoint.current)place(currentPoint.current);if(onPoint)instance.on('click',event=>{const wrapped=event.latlng.wrap();const value={latitude:wrapped.lat,longitude:wrapped.lng};place(value);latest.current.onPoint?.(value);});
 for(const branch of branches)if(branch.location){const label=document.createElement('span');label.textContent=branch.name;L.marker([branch.location.latitude,branch.location.longitude],{icon,title:branch.name,alt:branch.name,pmIgnore:true}).addTo(instance).bindTooltip(label);}
 for(const zone of zones){const layer=L.geoJSON(zone.geometry,{style:{color:zone.color,weight:2,fillOpacity:0.12},pmIgnore:true}).addTo(instance);const label=document.createElement('span');label.textContent=zone.name;layer.bindTooltip(label);}
 if(currentGeometry.current){const layer=L.geoJSON(currentGeometry.current);const found=layer.getLayers()[0];if(found instanceof L.Polygon){polygon.current=found.addTo(instance);instance.fitBounds(found.getBounds(),{padding:[24,24]});}}
 if(onGeometry){instance.pm.addControls({position:'topleft',drawMarker:false,drawCircle:false,drawCircleMarker:false,drawPolyline:false,drawText:false,drawRectangle:false,drawPolygon:true,editMode:true,dragMode:false,cutPolygon:false,removalMode:true,rotateMode:false});instance.pm.setGlobalOptions({allowSelfIntersection:false});for(const anchor of instance.getContainer().querySelectorAll<HTMLAnchorElement>('.button-container > a'))anchor.setAttribute('aria-label',anchor.parentElement?.title??'Map tool');
 const changed=()=>{const current=polygon.current;latest.current.onGeometry?.(current?current.toGeoJSON().geometry as DeliveryPolygon:null);};
 instance.on('pm:create',event=>{if(polygon.current)instance.removeLayer(polygon.current);polygon.current=event.layer as Polygon;polygon.current.on('pm:edit',changed);changed();});
 syncGeometry.current=value=>{if(JSON.stringify(polygon.current?.toGeoJSON().geometry??null)===JSON.stringify(value??null))return;if(polygon.current)instance.removeLayer(polygon.current);polygon.current=null;if(value){const found=L.geoJSON(value).getLayers()[0];if(found instanceof L.Polygon){polygon.current=found.addTo(instance);polygon.current.on('pm:edit',changed);instance.fitBounds(found.getBounds(),{padding:[24,24],animate:false});}}};
 instance.on('pm:remove',event=>{if(event.layer===polygon.current){polygon.current=null;changed();}});polygon.current?.on('pm:edit',changed);
 }
 }catch{if(!stopped)setError(ar?'تعذر تحميل الخريطة. استخدم حقول الإحداثيات أو حاول مرة أخرى.':'Map could not load. Use the coordinate or polygon fields, or try again.');}})();return()=>{stopped=true;resize?.disconnect();map.current?.remove();map.current=null;pin.current=null;polygon.current=null;placePin.current=null;syncGeometry.current=null;};
 // Each editor is keyed by its saved revision; draft changes must not rebuild the map while drawing.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{currentGeometry.current=geometry;syncGeometry.current?.(geometry);},[geometry]);
 useEffect(()=>{if(point){placePin.current?.(point);map.current?.panTo([point.latitude,point.longitude],{animate:false});}else if(pin.current){pin.current.remove();pin.current=null;}},[point]);
 return <div><div ref={element} className="delivery-map" role="region" aria-label={onGeometry?'Draw and edit delivery zone boundaries':ar?'اختر دبوس التوصيل على الخريطة':'Choose delivery pin on map'} />{error?<p role="alert">{error}</p>:null}<p className="mt-2 text-xs text-muted">{onGeometry?'Draw a polygon, then use Edit layers to adjust its boundary. Overlaps are allowed.':ar?'اختر نقطة على الخريطة أو اسحب الدبوس. تحقق من عنوان التوصيل الكامل.':'Select a point on the map or drag the pin. Confirm the full delivery address.'} {ar?'مركز الخريطة افتراضي للعرض، وليس موقع فرع محدد.':'Map centre is a viewing default, not a configured branch.'}</p></div>;
}
