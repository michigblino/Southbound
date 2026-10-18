/* OpenStreetMap place discovery via Overpass. Explicit regional queries only; never invent routes, prices, or schedules. */
(function(root){'use strict';
const DEFAULT_ENDPOINT='https://overpass-api.de/api/interpreter';
const COPYRIGHT_URL='https://www.openstreetmap.org/copyright';
const ALLOWED_HOSTS=['overpass-api.de','overpass.kumi.systems','overpass.nchc.org.tw'];
const CATEGORY_RULES={
 settlements:{key:'place',values:['city','town','village','hamlet']},
 attractions:{key:'tourism',values:['attraction','museum','viewpoint','artwork']},
 accommodation:{key:'tourism',values:['hostel','hotel','guest_house','camp_site']},
 nature:{key:'natural',values:['peak','waterfall','beach']}
};
const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function endpointUrl(value){
 const url=new URL(value||DEFAULT_ENDPOINT);
 if(url.protocol!=='https:'||!ALLOWED_HOSTS.includes(url.hostname)||url.pathname!=='/api/interpreter'||url.username||url.password||url.search||url.hash)throw new TypeError('Overpass endpoint must be an HTTPS interpreter URL from an approved public instance.');
 return url.toString();
}
function normalizeBbox(value){
 if(!Array.isArray(value)||value.length!==4)return null;
 const b=value.map(Number);
 if(!b.every(Number.isFinite)||b[0]<-90||b[0]>90||b[2]<-90||b[2]>90||b[1]<-180||b[1]>180||b[3]<-180||b[3]>180||b[0]>=b[2]||b[1]>=b[3])return null;
 return b.map(n=>Math.round(n*1000000)/1000000);
}
function buildQuery(bbox,categories,limit,timeoutSeconds){
 const box=bbox.join(',');
 const selectors=[];
 for(const category of categories){
  const rule=CATEGORY_RULES[category],values=rule.values.join('|');
  for(const type of ['node','way','relation'])selectors.push(type+'["'+rule.key+'"~"^('+values+')$"]('+box+');');
 }
 return '[out:json][timeout:'+timeoutSeconds+'];\n(\n'+selectors.join('\n')+'\n);\nout center tags qt '+limit+';';
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function safeDate(now){const d=new Date(now);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):new Date().toISOString().slice(0,10);}
function makeSource(now,endpoint){
 return {url:COPYRIGHT_URL,title:'OpenStreetMap contributors via Overpass API',checkedAt:safeDate(now),kind:'licensed-dataset',dataset:'OpenStreetMap',provider:'Overpass API',attribution:'© OpenStreetMap contributors',license:'Open Database License (ODbL) 1.0',providerUrl:'https://overpass-api.de/',endpoint,retrievedAt:new Date(now).toISOString()};
}
function normalizeElements(elements,source,limit){
 const places=[],seen=new Set();
 for(const item of elements){
  if(!isObject(item)||!['node','way','relation'].includes(item.type)||!Number.isInteger(Number(item.id)))continue;
  const tags=isObject(item.tags)?item.tags:{},name=String(tags.name||tags['name:en']||'').trim();
  if(!name)continue;
  const lat=Number(item.lat??item.center?.lat),lon=Number(item.lon??item.center?.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)continue;
  const id='osm-'+item.type+'-'+Number(item.id);if(seen.has(id))continue;seen.add(id);
  const tagKinds=['place','tourism','natural','historic','amenity','leisure'].map(k=>tags[k]).filter(Boolean).map(String);
  const country=String(tags['addr:country']||tags['is_in:country']||'').trim();
  const region=String(tags['addr:state']||tags['addr:province']||tags['is_in:state']||'').trim();
  const countryCode=/^[A-Za-z]{2}$/.test(country)?country.toUpperCase():'';
  places.push({id,name,lat,lon,country,region,continent:'',countryCode,osm:{type:item.type,id:Number(item.id)},tags:tagKinds,source:clone(source)});
  if(places.length>=limit)break;
 }
 return places;
}
function createOpenStreetMapPlaceAdapter(options){
 options=options||{};
 const fetchImpl=typeof options.fetchImpl==='function'?options.fetchImpl:(typeof root.fetch==='function'?root.fetch.bind(root):null);
 const endpoint=endpointUrl(options.endpoint||DEFAULT_ENDPOINT);
 const timeoutMs=Number.isFinite(Number(options.timeoutMs))?Math.max(1000,Math.min(60000,Number(options.timeoutMs))):20000;
 const cacheTtlMs=Number.isFinite(Number(options.cacheTtlMs))?Math.max(0,Number(options.cacheTtlMs)):900000;
 const now=typeof options.now==='function'?options.now:()=>Date.now();
 const cache=new Map(),inflight=new Map();
 async function searchPlaces(input){
  input=input||{};
  const bbox=normalizeBbox(input.bbox);
  if(!bbox)return {status:'invalid-query',places:[],graph:{nodes:[],edges:[]},warnings:['Bounding box ungültig. Erwartet: [Süd, West, Nord, Ost]; Antimeridian-Überschreitungen werden nicht unterstützt.'],diagnostics:{provider:'openstreetmap-overpass'}};
  const requested=Array.isArray(input.categories)&&input.categories.length?input.categories:['settlements','attractions','accommodation','nature'];
  if(requested.some(c=>!Object.prototype.hasOwnProperty.call(CATEGORY_RULES,c)))return {status:'invalid-query',places:[],graph:{nodes:[],edges:[]},warnings:['Unbekannte Ortskategorie.'],diagnostics:{provider:'openstreetmap-overpass'}};
  const categories=[...new Set(requested)].sort();
  const limit=Math.max(1,Math.min(250,Number.isInteger(Number(input.limit))?Number(input.limit):120));
  const timeoutSeconds=Math.max(5,Math.min(25,Math.ceil(timeoutMs/1000)));
  const key=JSON.stringify({bbox,categories,limit,timeoutSeconds});
  const cached=cache.get(key),nowValue=Number(now());
  if(cached&&cacheTtlMs>0&&nowValue-cached.savedAt<cacheTtlMs){const result=clone(cached.result);result.diagnostics.cache='hit';return result;}
  if(inflight.has(key)){const result=clone(await inflight.get(key));result.diagnostics.cache='inflight';return result;}
  if(!fetchImpl)return {status:'unavailable',places:[],graph:{nodes:[],edges:[]},warnings:['Fetch wird in dieser Umgebung nicht unterstützt.'],diagnostics:{provider:'openstreetmap-overpass',reason:'fetch-unavailable',retryable:false}};
  const task=(async()=>{
   const query=buildQuery(bbox,categories,limit,timeoutSeconds);
   let response,payload;
   const controller=typeof AbortController==='function'?new AbortController():null;
   const timer=controller?setTimeout(()=>controller.abort(),timeoutMs):null;
   try{
    response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','accept':'application/json'},body:new URLSearchParams({data:query}).toString(),signal:controller?controller.signal:undefined,cache:'no-store'});
    if(!response||response.ok!==true){
     const status=Number(response&&response.status)||0;
     return {status:'unavailable',places:[],graph:{nodes:[],edges:[]},warnings:[status===429?'Datenquelle drosselt Anfragen; bitte später erneut versuchen.':'OpenStreetMap-Datenquelle antwortete mit einem Fehler.'],diagnostics:{provider:'openstreetmap-overpass',reason:status===429?'rate-limited':'provider-http-error',httpStatus:status||null,retryable:status===429||status>=500}};
    }
    try{payload=await response.json();}catch(_){return {status:'unavailable',places:[],graph:{nodes:[],edges:[]},warnings:['Datenquelle lieferte kein gültiges JSON.'],diagnostics:{provider:'openstreetmap-overpass',reason:'invalid-json',retryable:true}};}
   }catch(error){
    const timedOut=error&&error.name==='AbortError';
    return {status:'unavailable',places:[],graph:{nodes:[],edges:[]},warnings:[timedOut?'Overpass-Zeitlimit erreicht. Bitte später erneut versuchen.':'OpenStreetMap-Datenquelle ist gerade nicht erreichbar.'],diagnostics:{provider:'openstreetmap-overpass',reason:timedOut?'timeout':'network-error',retryable:true}};
   }finally{if(timer)clearTimeout(timer);}
   if(!isObject(payload)||!Array.isArray(payload.elements)||payload.remark){
    return {status:'unavailable',places:[],graph:{nodes:[],edges:[]},warnings:['Datenquelle lieferte eine unvollständige oder fehlerhafte Antwort.'],diagnostics:{provider:'openstreetmap-overpass',reason:'invalid-response',retryable:true}};
   }
   const source=makeSource(Number(now()),endpoint),places=normalizeElements(payload.elements,source,limit);
   const result={status:places.length?'ok':'empty',places,graph:{nodes:places,edges:[]},source,warnings:places.length?[]:['Keine benannten Orte in diesem Suchgebiet gefunden.'],diagnostics:{provider:'openstreetmap-overpass',bbox,requestedLimit:limit,returnedCount:places.length,categories,cache:'miss',transportEdgesAdded:false,faresAdded:false,schedulesAdded:false}};
   if(cacheTtlMs>0)cache.set(key,{savedAt:Number(now()),result:clone(result)});
   return result;
  })();
  inflight.set(key,task);
  try{return clone(await task);}finally{inflight.delete(key);}
 }
 return {searchPlaces,clearCache:()=>cache.clear(),provider:'openstreetmap-overpass'};
}
const api={createOpenStreetMapPlaceAdapter,buildQuery,normalizeBbox};
root.TheWornRoadRouteSources=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);