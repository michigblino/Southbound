/* Goal viability & alternative route builder — no false "reachable" claim.
 * Never interprets incomplete totals as reliable upper bounds or verified live fares.
 */
(function(g){'use strict';
const money=x=>Math.round((x+Number.EPSILON)*100)/100;
const valid=x=>x!==null&&x!==undefined&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0?Number(x):null;
const protectedNature=/Patagon|Torres del Paine|Igua|Uyuni|Machu|Cusco|Atacama|Lenç|Huacachina|Chapada|Tayrona|Bariloche|Chaltén/i;
function verdict({baseline,alternatives=[],goal=8000}={}){
 const target=valid(goal)||0,base=baseline||{},total=valid(base.estimatedTotal),snap=base.snapshot||{};
 const paid=valid(snap.paid)||0,lowerBound=paid; // Sunk costs only. Never call an estimated fare an unavoidable minimum.
 const viable=alternatives.filter(x=>x&&valid(x.estimatedTotal)!==null&&
   x.snapshot?.complete===true&&x.hasHypotheticalHost!==true&&x.warnings?.length===0&&
   x.evidence?.providerVerified===true&&x.estimatedTotal<=target);
 const candidates=alternatives.filter(x=>x&&valid(x.estimatedTotal)!==null);
 const comparable=candidates.filter(x=>!x.connectionUnpriced&&!x.snapshot?.unknownTransfers?.length&&
  x.snapshot?.missingCount===0&&!x.warnings?.some(w=>/reconnected-leg|new-connection-unpriced/.test(String(w))));
 const cheapest=comparable.slice().sort((a,b)=>a.estimatedTotal-b.estimatedTotal)[0]||null;
 const optimism=candidates.slice().sort((a,b)=>a.estimatedTotal-b.estimatedTotal)[0]||null;
 const confirmedImpossibility=lowerBound>target;
 let status='insufficient-evidence',heading='Budgetziel noch nicht belegbar',message='Offene Preise und unbestätigte Hosts verhindern eine belastbare Aussage.';
 if(confirmedImpossibility){status='over-committed';heading='Zielbudget bereits durch Zahlungen überschritten';message='Schon die erfassten, nicht als erstattet markierten Ausgaben liegen über dem Ziel. Eine andere Route macht diese Zahlungen nicht rückgängig.';}
 else if(viable.length){status='supported-under-goal';heading='Ein Vorschlag ist preislich belegbar';message='Mindestens eine Variante hat vollständige belegte Anbieterpreise und liegt rechnerisch innerhalb des Ziels. Verfügbarkeit erneut prüfen.';}
 else if(total!==null&&total>target){status='over-model';heading='Mit dieser Route liegt das Ziel außerhalb der Modellrechnung';message='Die aktuelle Kostenschätzung liegt über dem Budgetziel. Das beweist noch keine Unmöglichkeit, zeigt aber, dass andere Stopps, günstigere Transfers oder längere bestätigte Hosts nötig wären.';}
 else if(total!==null&&total<=target){status='under-model';heading='Im Modell im Budget – noch nicht bestätigt';message='Unbekannte Kosten und nicht geprüfte Preise können die Summe erhöhen.';}
 return {status,heading,message,goal:target,baseline:total,gap:total===null?null:money(Math.max(0,total-target)),
  sunkCostFloor:lowerBound,hardImpossible:confirmedImpossibility,supportedGoal:viable.length>0,
  cheapestComparable:cheapest,optimisticIncomplete:optimism,
  modelNotReachable:total!==null&&total>target&&!comparable.some(x=>x.estimatedTotal<=target),
  variantsTested:candidates.length,priceWarnings:[...(snap.incompleteReasons||[])],
  statement:confirmedImpossibility?'Ausschließlich bereits erfasste Zahlungen sind höher als das gesamte Zielbudget.':
   'Die Aussage bezieht sich auf Modellpreise; fehlende oder veraltete Tarife erlauben keinen Nachweis des günstigsten real buchbaren Preises.'};
}
function alternatives({stops=[],items=[],bookings=[],excluded={},completed={},preferences={},vol={},volunteerDetails={}}={}){
 const candidates=items.filter(x=>x&&!x.isReturn&&Number.isInteger(x.i)&&!excluded[x.i]);
 const must=(String(preferences.mustVisit||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
 const locked=new Set(bookings.filter(b=>b&&(b.status==='confirmed'||Number(b.paidEUR)>Number(b.refundedEUR||0))&&Number.isInteger(b.stageId)).map(b=>b.stageId));
 const protects=x=>locked.has(x.i)||completed[x.i]===true||(vol[x.i]===true&&volunteerDetails[x.i]?.confirmed===true)
   ||must.some(n=>x.name.toLowerCase().includes(n));
 const safe=candidates.filter((x,i)=>i>0&&i<candidates.length-1&&!protects(x));
 const daily=x=>{const n=valid(x.days);const stay=valid(x.stay);return n&&stay!==null?stay/n:null};
 const excludeable=safe.filter(x=>valid(x.days)!==null&&x.days>=2&&x.days<=14&&!protectedNature.test(x.name)&&daily(x)!==null)
  .sort((a,b)=>(daily(b)-daily(a))||(b.days-a.days));
 const recipients=safe.filter(x=>x.days>=7&&daily(x)!==null).sort((a,b)=>daily(a)-daily(b));
 const results=[];
 function add(kind,removeIds){
  const removed=candidates.filter(x=>removeIds.includes(x.i));
  if(!removed.length)return;
  const remaining=recipients.filter(x=>!removeIds.includes(x.i)&&!protects(x));
  if(!remaining.length)return;
  const daysLeft=removed.reduce((sum,x)=>sum+x.days,0),changes={},maxPerStop=28;
  let left=daysLeft;
  for(const to of remaining){
   const room=Math.min(maxPerStop,180-to.days);
   if(room<1)continue;
   const give=Math.min(left,room);
   if(!give)continue;
   changes[to.i]=to.days+give;left-=give;if(!left)break;
  }
  if(left)return;
  const removedNames=removed.map(x=>x.name);
  results.push({mode:kind,kind:'reroute',name:kind==='regional'?'Weniger Zwischenstopps':'Ausgaben in günstigere Aufenthalte verlagern',
   description:'Stopps zur Prüfung herausnehmen; frei werdende Tage an vorhandenen günstigeren Orten verbringen.',
   excludeIds:removeIds,dayOverrides:changes,actions:remaining.filter(x=>changes[x.i]).map(x=>({i:x.i,to:changes[x.i],from:x.days,hostNights:0})),
   removedStops:removedNames,retainedDays:true,originalDays:candidates.reduce((a,x)=>a+x.days,0),
   inputKind:'model',requires:['Neuer Anschlussfahrpreis','Transferdauer und Sicherheit','Geänderte Daten','Unterkunftspreise für längeren Aufenthalt'],
   warning:'Neue Anschlussverbindungen bleiben bis zu einem passenden Ticketangebot preislich offen. Diese Alternative ist nicht als fertig kalkulierter Endpreis buchbar.'});
 }
 if(excludeable.length)add('redistribute',[excludeable[0].i]);
 if(excludeable.length>=2)add('regional',excludeable.slice(0,2).map(x=>x.i));
 return results;
}
g.SouthboundBudgetFeasibility={verdict,alternatives};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundBudgetFeasibility;
})(typeof window!=='undefined'?window:globalThis);
