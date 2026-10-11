/* Deterministic comparison of route variants; estimates are not live fares. */
(function(g){'use strict';
function compare({stops,order=[],excluded={},days={},quotes={},vol={},volunteerDetails={},start='2026-12-28',fx=0,transport,planner,candidates=[]}){
 if(!transport?.estimate||!planner?.plan)return [];
 const ids=(order.length?order:stops.map((_,i)=>i)).filter(i=>stops[i]&&!excluded[i]);
 if(ids.length<2)return [];
 const existing=new Set(stops.map(s=>String(s[0]).toLocaleLowerCase('de')));
 const available=candidates.filter(c=>!existing.has(c.name.toLocaleLowerCase('de')));
 const models=[];
 function score(selected,after){
  const extraStops=selected.map(c=>[c.name,c.country,c.lat,c.lon,c.days,c.bed,c.food,c.activity,c.other,0,0,'Ungeprüft','',c.name]);
  const all=stops.concat(extraStops),activeOrder=ids.slice(),insert=activeOrder.indexOf(after);
  if(insert<0)return;
  activeOrder.splice(insert+1,0,...extraStops.map((_,k)=>stops.length+k));
  const override={...days};extraStops.forEach((s,k)=>override[stops.length+k]=s[4]);
  const p=planner.plan({stops:all,start,fx,quotes,vol,volunteerDetails,days:override,order:activeOrder});
  const lodgingFood=p.items.reduce((n,x)=>n+x.stay,0);
  const transportCost=p.items.reduce((n,x)=>n+(Number(x.leg)||0),0);
  const transportHours=activeOrder.slice(1).reduce((n,id,k)=>n+(Number(transport.estimate(all[activeOrder[k]],all[id]).hours)||0),0);
  const cost=lodgingFood+transportCost;
  const extraDays=selected.reduce((n,c)=>n+c.days,0);
  return {selected:selected.map(c=>c.name),additions:extraStops,order:activeOrder,after,total:cost,stay:lodgingFood,transport:transportCost,transportHours,days:p.items.reduce((n,x)=>n+x.days,0),extraDays,finish:p.finish};
 }
 const base=score([],ids[0]);if(!base)return [];
 models.push(base);
 // Candidate stops must lie near an existing travel leg, not at an arbitrary named country.
 const rad=Math.PI/180,km=(x,y)=>{const dlat=(y[2]-x[2])*rad,dlon=(y[3]-x[3])*rad,v=Math.sin(dlat/2)**2+Math.cos(x[2]*rad)*Math.cos(y[2]*rad)*Math.sin(dlon/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(v)))};
 const anchors=ids.slice(0,-1).map((id,k)=>({id,next:ids[k+1]}));
 for(const {id,next} of anchors){
  const a=stops[id],b=stops[next],direct=km(a,b);if(!Number.isFinite(direct)||direct<35)continue;
  const near=available.map(c=>({c,s:[c.name,c.country,c.lat,c.lon]})).filter(({s})=>{const extra=km(a,s)+km(s,b)-direct;return extra<=Math.max(55,Math.min(180,direct*.3))&&km(a,s)>12&&km(s,b)>12}).slice(0,5);
  for(const {c} of near){const m=score([c],id);if(m)models.push(m)}
  for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){
   for(const pair of [[near[i].c,near[j].c],[near[j].c,near[i].c]]){
    const extra=km(a,[pair[0].name,pair[0].country,pair[0].lat,pair[0].lon])+km([pair[0].name,pair[0].country,pair[0].lat,pair[0].lon],[pair[1].name,pair[1].country,pair[1].lat,pair[1].lon])+km([pair[1].name,pair[1].country,pair[1].lat,pair[1].lon],b)-direct;
    if(extra>Math.max(55,Math.min(180,direct*.3)))continue;
    const m=score(pair,id);if(m)models.push(m);
   }
  }
 }
 const nonzero=models.filter(x=>x.selected.length);
 const cheapest=nonzero.slice().sort((a,b)=>a.total-b.total||a.extraDays-b.extraDays)[0];
 const balanced=nonzero.filter(x=>x.selected.length>=2).sort((a,b)=>a.total-b.total)[0]||cheapest;
 const rich=nonzero.slice().sort((a,b)=>b.selected.length-a.selected.length||a.total-b.total)[0];
 const options=[{id:'budget',label:'Am günstigsten',description:'Deine bisherige Route ohne zusätzliche Stopps',...base},{id:'balanced',label:'Beste Preis-Leistung',description:'Mehr Erlebnisse mit überschaubarem Aufpreis',...(balanced||base)},{id:'experience',label:'Mehr entdecken',description:'Mehr Orte und Zeit zum Entdecken',...(rich||balanced||base)}];
 return options.map(x=>({...x,delta:Math.round(x.total-base.total),available:x.selected.length>0||x.id==='budget',baseTotal:base.total,estimated:true}));
}
g.SouthboundRouteCompare={compare};
})(typeof window!=='undefined'?window:globalThis);
