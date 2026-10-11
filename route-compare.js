/* Deterministic comparison of route variants; estimates are not live fares. */
(function(g){'use strict';
function compare({stops,order=[],excluded={},days={},quotes={},vol={},volunteerDetails={},start='2026-12-28',fx=0,transport,planner,candidates=[]}){
 if(!transport?.estimate||!planner?.plan)return [];
 const ids=(order.length?order:stops.map((_,i)=>i)).filter(i=>stops[i]&&!excluded[i]);
 if(ids.length<2)return [];
 const existing=new Set(stops.map(s=>String(s[0]).toLocaleLowerCase('de')));
 const available=candidates.filter(c=>!existing.has(c.name.toLocaleLowerCase('de')));
 const raw=order.length?order.slice():stops.map((_,i)=>i);
 const existingIds=new Set(ids);
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
 // Search the Buenos Aires segment and adjacent legs; the insertion must not change the original route order.
 const anchors=ids.filter((id,k)=>k<ids.length-1&&(/Buenos Aires/i.test(stops[id][0])||/Buenos Aires/i.test(stops[ids[k+1]][0])||stops[id][1]==='Uruguay'||stops[ids[k+1]][1]==='Uruguay'));
 if(/Buenos Aires/i.test(stops[ids.at(-1)][0]))anchors.push(ids.at(-1));
 const unique=[...new Set(anchors)];
 for(const anchor of unique){
  for(let mask=1;mask<(1<<available.length);mask++){
   const subset=available.filter((_,k)=>mask&(1<<k));if(subset.length>3)continue;
   const permutations=(xs)=>xs.length<2?[xs]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(p=>[x,...p]));
   for(const permutation of permutations(subset)){const m=score(permutation,anchor);if(m)models.push(m)}
  }
 }
 const nonzero=models.filter(x=>x.selected.length);
 const cheapest=nonzero.slice().sort((a,b)=>a.total-b.total||a.extraDays-b.extraDays)[0];
 const balanced=nonzero.filter(x=>x.selected.length>=2).sort((a,b)=>(a.total-base.total)/Math.max(1,a.selected.length*2+a.extraDays*.3)-(b.total-base.total)/Math.max(1,b.selected.length*2+b.extraDays*.3)||a.total-b.total)[0]||cheapest;
 const rich=nonzero.filter(x=>x.selected.length>=3).sort((a,b)=>a.total-b.total)[0]||nonzero.slice().sort((a,b)=>b.selected.length-a.selected.length||a.total-b.total)[0];
 const options=[{id:'budget',label:'Am günstigsten',description:'Deine bisherige Route ohne zusätzliche Stopps',...base},{id:'balanced',label:'Beste Preis-Leistung',description:'Mehr Erlebnisse mit überschaubarem Aufpreis',...(balanced||base)},{id:'experience',label:'Mehr entdecken',description:'Mehr Orte und Zeit zum Entdecken',...(rich||balanced||base)}];
 return options.map(x=>({...x,delta:Math.round(x.total-base.total),available:x.selected.length>0||x.id==='budget',baseTotal:base.total,estimated:true}));
}
g.SouthboundRouteCompare={compare};
})(typeof window!=='undefined'?window:globalThis);
