/* Southbound booking ledger v1.
 * Local, user-entered records ONLY. Neither live bookability nor provider verification.
 * All API results and payment imports must later pass explicit provenance validation.
 */
(function(g){'use strict';
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
 const type=raw.type,status=raw.status,total=num(raw.totalEUR),paid=num(raw.paidEUR),refunded=num(raw.refundedEUR);
 if(!TYPES.includes(type))errors.push('invalid-type');
 if(!STATES.includes(status))errors.push('invalid-status');
 if(!integer(raw.stageId))errors.push('invalid-stage');
 if(typeof raw.id!=='string'||!raw.id.trim()||raw.id.length>100)errors.push('invalid-id');
 if(typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>160)errors.push('invalid-title');
 if(typeof raw.provider!=='string'||!raw.provider.trim()||raw.provider.length>160)errors.push('invalid-provider');
 if(raw.startDate&&!date(raw.startDate))errors.push('invalid-start-date');
 if(raw.endDate&&!date(raw.endDate))errors.push('invalid-end-date');
 if(date(raw.startDate)&&date(raw.endDate)&&raw.endDate<=raw.startDate)errors.push('invalid-date-range');
 if(type==='transport'&&!integer(raw.fromStageId))errors.push('invalid-origin');
 if(type==='lodging'&&!date(raw.endDate))errors.push('lodging-checkout-required');
 if(raw.url){try{const u=new URL(raw.url);if(u.protocol!=='https:'||!u.hostname)errors.push('invalid-source')}catch{errors.push('invalid-source')}}
 if(raw.totalEUR!==null&&raw.totalEUR!==undefined&&raw.totalEUR!==''&&total===null)errors.push('invalid-price');
 if(paid===null||refunded===null||refunded>paid||total!==null&&paid>total)errors.push('invalid-payment');
 if(!raw.startDate||!date(raw.startDate))errors.push('missing-date');
 if(status==='confirmed'&&(!raw.reference||!String(raw.reference).trim()))errors.push('confirmation-reference-required');
 if(typeof raw.reference==='string'&&raw.reference.length>200)errors.push('invalid-reference');
 if(!errors.length)return {ok:true,errors:[],record:{id:raw.id,type,status,stageId:raw.stageId,fromStageId:type==='transport'?raw.fromStageId:null,title:raw.title.trim(),provider:raw.provider.trim(),url:raw.url||'',reference:String(raw.reference||'').trim(),startDate:raw.startDate,endDate:raw.endDate||'',totalEUR:total,paidEUR:money(paid),refundedEUR:money(refunded),recordedElsewhere:raw.recordedElsewhere===true,activityMode:raw.activityMode==='extra'?'extra':'allowance',notes:String(raw.notes||'').slice(0,500)}};
 return {ok:false,errors,record:null};
}
function reconcile({items=[],bookings=[],vol={},volunteerDetails={},legacyPaidByStop={}}={}){
 const output=items.map(item=>({...item})),index=new Map(output.map((item,i)=>[item.i,i])),warnings=[],matched=[],paidByStop={},waitPaidByStop={},records=[],active=[];
 let extraPaid=0;
 const seen=new Set();
 const raw=Array.isArray(bookings)?bookings:[];
 for(const entry of raw){
  const validation=validate(entry);
  if(!validation.ok){warnings.push({id:String(entry?.id||''),reason:'invalid-record',details:validation.errors});continue}
  const b=validation.record;
  if(seen.has(b.id)){warnings.push({id:b.id,reason:'duplicate-id'});continue}
  seen.add(b.id);records.push(b);
  const net=money(b.paidEUR-b.refundedEUR);
  if(!b.recordedElsewhere)extraPaid=money(extraPaid+net);
  if(b.status==='confirmed')active.push(b);
 }
 // Never let two confirmed bookings silently overwrite one another.
 const groupKey=b=>b.type+':'+b.stageId;
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
   if(!b.recordedElsewhere)paidByStop[b.stageId]=money((paidByStop[b.stageId]||0)+b.paidEUR-b.refundedEUR);
   continue;
  }
  if(b.type!=='activity'&&b.type!=='lodging'&&groups.get(groupKey(b)).length>1){
   warnings.push({id:b.id,reason:'multiple-confirmed-bookings-for-stage'});continue;
  }
  if(b.type==='transport'){
   const position=index.get(b.stageId),prev=output[position-1];
   if(!prev||prev.i!==b.fromStageId||b.startDate!==(item.arrival||item.start)){
    warnings.push({id:b.id,reason:'transfer-route-or-date-changed'});continue;
   }
   item.leg=b.totalEUR;item.legMin=b.totalEUR;item.legMax=b.totalEUR;
   item.bookingTransport={id:b.id,provider:b.provider,reference:b.reference};
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
  if(!b.recordedElsewhere){
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
   if(!b.recordedElsewhere){
    const target=b.allocation==='wait'?waitPaidByStop:paidByStop;
    target[stageId]=money((target[stageId]||0)+b.paidEUR-b.refundedEUR);
   }
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
   if(!b.recordedElsewhere)paidByStop[stageId]=money((paidByStop[stageId]||0)+b.paidEUR-b.refundedEUR);
  }
 }
 const applied=new Set(matched);
 for(const b of active){
  if(b.type!=='volunteering'&&!applied.has(b.id)&&!warnings.some(w=>w.id===b.id)){
   warnings.push({id:b.id,reason:'confirmed-booking-not-reconciled'});
  }
 }
 const knownPayment=records.reduce((sum,b)=>sum+b.paidEUR-b.refundedEUR,0);
 return {items:output,extraPaid,paidByStop,waitPaidByStop,matched,records,warnings,
  confirmed:active.length,recordedPayment:money(knownPayment),
  bookingIntegrity:warnings.length===0,
  // Warning: payments for unmatched bookings remain sunk expenditure, NOT a future prepayment.
  accountedPaidByStop:Object.fromEntries(output.map(item=>[item.i,money((num(legacyPaidByStop[item.i])||0)+(paidByStop[item.i]||0))]))
 };
}
g.SouthboundBookingLedger={validate,reconcile,types:TYPES.slice(),statuses:STATES.slice()};
if(typeof module!=='undefined'&&module.exports)module.exports=g.SouthboundBookingLedger;
})(typeof globalThis!=='undefined'?globalThis:this);
