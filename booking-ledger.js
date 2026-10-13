/* Southbound booking ledger v1.
 * Local, user-entered records ONLY. Neither live bookability nor provider verification.
 * All API results and payment imports must later pass explicit provenance validation.
 */
(function(g){'use strict';
const finance=g.SouthboundBookingFinance||(typeof require==='function'?require('./booking-finance.js'):null);
const TYPES=['transport','lodging','volunteering','activity'];
const STATES=['planned','requested','confirmed','cancelled'];
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const date=v=>{if(typeof v!=='string'||!ISO.test(v))return false;const t=Date.parse(v+'T12:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v};
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
const integer=n=>Number.isInteger(n)&&n>=0;
const nights=(start,end)=>Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
function validate(raw){
 const errors=[];
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {ok:false,errors:['invalid-record'],record:null};
 const type=raw.type,status=raw.status,converted=finance.normalize(raw),total=converted.totalEUR,paid=converted.paidEUR,refunded=converted.refundedEUR;
 errors.push(...converted.errors);
 if(!TYPES.includes(type))errors.push('invalid-type');
 if(!STATES.includes(status))errors.push('invalid-status');
 if(!integer(raw.stageId))errors.push('invalid-stage');
 if(typeof raw.id!=='string'||!raw.id.trim()||raw.id.length>100)errors.push('invalid-id');
 if(typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>160)errors.push('invalid-title');
 if(typeof raw.provider!=='string'||!raw.provider.trim()||raw.provider.length>160)errors.push('invalid-provider');
 if(raw.startDate&&!date(raw.startDate))errors.push('invalid-start-date');
 if(raw.endDate&&!date(raw.endDate))errors.push('invalid-end-date');
 if(date(raw.startDate)&&date(raw.endDate)&&raw.endDate<=raw.startDate)errors.push('invalid-date-range');
 const inbound=type==='transport'&&raw.journeyOrigin===true;
 const outbound=type==='transport'&&raw.journeyReturn===true;
 const travelMode=type==='transport'&&raw.travelMode==='flight'?'flight':'ground';
 const originPlace=String(raw.originPlace||'').trim().slice(0,160);
 const destinationAirport=String(raw.destinationAirport||'').trim().slice(0,120);
 const arrivalDate=String(raw.arrivalDate||'');
 if(inbound&&outbound)errors.push('conflicting-journey-direction');
 if(type==='transport'&&!inbound&&!outbound&&!integer(raw.fromStageId))errors.push('invalid-origin');
 if(inbound||outbound){
  if(!originPlace)errors.push('external-journey-origin-required');
  if(!date(arrivalDate)||(date(raw.startDate)&&arrivalDate<raw.startDate))errors.push('invalid-external-arrival');
 }
 const destinationPlace=String(raw.destinationPlace||'').trim().slice(0,160);
 if(outbound&&!destinationPlace)errors.push('return-destination-required');
 if(travelMode!=='flight'&&Array.isArray(raw.stopovers)&&raw.stopovers.length)errors.push('stopovers-only-for-flights');
 const stopovers=Array.isArray(raw.stopovers)?raw.stopovers:[];
 if(raw.stopovers!==undefined&&!Array.isArray(raw.stopovers))errors.push('invalid-stopovers');
 if(stopovers.length>8)errors.push('too-many-stopovers');
 const validOvernight=['included','none','separate','unknown'];
 let lastStart=raw.startDate;
 for(const stop of stopovers){
  if(!stop||typeof stop!=='object'||!String(stop.place||'').trim()||!date(stop.arrivalDate)||!date(stop.departureDate)||stop.departureDate<stop.arrivalDate||
   date(lastStart)&&stop.arrivalDate<lastStart||!validOvernight.includes(stop.overnight||'unknown')||
   (arrivalDate&&stop.departureDate>arrivalDate)){
   errors.push('invalid-stopover');continue;
  }
  lastStart=stop.departureDate;
 }
 if(type==='lodging'&&!date(raw.endDate))errors.push('lodging-checkout-required');
 if(raw.url){try{const u=new URL(raw.url);if(u.protocol!=='https:'||!u.hostname)errors.push('invalid-source')}catch{errors.push('invalid-source')}}
 if(total===null&&raw.status==='confirmed')errors.push('unpriced-confirmed-booking');
 if(!raw.startDate||!date(raw.startDate))errors.push('missing-date');
 if(status==='confirmed'&&(!raw.reference||!String(raw.reference).trim()))errors.push('confirmation-reference-required');
 if(typeof raw.reference==='string'&&raw.reference.length>200)errors.push('invalid-reference');
 if(!errors.length)return {ok:true,errors:[],record:{id:raw.id,type,status,stageId:raw.stageId,fromStageId:type==='transport'&&!inbound&&!outbound?raw.fromStageId:null,journeyOrigin:inbound,journeyReturn:outbound,travelMode,originPlace:inbound||outbound?originPlace:'',destinationPlace:outbound?destinationPlace:'',
 destinationAirport:type==='transport'?destinationAirport:'',arrivalDate:type==='transport'?arrivalDate:'',
 stopovers:travelMode==='flight'?stopovers.map(x=>({place:String(x.place||'').trim().slice(0,160),arrivalDate:x.arrivalDate,departureDate:x.departureDate,overnight:x.overnight||'unknown'})):[],
 title:raw.title.trim(),provider:raw.provider.trim(),url:raw.url||'',reference:String(raw.reference||'').trim(),startDate:raw.startDate,endDate:raw.endDate||'',totalEUR:total,paidEUR:money(paid),refundedEUR:money(refunded),currency:converted.currency,totalAmount:converted.totalAmount,rateEUR:converted.rateEUR,rateCheckedAt:converted.rateCheckedAt,rateSource:converted.rateSource,transactions:converted.transactions,legacyPaidEUR:converted.legacyPaidEUR,legacyRefundedEUR:converted.legacyRefundedEUR,legacyRecordedElsewhere:converted.legacyRecordedElsewhere,recordedElsewhere:raw.recordedElsewhere===true,activityMode:raw.activityMode==='extra'?'extra':'allowance',notes:String(raw.notes||'').slice(0,500)}};
 return {ok:false,errors,record:null};
}
function reconcile({items=[],bookings=[],vol={},volunteerDetails={},legacyPaidByStop={},legacyActualsByStop={},originRequired=false}={}){
 const output=items.map(item=>({...item})),index=new Map(output.map((item,i)=>[item.i,i])),warnings=[],matched=[],paidByStop={},waitPaidByStop={},journalWaitPaidByStop={},typedPaidByStop={},journalTxByStop={},records=[],active=[];
 let extraPaid=0,returnBooking=null,returnPaymentEUR=0,returnLegacyJournal=0,returnJournalStage=null;
 const seen=new Set();
 const raw=Array.isArray(bookings)?bookings:[];
 for(const entry of raw){
  const validation=validate(entry);
  if(!validation.ok){warnings.push({id:String(entry?.id||''),reason:'invalid-record',details:validation.errors});continue}
  const b=validation.record;
  if(seen.has(b.id)){warnings.push({id:b.id,reason:'duplicate-id'});continue}
  seen.add(b.id);records.push(b);
  const payment=finance.normalize(b);
  const net=money(b.paidEUR-b.refundedEUR);
  extraPaid=money(extraPaid+payment.freshNet);
  if(b.status==='confirmed')active.push(b);
 }
 const legacyEntryNet=b=>b.transactions.length?0:(b.recordedElsewhere?0:money(b.paidEUR-b.refundedEUR));
 const paymentSplit=b=>{
  const n=finance.normalize(b);
  return {fresh:b.transactions.length?n.freshNet:legacyEntryNet(b),journal:b.transactions.length?n.journalNet:0};
 };
 const categoryOf=b=>b.type==='transport'?'transport':b.type==='lodging'?'lodging':b.type==='activity'?'activities':'other';
 const assignTyped=(b,component)=>{
  if(!b.transactions.length)return false;
  const split=paymentSplit(b),id=b.stageId;
  const row=typedPaidByStop[id]||(typedPaidByStop[id]={stay:0,transfer:0,wait:0});
  row[component]=money(row[component]+split.fresh+split.journal);
  return true;
 };
 // Never let two confirmed bookings silently overwrite one another.
 const groupKey=b=>b.type==='transport'?('transport:'+b.stageId+(b.journeyOrigin?':inbound':b.journeyReturn?':return':':route')):b.type+':'+b.stageId;
 const groups=new Map();
 for(const b of active){const key=groupKey(b);groups.set(key,(groups.get(key)||[]).concat(b))}
 for(const b of active){
  const item=output[index.get(b.stageId)];
  if(!item){warnings.push({id:b.id,reason:'missing-or-excluded-stage'});continue}
  if(!b.totalEUR && b.totalEUR!==0){warnings.push({id:b.id,reason:'unpriced-confirmed-booking'});continue}
  if(b.type==='volunteering'){
   // Host acceptance stays authoritative. Never create free accommodation from this entry.
   const host=volunteerDetails[b.stageId]||{};
   if(!(vol[b.stageId]===true&&host.confirmed===true)){
    warnings.push({id:b.id,reason:'host-acceptance-not-confirmed'});continue;
   }
   // Only attribute the payment to the already-priced host charge if it matches exactly.
   // Otherwise keep the payment as sunk spending and mark the budget incomplete.
   const hostCharge=num(item.hostExtras),nights=(Number(item.bed)||0)*item.days;
   if(b.startDate!==host.from||b.endDate!==host.to||hostCharge===null||money(hostCharge+nights)!==b.totalEUR){
    warnings.push({id:b.id,reason:'host-payment-differs-from-itinerary'});continue;
   }
   matched.push(b.id);
   if(!assignTyped(b,'stay')&&!b.recordedElsewhere)paidByStop[b.stageId]=money((paidByStop[b.stageId]||0)+b.paidEUR-b.refundedEUR);
   continue;
  }
  if(b.type!=='activity'&&b.type!=='lodging'&&groups.get(groupKey(b)).length>1){
   warnings.push({id:b.id,reason:'multiple-confirmed-bookings-for-stage'});continue;
  }
  if(b.type==='transport'){
   const position=index.get(b.stageId),prev=output[position-1];
   if(b.journeyReturn){
    const lastTravel=output.filter(x=>!x.isReturn&&Number(x.days)>0).at(-1);
    if(!lastTravel||lastTravel.i!==b.stageId||b.startDate!==lastTravel.end){
     warnings.push({id:b.id,reason:'return-departure-date-or-origin-changed'});continue;
    }
    const returnMarker=output.at(-1)?.isReturn?output.at(-1):null;
    if(returnMarker){returnMarker.leg=0;returnMarker.legMin=0;returnMarker.legMax=0;}
    returnBooking={id:b.id,totalEUR:b.totalEUR,stageId:b.stageId,destination:b.destinationPlace,stopovers:b.stopovers};
    returnPaymentEUR=money(b.paidEUR-b.refundedEUR);
    if(b.recordedElsewhere&&!b.transactions.length){
     returnLegacyJournal=returnPaymentEUR;returnJournalStage=b.stageId;
     const observed=num(legacyActualsByStop[b.stageId]?.transport);
     if(observed===null||observed+0.005<returnLegacyJournal)
      warnings.push({id:b.id,reason:'return-journal-payment-not-verifiable'});
    }
    if(b.travelMode==='flight'&&b.stopovers.some(stop=>stop.departureDate>stop.arrivalDate&&['unknown','separate'].includes(stop.overnight)))
     warnings.push({id:b.id,reason:'layover-overnight-cost-not-confirmed'});
    matched.push(b.id);
    // Return fare is a fixed liability, not a stop's onward transfer or stay.
    // Only the fixed-return component consumes this payment; the total paid amount
    // is already present in extraPaid or journal actuals.
    continue;
   }
   if(b.journeyOrigin){
    if(position!==0||!b.arrivalDate||b.arrivalDate!==(item.arrival||item.start)){
     warnings.push({id:b.id,reason:'inbound-arrival-date-or-destination-changed'});continue;
    }
    item.bookingInbound={id:b.id,origin:b.originPlace,destination:item.name,reference:b.reference,stopovers:b.stopovers};
   }else if(!prev||prev.i!==b.fromStageId||b.startDate!==(item.arrival||item.start)){
    warnings.push({id:b.id,reason:'transfer-route-or-date-changed'});continue;
   }
   item.leg=b.totalEUR;item.legMin=b.totalEUR;item.legMax=b.totalEUR;
   item.bookingTransport={id:b.id,provider:b.provider,reference:b.reference};
   if(b.travelMode==='flight'&&b.stopovers.some(stop=>stop.departureDate>stop.arrivalDate&&
     ['unknown','separate'].includes(stop.overnight))){
    warnings.push({id:b.id,reason:'layover-overnight-cost-not-confirmed'});
   }
  }else if(b.type==='lodging'){
   // A stop can contain multiple non-overlapping lodging bookings.
   // All lodging dates are validated as a group below, before any prices are applied.
   continue;
  }else if(b.type==='activity'){
   if(b.startDate<item.start||b.startDate>=item.end){
    warnings.push({id:b.id,reason:'activity-date-outside-stage'});continue;
   }
   // Process activities together below to avoid replacing a daily allowance per booking.
   continue;
  }
  matched.push(b.id);
  // The initial flight deposit belongs only to the inbound ticket, never to hotel nights.
  // Typed event bookings are already handled by assignTyped; legacy paid flight records
  // need the same explicit attribution. Journal-linked aggregate deposits remain generic.
  if(b.type==='transport'&&b.journeyOrigin&&!b.transactions.length&&!b.recordedElsewhere){
   const row=typedPaidByStop[b.stageId]||(typedPaidByStop[b.stageId]={stay:0,transfer:0,wait:0});
   row.transfer=money(row.transfer+b.paidEUR-b.refundedEUR);
  }else if(!assignTyped(b,'transfer')&&!b.recordedElsewhere){
   paidByStop[b.stageId]=money((paidByStop[b.stageId]||0)+b.paidEUR-b.refundedEUR);
  }
 }
 // Reconcile accommodation per booked NIGHT, not per entire stage.
 // The remaining (unbooked) nights retain the ordinary budget estimate.
 for(const [stageId,at] of index){
  const item=output[at];
  const stayBookings=groups.get('lodging:'+stageId)||[];
  if(!stayBookings.length)continue;
  const host=volunteerDetails[stageId]||{};
  const hasHost=vol[stageId]===true&&host.confirmed===true;
  const normalStart=item.start,normalEnd=item.end;
  const waitStart=item.arrival,waitEnd=item.start;
  const normalBed=num(hasHost?item.regularBed:item.bed);
  const boundsValid=date(normalStart)&&date(normalEnd)&&nights(normalStart,normalEnd)===item.days;
  const waitDays=hasHost&&date(waitStart)&&date(waitEnd)?nights(waitStart,waitEnd):0;
  const prepared=[];
  let bad=false;
  for(const b of stayBookings){
   const insideRegular=!hasHost&&boundsValid&&b.startDate>=normalStart&&b.endDate<=normalEnd;
   const insideWait=hasHost&&waitDays>0&&b.startDate>=waitStart&&b.endDate<=waitEnd;
   if(!insideRegular&&!insideWait){
    warnings.push({id:b.id,reason:hasHost?'lodging-overlaps-host-or-outside-wait':'lodging-dates-outside-stage'});
    bad=true;continue;
   }
   prepared.push({...b,allocation:insideWait?'wait':'stay'});
  }
  prepared.sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.endDate.localeCompare(b.endDate));
  for(let n=1;n<prepared.length;n++){
   if(prepared[n].startDate<prepared[n-1].endDate){
    bad=true;warnings.push({id:prepared[n-1].id,reason:'overlapping-lodging-bookings'});
    warnings.push({id:prepared[n].id,reason:'overlapping-lodging-bookings'});
   }
  }
  if(bad||prepared.length!==stayBookings.length)continue; // atomic: no partial replacement after an invalid combination
  if(normalBed===null||!Number.isFinite(item.stay)){
   for(const b of prepared)warnings.push({id:b.id,reason:'missing-normal-night-price'});
   continue;
  }
  let stageNightCount=0,stageNightTotal=0;const waitSegments=[];
  for(const b of prepared){
   const count=nights(b.startDate,b.endDate);
   if(b.allocation==='stay'){stageNightCount+=count;stageNightTotal+=b.totalEUR;}
   else waitSegments.push({id:b.id,startDate:b.startDate,endDate:b.endDate,totalEUR:b.totalEUR});
  }
  if(stageNightCount){
   const estimated=stageNightCount*normalBed;
   item.stay=money(item.stay-estimated+stageNightTotal);
   if(Number.isFinite(Number(item.daily)))item.daily=money(Number(item.daily)+(stageNightTotal-estimated)/item.days);
   item.bed=money(((item.days-stageNightCount)*normalBed+stageNightTotal)/item.days);
  }
  if(waitSegments.length)item.waitBookings=waitSegments;
  item.bookingLodgings=prepared.map(b=>({id:b.id,provider:b.provider,startDate:b.startDate,endDate:b.endDate,amount:b.totalEUR,category:b.allocation}));
  if(prepared.length===1)item.bookingLodging={id:prepared[0].id,provider:prepared[0].provider,reference:prepared[0].reference};
  for(const b of prepared){
   matched.push(b.id);
   const net=money(b.paidEUR-b.refundedEUR);
   const target=b.allocation==='wait'?(b.recordedElsewhere?journalWaitPaidByStop:waitPaidByStop):b.recordedElsewhere?null:paidByStop;
   if(!assignTyped(b,b.allocation==='wait'?'wait':'stay')&&target)target[stageId]=money((target[stageId]||0)+net);

  }
 }
 for(const [stageId,at] of index){
  const item=output[at];
  const arts=(groups.get('activity:'+stageId)||[]).filter(b=>b.totalEUR!==null&&b.startDate>=item.start&&b.startDate<item.end);
  if(!arts.length)continue;
  const extra=arts.filter(b=>b.activityMode==='extra').reduce((sum,b)=>sum+b.totalEUR,0);
  const covered=arts.filter(b=>b.activityMode==='allowance').reduce((sum,b)=>sum+b.totalEUR,0);
  const allowance=(Number(item.leisure)||0)*item.days;
  item.stay=money(item.stay+extra+Math.max(0,covered-allowance));
  item.bookingActivities=arts.map(b=>b.id);
  for(const b of arts){
   matched.push(b.id);
   if(!assignTyped(b,'stay')&&!b.recordedElsewhere)paidByStop[stageId]=money((paidByStop[stageId]||0)+b.paidEUR-b.refundedEUR);
  }
 }
 if(originRequired&&output.length){
  const first=output[0],confirmedInbound=active.filter(b=>b.type==='transport'&&b.journeyOrigin&&matched.includes(b.id));
  if(!confirmedInbound.length){
   first.leg=null;first.legMin=null;first.legMax=null;
  }
 }
 const applied=new Set(matched);
 for(const b of active){
  if(b.type!=='volunteering'&&!applied.has(b.id)&&!warnings.some(w=>w.id===b.id)){
   warnings.push({id:b.id,reason:'confirmed-booking-not-reconciled'});
  }
 }
 // Explicit event links require user-entered journal reference and sufficient recorded
 // category totals. Existing aggregate actuals cannot independently verify individual receipts.
 for(const b of records){
  if(!b.transactions.length)continue;
  const journal=paymentSplit(b).journal;
  if(!journal)continue;
  const stage=b.stageId,category=categoryOf(b);
  if(!journalTxByStop[stage])journalTxByStop[stage]={};
  journalTxByStop[stage][category]=money((journalTxByStop[stage][category]||0)+journal);
 }
 for(const [stageId,parts] of Object.entries(journalTxByStop)){
  const actuals=legacyActualsByStop[stageId];
  for(const [kind,amount] of Object.entries(parts)){
   const observed=kind==='activities'?(Array.isArray(actuals?.activities)?actuals.activities.reduce((n,x)=>n+(Number(x.cost)||0),0):null):num(actuals?.[kind]);
   if(observed===null||amount>observed+0.005)
    warnings.push({id:'payment-event-'+stageId+'-'+kind,reason:'journal-category-payment-not-verifiable'});
  }
 }
 // Existing journal spending may include hostel waiting-night deposits. Reallocate those
 // amounts from generic stay prepayments to the waiting-night liability exactly once.
 for(const [id,waitPaid] of Object.entries(journalWaitPaidByStop)){
  if((num(legacyPaidByStop[id])||0)+0.005<waitPaid)
   warnings.push({id:'journal-wait-'+id,reason:'wait-prepayment-not-attributed-to-stage'});
 }
 const knownPayment=records.reduce((sum,b)=>sum+b.paidEUR-b.refundedEUR,0);
 const eventJournalTotal=id=>Object.values(journalTxByStop[id]||{}).reduce((n,v)=>n+v,0);
 return {items:output,extraPaid,returnBooking,returnPaymentEUR,paidByStop,typedPaidByStop,journalTxByStop,waitPaidByStop:Object.fromEntries([...new Set([...Object.keys(waitPaidByStop),...Object.keys(journalWaitPaidByStop)])].map(i=>[i,money((waitPaidByStop[i]||0)+(journalWaitPaidByStop[i]||0))])),matched,records,warnings,
  confirmed:active.length,recordedPayment:money(knownPayment),
  bookingIntegrity:warnings.length===0,
  // Warning: payments for unmatched bookings remain sunk expenditure, NOT a future prepayment.
  accountedPaidByStop:Object.fromEntries(output.map(item=>[item.i,money(Math.max(0,(num(legacyPaidByStop[item.i])||0)-(journalWaitPaidByStop[item.i]||0)-eventJournalTotal(item.i)-(returnJournalStage===item.i?returnLegacyJournal:0))+(paidByStop[item.i]||0))]))
 };
}
g.SouthboundBookingLedger={validate,reconcile,types:TYPES.slice(),statuses:STATES.slice()};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundBookingLedger;
})(typeof globalThis!=='undefined'?globalThis:this);
