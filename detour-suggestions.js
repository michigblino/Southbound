/* Regional optional-stop discovery for the existing South America trip.
   Estimated costs are heuristic; no ferry fare or hotel availability is guaranteed. */
(function(g){'use strict';
const candidates=[
{name:'Colonia del Sacramento',country:'Uruguay',lat:-34.4714,lon:-57.8442,days:1,bed:22,food:19,activity:10,other:5,why:'UNESCO-Altstadt und kurzer Fährweg ab Buenos Aires; besonders sinnvoll als Tagesausflug oder kurze Etappe',tags:'Kultur, Altstadt, Fähre'},
{name:'Montevideo',country:'Uruguay',lat:-34.9011,lon:-56.1645,days:3,bed:25,food:20,activity:10,other:6,why:'Rambla, Ciudad Vieja und uruguayische Hauptstadt; über Colonia per Bus/Fähre erreichbar',tags:'Stadt, Küste, Kultur'},
{name:'Punta del Este',country:'Uruguay',lat:-34.9667,lon:-54.95,days:2,bed:29,food:23,activity:13,other:6,why:'Atlantikstrände; saisonal teurer und ein größerer Abstecher',tags:'Strand, Küste'}
];
function find({stops,order=[],excluded={},transport,limit=4,maxExtra=220}){
 const ids=(order.length?order:stops.map((_,i)=>i)).filter(i=>stops[i]&&!excluded[i]);if(ids.length<2||!transport?.estimate)return [];
 const existing=new Set(stops.map(s=>String(s[0]).toLocaleLowerCase('de')));
 const leg=(a,b)=>transport.estimate(a,b);
 const results=[];
 for(const c of candidates){if(existing.has(c.name.toLocaleLowerCase('de')))continue;
 const s=[c.name,c.country,c.lat,c.lon,c.days,c.bed,c.food,c.activity,c.other,0,0,'Ungeprüft','',c.name];
 let best=null;
 for(let k=0;k<ids.length-1;k++){
  const a=stops[ids[k]],b=stops[ids[k+1]];
  if(!a||!b||!(['Argentinien','Uruguay'].includes(a[1])||['Argentinien','Uruguay'].includes(b[1])))continue;
  const before=leg(a,b),first=leg(a,s),second=leg(s,b),delta=first.mid+second.mid-before.mid,stay=c.days*(c.bed+c.food+c.activity+c.other),extra=Math.round(delta+stay);
  if(!Number.isFinite(extra)||extra>maxExtra||extra<0)continue;
  const candidate={name:c.name,country:c.country,stop:s,after:ids[k],before:ids[k+1],extra,transportExtra:Math.round(delta),stay:Math.round(stay),days:c.days,why:c.why,tags:c.tags,confidence:'niedrig · modellierte Verbindungen, Unterkunft und Aktivitäten',warning:'Fährverbindungen und Busanschlüsse sowie tatsächliche Preise vor Buchung prüfen.'};
  if(!best||candidate.extra<best.extra)best=candidate;
 }
 if(best)results.push(best);
 }
 return results.sort((a,b)=>a.extra-b.extra).slice(0,limit)
}
g.SouthboundDetours={find,candidates};
})(typeof window!=='undefined'?window:globalThis);
