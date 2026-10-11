/* Southbound route engine v1: pure functions, no network or credentials. */
(function(g){
'use strict';
const MS=60000;
const date=v=>{const n=Date.parse(v);return Number.isFinite(n)?n:null};
const money=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function validateOffer(o,now=Date.now()){
 if(!o||!Number.isInteger(o.from)||!Number.isInteger(o.to)||o.to<=o.from)return {ok:false,why:'Ungültige Etappe'};
 if(!['bus','flight','train','ferry','shuttle'].includes(o.mode))return {ok:false,why:'Verkehrsmittel fehlt'};
 if(!o.operator||!o.source||!/^https:\/\//i.test(o.source))return {ok:false,why:'Anbieter und HTTPS-Quelle fehlen'};
 if(money(o.price)===null||money(o.fees??0)===null)return {ok:false,why:'Preis fehlt'};
 const depart=date(o.depart),arrive=date(o.arrive);
 if(depart===null||arrive===null||arrive<=depart)return {ok:false,why:'Ungültige Fahrzeiten'};
 if(!o.checkedAt||date(o.checkedAt)===null)return {ok:false,why:'Prüfdatum fehlt'};
 if(date(o.checkedAt)>now+MS*10)return {ok:false,why:'Prüfdatum liegt in der Zukunft'};
 if(o.safety!=='reviewed')return {ok:false,why:'Sicherheitsprüfung offen'};
 if(o.bookable!==true)return {ok:false,why:'Buchbarkeit nicht bestätigt'};
 return {ok:true,depart,arrive,price:Number(o.price)+Number(o.fees||0)};
}
function optimize({stops,offers,departure,goal,baseline,reserve=0,minTransferMinutes=120,now=Date.now()}){
 const route=stops.filter(s=>s.active!==false);
 if(!route.length)return {status:'empty',variants:[],missing:[]};
 const start=date(departure),missing=[],edges=[];
 if(start===null)return {status:'invalid-departure',variants:[],missing:[]};
 for(let i=1;i<route.length;i++){
  const from=route[i-1],to=route[i];
  const candidates=offers.map(o=>({o,v:validateOffer(o,now)})).filter(x=>x.o.from===from.id&&x.o.to===to.id&&x.v.ok).map(x=>({...x.o,price:x.v.price,departMs:x.v.depart,arriveMs:x.v.arrive}));
  if(!candidates.length)missing.push({from:from.id,to:to.id,fromName:from.name,toName:to.name,reason:'Keine geprüfte, buchbare Direktverbindung mit Fahrzeiten'});
  edges.push(candidates);
 }
 // Dynamic programming with Pareto pruning over total costs and arrival time.
 let states=[{cost:0,at:start,legs:[],unverified:0}];
 for(let i=1;i<route.length;i++){
  const prev=route[i-1],stay=Number(prev.days)||0,earliestStay=stay*86400000;
  const next=[];
  for(const s of states)for(const e of edges[i-1]){
   const minDepart=s.at+earliestStay+(i===1?0:minTransferMinutes*MS);
   if(e.departMs<minDepart)continue;
   const extraNights=Math.max(0,Math.floor((e.departMs-minDepart)/86400000));
   const waiting=extraNights*(Number(prev.dailyCost)||0);
   const overnight=e.arriveMs-e.departMs>=6*3600000&&new Date(e.departMs).getHours()>=18;
   const avoidBed=overnight&&!prev.volunteering?Math.max(0,Number(prev.lodging)||0):0;
   const legCost=e.price+waiting-avoidBed;
   next.push({cost:s.cost+legCost,at:e.arriveMs,legs:s.legs.concat([{from:prev.name,to:route[i].name,operator:e.operator,mode:e.mode,depart:e.depart,arrive:e.arrive,price:e.price,extraNights,waiting,avoidBed,net:legCost,source:e.source}]),unverified:0});
  }
  // Keep cheapest states per arrival-day bucket; cap search width.
  const best=new Map();for(const s of next){const k=Math.floor(s.at/86400000);if(!best.has(k)||s.cost<best.get(k).cost)best.set(k,s)}
  states=[...best.values()].sort((a,b)=>a.cost-b.cost).slice(0,100);
  if(!states.length)break;
 }
 const fixed=route.reduce((n,s)=>n+Math.max(0,Number(s.days)||0)*Math.max(0,Number(s.dailyCost)||0),0)+Number(reserve||0);
 const variants=states.sort((a,b)=>a.cost-b.cost).slice(0,3).map(s=>({...s,total:fixed+s.cost,saving:Number(baseline)-(fixed+s.cost),gap:Math.max(0,fixed+s.cost-Number(goal)),complete:missing.length===0}));
 return {status:missing.length?'incomplete':variants.length?'ok':'no-feasible-connections',variants,missing,assumptions:['Nur bestätigte Angebote; keine automatische Live-Abfrage','Anschlusszeiten und zusätzliche Warteübernachtungen berücksichtigt','Ankunfts- und Abfahrtszeiten müssen Zeitzonen-Offsets enthalten','Sicherheit nur manuell geprüft, nicht garantiert']};
}
g.SouthboundRouteEngine={validateOffer,optimize};
})(typeof window!=='undefined'?window:globalThis);
