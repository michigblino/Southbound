/* Route-position alternatives. All transport amounts are unverified distance-model estimates. */
(function(g){'use strict';
function analyze({stops,order=[],excluded={},visited={},current=0,transport,minSaving=20,days={},vol={},volunteerDetails={}}){
 const ids=(order.length?order:stops.map((_,i)=>i)).filter(i=>stops[i]&&!excluded[i]);
 if(ids.length<3||!transport?.estimate)return [];
 const cache=new Map(),leg=(a,b)=>{const key=a+':'+b;if(!cache.has(key))cache.set(key,transport.estimate(stops[a],stops[b]));return cache.get(key)};
 const cost=seq=>seq.slice(1).reduce((sum,id,k)=>sum+leg(seq[k],id).mid,0);
 const original=cost(ids),result=[];const anchored=ids.filter(i=>vol[i]===true&&volunteerDetails[i]?.confirmed===true);const offsets=seq=>{let day=0;const map=new Map();for(const i of seq){map.set(i,day);day+=Math.max(1,Math.round(Number(days[i]??stops[i][4])||1))}return map};const originalOffsets=offsets(ids);
 const currentPos=ids.indexOf(current);const firstLocked=ids.findIndex((i,k)=>!visited[i]&&(currentPos<0||k>=currentPos));
 if(firstLocked<0)return [];
 const movableStart=Math.max(1,firstLocked);
 for(let from=movableStart;from<ids.length;from++){
  const i=ids[from];if(visited[i])continue;
  for(let to=movableStart;to<ids.length;to++){
   if(to===from)continue;
   const candidate=ids.slice();candidate.splice(from,1);candidate.splice(to,0,i);
   if(anchored.length){const nextOffsets=offsets(candidate);if(anchored.some(id=>originalOffsets.get(id)!==nextOffsets.get(id)))continue}const before=original,after=cost(candidate),saving=before-after;
   if(saving<minSaving)continue;
   const newNeighbors=[candidate[to-1],candidate[to+1]].filter(x=>x!==undefined);
   const oldLegs=ids.slice(1).map((v,k)=>[ids[k],v]);
   const newLegs=candidate.slice(1).map((v,k)=>[candidate[k],v]);
   const changed=newLegs.filter(([a,b])=>!oldLegs.some(([c,d])=>a===c&&b===d));
   const hoursBefore=oldLegs.reduce((n,[a,b])=>n+leg(a,b).hours,0),hoursAfter=newLegs.reduce((n,[a,b])=>n+leg(a,b).hours,0);
   result.push({id:'move-'+i+'-'+to,kind:'move',i,to,from,saving:Math.round(saving),before:Math.round(before),after:Math.round(after),timeChange:Math.round(hoursAfter-hoursBefore),proposedOrder:candidate.slice(),changed:changed.map(([a,b])=>({from:stops[a][0],to:stops[b][0],mode:leg(a,b).mode,low:leg(a,b).low,high:leg(a,b).high})),title:stops[i][0]+' umplatzieren',gain:'Transportmodell: rund '+Math.round(saving)+' € weniger für die gesamte Verbindungskette',loss:'Andere Reisedaten, mögliche Umwege, Saison, Sicherheit und Verfügbarkeit prüfen. Bestätigte Volunteering-Ankünfte bleiben unverändert.',confidence:'niedrig · Distanzmodell, keine bestätigten Tickets',detail:'Vorher '+Math.round(before)+' €, nachher '+Math.round(after)+' € geschätzte Transportkosten. Reisezeitänderung '+Math.round(hoursAfter-hoursBefore)+' h (Modell). Neue Nachbarn: '+newNeighbors.map(j=>stops[j][0]).join(' / ')+'. Geänderte Verbindungen: '+changed.map(x=>x.from+' → '+x.to+' ('+x.mode+', '+Math.round(x.low)+'–'+Math.round(x.high)+' €)').join('; ')+'. Nicht automatisch als sicher oder buchbar bestätigt.'});
  }
 }
 return result.sort((a,b)=>b.saving-a.saving).filter((x,idx,arr)=>arr.findIndex(y=>y.i===x.i)===idx).slice(0,5);
}
g.SouthboundRoutePosition={analyze};
})(typeof window!=='undefined'?window:globalThis);
