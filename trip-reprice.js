/* Reprice *all* liabilities per proposed route; no subtotal-minus-tip shortcuts.
 * Conditional host nights are NEVER confirmations or provider-priced offers.
 */
(function(g){'use strict';
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const pos=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const expense=entry=>{const e=entry||{};return ['lodging','transport','food','other'].reduce((a,k)=>a+(pos(e[k])||0),0)
 +(Array.isArray(e.activities)?e.activities.reduce((a,x)=>a+(pos(x?.cost)||0),0):0)};
function reprice({stops=[],start='2026-12-28',fx=0,quotes={},transportOffers={},vol={},volunteerDetails={},
 excluded={},days={},order=[],bookings=[],actuals={},extraPaid=0,reserve=0,goal=8000,cap=12000,
 fixedCosts={},completed={},transferDaysByStop={},originRequired=false,unrecorded=0,proposal=null}={}){
 const itinerary=g.SouthboundItinerary,ledgerModule=g.SouthboundBookingLedger,timingModule=g.SouthboundRouteTiming,budgetModule=g.SouthboundRouteBudget;
 if(!itinerary||!ledgerModule||!timingModule||!budgetModule)throw Error('Repricing dependencies unavailable');
 const appliedDays={...days},appliedExcluded={...excluded},locked=new Set(),warnings=[];
 const originalIds=(order.length?order:stops.map((_,i)=>i)).filter(i=>stops[i]&&!excluded[i]);
 const originalPrior=new Map(originalIds.map((id,k)=>[id,k?originalIds[k-1]:null]));
 const removed=[];
 for(const b of bookings||[])if(b&&(b.status==='confirmed'||(pos(b.paidEUR)||0)>(pos(b.refundedEUR)||0))&&Number.isInteger(b.stageId))locked.add(b.stageId);
 const hostProposal={};
 for(const id of proposal?.excludeIds||[]){
  if(!Number.isInteger(id)||!stops[id]||excluded[id]||locked.has(id)||completed[id]===true||
    (vol[id]===true&&volunteerDetails[id]?.confirmed===true)||stops[id][14]==='return'||
    id===originalIds[0]||id===originalIds.at(-1)){
   warnings.push('Etappe '+String(id)+' kann nicht ausgelassen werden');continue;
  }
  appliedExcluded[id]=true;removed.push(id);
 }
 for(const [key,value] of Object.entries(proposal?.dayOverrides||{})){
  const id=Number(key),n=pos(value);
  if(!Number.isInteger(id)||!Number.isInteger(n)||n<1||n>180||appliedExcluded[id]||locked.has(id)||completed[id]===true||
   (vol[id]===true&&volunteerDetails[id]?.confirmed===true)){
    warnings.push('Aufenthaltsänderung nicht zulässig: '+key);continue;
  }
  appliedDays[id]=n;
 }
 for(const a of proposal?.actions||[]){
  if(!Number.isInteger(a?.i)||locked.has(a.i)||completed[a.i]===true||(vol[a.i]===true&&volunteerDetails[a.i]?.confirmed===true)){
   warnings.push('Etappe '+String(a?.i)+' bereits gebucht oder abgeschlossen; Änderung nicht übernommen');continue;
  }
  if(!stops[a.i]||appliedExcluded[a.i]||stops[a.i][14]==='return')continue;
  const proposed=pos(a.to);
  if(proposed===null||!Number.isInteger(proposed)||proposed<1||proposed>180){warnings.push('Ungültige Aufenthaltsdauer: '+a.i);continue;}
  appliedDays[a.i]=proposed;
  if(a.hostNights>0){
   const nights=pos(a.hostNights);
   if(nights===null||!Number.isInteger(nights)||nights<21||nights>28||nights>proposed){
    warnings.push('Ungültige Host-Dauer: '+a.i);continue;
   }
   const hours=pos(volunteerDetails[a.i]?.hoursPerWeek??volunteerDetails[a.i]?.hours);
   if(hours!==null&&hours>30){warnings.push('Host-Stunden über 30: '+a.i);continue;}
   if((pos( (proposal.constraints||{}).maxHostDays)||28)<nights){warnings.push('Host-Limit überschritten: '+a.i);continue;}
   hostProposal[a.i]=nights;
  }
 }
 const planned=itinerary.plan({stops,start,fx,quotes,transportOffers,vol,volunteerDetails,excluded:appliedExcluded,days:appliedDays,order});
 const past=Object.fromEntries(planned.items.map(x=>[x.i,expense(actuals[x.i])]));
 const book=ledgerModule.reconcile({items:planned.items,bookings,vol,volunteerDetails,legacyPaidByStop:past,legacyActualsByStop:actuals,originRequired});
 const newConnections=[],adjustedItems=book.items.map((item,k)=>{
  if(k===0)return item;
  const prior=book.items[k-1].i;
  if(!removed.length||originalPrior.get(item.i)===prior)return item;
  newConnections.push({from:prior,to:item.i,fromName:book.items[k-1].name,toName:item.name});
  // Never implicitly "save" a fare by removing an intermediate stop.
  // A rerouted ticket needs route- and date-specific verification first.
  if(!item.transportOffer){
   warnings.push('new-connection-unpriced: '+prior+' → '+item.i);
   return {...item,leg:null,legMin:null,legMax:null,quality:'reroute-unpriced',
    transportNote:'Neue Direktverbindung ohne datiertes Ticket; Preis und Fahrzeit offen'};
  }
  return item;
 });
 const items=adjustedItems.map(item=>{
  const nights=hostProposal[item.i]||0;
  if(!nights)return item;
  const bed=pos(item.regularBed);
  if(bed===null){warnings.push('Host-Unterkunftskosten unbekannt: '+item.i);return item;}
  const stay=pos(item.stay);
  if(stay===null){warnings.push('Host-Aufenthalt unbekannt: '+item.i);return item;}
  return {...item,stay:round(Math.max(0,stay-nights*bed)),hypotheticalHostNights:nights,quality:'hypothetical-host'};
 });
 const time=timingModule.evaluate({items,start,stops,quotes,volunteerDetails,isVolunteer:i=>vol[i]===true,transferDaysByStop});
 const fixed={...fixedCosts};
 for(const [key,value] of Object.entries(book.fixedBookings||{}))if(['insurance','equipment','visas'].includes(key))fixed[key]=value.totalEUR;
 if(book.returnBooking)fixed.return=book.returnBooking.totalEUR;
 else if(items.at(-1)?.isReturn===true)fixed.return=0;
 const waitingPaid=Object.values(book.waitPaidByStop||{}).reduce((a,x)=>a+(pos(x)||0),0)
  +Object.values(book.typedPaidByStop||{}).reduce((a,x)=>a+(pos(x.wait)||0),0);
 const actualSpent=Object.values(actuals||{}).reduce((a,x)=>a+expense(x),0);
 const snapshot=budgetModule.snapshot({
  items,paid:round(actualSpent+(pos(extraPaid)||0)+book.extraPaid),reserve,goal,cap,fixedCosts:fixed,
  returnPaymentEUR:book.returnPaymentEUR,fixedPaymentEUR:book.fixedPaymentEUR,
  paidByStop:book.accountedPaidByStop,paymentAllocationsByStop:book.typedPaidByStop,
  completed,waitingCost:time.waiting.total,waitingComplete:time.waiting.complete,waitingPaid,
  timingFeasible:time.feasible,bookingIntegrity:book.bookingIntegrity,unrecorded
 });
 const hypothetical=Object.keys(hostProposal).length>0;
 const unsettled=[...warnings,...book.warnings.map(x=>x.reason),...snapshot.incompleteReasons];
 if(hypothetical)unsettled.push('volunteer-host-offers-unconfirmed');
 return {proposal:proposal?.mode||'current',items,planned,ledger:book,timing:time,snapshot,
  estimatedTotal:snapshot.totalEstimate,complete:snapshot.complete&&!hypothetical&&!warnings.length,
  verifiedTotal:false,hasHypotheticalHost:hypothetical,
  hostNights:Object.values(hostProposal).reduce((a,x)=>a+x,0),
  paidAlready:snapshot.paid,lockedStages:[...locked],warnings:unsettled,
  changedConnections:items.filter(x=>!x.isReturn&&x.leg===null).map(x=>x.i),
  newConnections,connectionUnpriced:newConnections.some(x=>items.find(i=>i.i===x.to)?.leg===null),
  removedStops:removed,
  priceInputs:{quotes,transportOffers,fixedCosts:fixed,bookings:book.records}};
}
function compare(params={},variants=[]){
 const baseline=reprice({...params,proposal:null});
 return {baseline,alternatives:(variants||[]).map(proposal=>{
  const result=reprice({...params,proposal});
  const modeledDelta=round(baseline.estimatedTotal-result.estimatedTotal);
  return {...result,mode:proposal.mode,name:proposal.name,actions:proposal.actions||[],
   daysDelta:result.items.filter(x=>!x.isReturn).reduce((a,x)=>a+x.days,0)-
    baseline.items.filter(x=>!x.isReturn).reduce((a,x)=>a+x.days,0),
   hypotheticalSaving:modeledDelta,forecast:result.estimatedTotal,
   remainingToGoal:Math.max(0,round(result.estimatedTotal-(pos(params.goal)||0))),
   blocked:result.warnings.filter(x=>/bereits gebucht|abgeschlossen|Ungültig|Host-Limit|Host-Stunden/.test(x))};
 })};
}
g.SouthboundTripReprice={reprice,compare,expense};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundTripReprice;
})(typeof window!=='undefined'?window:globalThis);
