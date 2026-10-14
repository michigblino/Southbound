/* Travel-day boundary flights: recorded intent only; no invented airports or fares. */
(function(root){'use strict';
const lex=(s)=>String(s||'').trim();
const fold=s=>lex(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cityNames={
 MUC:['münchen','munich'],FRA:['frankfurt'],BER:['berlin'],VIE:['wien','vienna'],ZRH:['zürich','zurich','zuerich'],
 GRU:['são paulo','sao paulo'],GIG:['rio de janeiro'],SSA:['salvador'],SCL:['santiago'],EZE:['buenos aires'],
 LIM:['lima'],MDE:['medellín','medellin'],MVD:['montevideo'],CUZ:['cusco']
};
function airportFrom(place,airports){
 const input=fold(place),code=lex(place).toUpperCase();
 const catalog=Array.isArray(airports)?airports:[];
 // Require a separated IATA code; never mistake an arbitrary capital word for an airport.
 const found=catalog.find(a=>new RegExp('(?:^|[^A-Z])'+a[0]+'(?:$|[^A-Z])').test(code));
 if(found)return found;
 const match=Object.entries(cityNames).find(([c,names])=>catalog.some(a=>a[0]===c)&&names.some(n=>input.includes(fold(n))));
 return match?catalog.find(a=>a[0]===match[0]):null;
}
function flightDisplay({bookings=[],stages=[],airports=[]}={}){
 const all=Array.isArray(bookings)?bookings:[],route=Array.isArray(stages)?stages:[];
 const kinds=[{key:'inbound',title:'Anreise',field:'journeyOrigin'},{key:'return',title:'Abreise',field:'journeyReturn'}];
 return kinds.flatMap(({key,title,field})=>{
  const b=all.find(x=>x&&x.type==='transport'&&x[field]===true&&x.status!=='cancelled');
  if(!b)return [];
  const stop=route.find(x=>x.i===b.stageId&&!x.isReturn)||(key==='inbound'?route.find(x=>!x.isReturn):[...route].reverse().find(x=>!x.isReturn));
  const stageLocation=stop&&Number.isFinite(Number(stop.lat))&&Number.isFinite(Number(stop.lng))?{lat:Number(stop.lat),lng:Number(stop.lng)}:null;
  const extName=key==='inbound'?b.originPlace:b.destinationPlace;
  const external=airportFrom(extName,airports);
  const airportLoc=external?{lat:Number(external[2]),lng:Number(external[3])}:null;
  const from=key==='inbound'?airportLoc:stageLocation,to=key==='inbound'?stageLocation:airportLoc;
  const startName=key==='inbound'?lex(b.originPlace):lex(b.originPlace)||lex(stop?.name);
  const destName=key==='inbound'?lex(stop?.name)||lex(b.destinationPlace):lex(b.destinationPlace);
  const isFlight=b.travelMode==='flight';
  return [{id:lex(b.id),key,title,mode:isFlight?'Flug':'Transfer',
   fromName:startName,toName:destName,date:lex(b.startDate),arrival:lex(b.arrivalDate),
   status:b.status,verified:b.status==='confirmed',provider:lex(b.provider),
   amount:Number.isFinite(Number(b.totalEUR))&&b.totalEUR!==null?Number(b.totalEUR):null,
   drawable:!!(from&&to),from,to,arc:isFlight&&!!(from&&to),
   warning:airportLoc?'Vereinfachte Luftlinie zum Flughafen, kein bestätigter Flugweg.':'Externer Flughafen nicht zugeordnet; kein Flugweg eingezeichnet.'}];
 });
}
root.SouthboundJourneyFlights={airportFrom,flightDisplay};
if(typeof module!=='undefined'&&module.exports)module.exports=root.SouthboundJourneyFlights;
})(typeof globalThis!=='undefined'?globalThis:this);
