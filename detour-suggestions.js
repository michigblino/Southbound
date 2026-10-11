/* Regional optional-stop discovery for the existing South America trip.
   Estimated costs are heuristic; no ferry fare or hotel availability is guaranteed. */
(function(g){'use strict';
const candidates=[
{"name":"Florianópolis","country":"Brasilien","lat":-27.5954,"lon":-48.548,"days":3,"bed":22,"food":17,"activity":10,"other":6,"why":"Strände und Natur auf der südbrasilianischen Küstenroute","tags":"Natur, Kultur"},
{"name":"Curitiba","country":"Brasilien","lat":-25.4284,"lon":-49.2733,"days":2,"bed":18,"food":16,"activity":8,"other":5,"why":"Parks und Stadtstopp entlang der Südroute","tags":"Natur, Kultur"},
{"name":"Punta del Diablo","country":"Uruguay","lat":-34.044,"lon":-53.54,"days":2,"bed":24,"food":19,"activity":10,"other":5,"why":"Küstenort mit Stränden","tags":"Natur, Kultur"},
{"name":"Cabo Polonio","country":"Uruguay","lat":-34.402,"lon":-53.789,"days":2,"bed":26,"food":20,"activity":10,"other":6,"why":"Dünenlandschaft und Atlantikküste","tags":"Natur, Kultur"},
{"name":"Salta","country":"Argentinien","lat":-24.7859,"lon":-65.4117,"days":3,"bed":18,"food":16,"activity":10,"other":5,"why":"Andenlandschaften und Kultur","tags":"Natur, Kultur"},
{"name":"Jujuy","country":"Argentinien","lat":-24.1858,"lon":-65.2995,"days":2,"bed":17,"food":15,"activity":10,"other":5,"why":"Zugang zur Quebrada de Humahuaca","tags":"Natur, Kultur"},
{"name":"Arequipa","country":"Peru","lat":-16.3989,"lon":-71.535,"days":3,"bed":17,"food":15,"activity":11,"other":5,"why":"Altstadt und Vulkanlandschaften","tags":"Natur, Kultur"},
{"name":"Valparaíso","country":"Chile","lat":-33.0472,"lon":-71.6127,"days":2,"bed":24,"food":18,"activity":10,"other":6,"why":"Hafenstadt und Street Art","tags":"Natur, Kultur"},
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
 for(let k=0;k<ids.length;k++){
  const a=stops[ids[k]],b=ids[k+1]===undefined?null:stops[ids[k+1]];
  if(!a||!(['Argentinien','Uruguay'].includes(a[1])||(b&&['Argentinien','Uruguay'].includes(b[1]))))continue;
  const before=b?leg(a,b).mid:0,first=leg(a,s),second=b?leg(s,b).mid:0,delta=first.mid+second-before,stay=c.days*(c.bed+c.food+c.activity+c.other),extra=Math.round(delta+stay);
  if(!Number.isFinite(extra)||extra>maxExtra)continue;
  const candidate={name:c.name,country:c.country,stop:s,after:ids[k],before:ids[k+1]??null,extra,transportExtra:Math.round(delta),stay:Math.round(stay),days:c.days,why:c.why,tags:c.tags,confidence:'niedrig · modellierte Verbindungen, Unterkunft und Aktivitäten',warning:'Fährverbindungen und Busanschlüsse sowie tatsächliche Preise vor Buchung prüfen.'};
  if(!best||candidate.extra<best.extra)best=candidate;
 }
 if(best)results.push(best);
 }
 return results.sort((a,b)=>a.extra-b.extra).slice(0,limit)
}
g.SouthboundDetours={find,candidates};
})(typeof window!=='undefined'?window:globalThis);
