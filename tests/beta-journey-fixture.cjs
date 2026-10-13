/* Purely SYNTHETIC multi-country beta stress-test scenario.
 * No amounts, routes, bookings, provider confirmations or travel-day assumptions
 * in this fixture are live or observed travel data.
 */
'use strict';
require('../booking-finance.js');
require('../itinerary.js');
require('../booking-ledger.js');
require('../trip-calendar.js');
require('../wait-costs.js');
require('../route-timing.js');
require('../budget-engine.js');
require('../route-budget.js');
const starts='2027-02-01';
const stops=[
 ['Rio de Janeiro','Brazil',-22.9,-43.2,4,30,14,8,3,0,0],
 ['Salvador','Brazil',-12.97,-38.5,3,25,12,8,3,70,90],
 ['Medellín','Colombia',6.2,-75.5,5,20,10,6,2,90,130],
 ['Cusco','Peru',-13.5,-71.9,4,20,13,10,3,120,180]
];
const vol={2:true};
const volunteerDetails={2:{confirmed:true,night:0,foodPerDay:9,extraCosts:10,from:'2027-02-11',to:'2027-02-16',hoursPerWeek:25}};
const paid=(id,amount,overrides={})=>({id,kind:'payment',date:'2026-10-13',currency:'EUR',amount,recordedElsewhere:false,...overrides});
const booking=(id,type,stageId,startDate,endDate,totalEUR,transactions=[],extra={})=>({
 id,type,stageId,fromStageId:type==='transport'?stageId-1:null,
 title:id,provider:'Synthetic QA fixture',reference:'TEST-'+id,status:'confirmed',startDate,endDate,
 totalEUR,paidEUR:0,refundedEUR:0,transactions,recordedElsewhere:false,...extra
});
const bookings=[
 booking('salvador-hostel-one','lodging',1,'2027-02-05','2027-02-06',30,[paid('pay-a',30)]),
 booking('salvador-hostel-two','lodging',1,'2027-02-06','2027-02-08',40,[paid('pay-b',20)]),
 booking('rio-salvador-bus','transport',1,'2027-02-05','',75,[paid('pay-c',20)]),
 booking('medellin-wait-one','lodging',2,'2027-02-08','2027-02-09',19,[paid('pay-d',15)]),
 booking('medellin-wait-two','lodging',2,'2027-02-09','2027-02-11',38,[paid('pay-e',10)]),
 booking('medellin-cusco-flight','transport',3,'2027-02-16','',90,[
  paid('pay-f',30,{currency:'USD',rateEUR:0.92,rateSource:'Synthetic actual card rate',
   rateCheckedAt:'2026-10-13'})
 ],{currency:'USD',totalAmount:100,rateEUR:0.9,rateSource:'Synthetic quote reference',rateCheckedAt:'2026-10-13'}),
 booking('cusco-guided-walk','activity',3,'2027-02-17','',30,[],{activityMode:'extra'}),
 booking('salvador-cancelled-dorm','lodging',1,'2027-02-05','2027-02-06',40,[
  paid('pay-g',30),{id:'refund-g',kind:'refund',date:'2026-10-14',currency:'EUR',amount:20,recordedElsewhere:false}
 ],{status:'cancelled'})
];
const fixedCosts={return:800,insurance:180,visas:0,equipment:80};
const toMoney=v=>Math.round((v+Number.EPSILON)*100)/100;
function run({withTransferDates=true,unknownReturn=false,misdatedFlight=false,additionalCosts=0}={}){
 const list=misdatedFlight?bookings.map(b=>b.id==='medellin-cusco-flight'?{...b,startDate:'2027-02-17'}:b):bookings;
 const plan=globalThis.SouthboundItinerary.plan({stops,start:starts,vol,volunteerDetails});
 const ledger=globalThis.SouthboundBookingLedger.reconcile({items:plan.items,bookings:list,vol,volunteerDetails});
 const timing=globalThis.SouthboundRouteTiming.evaluate({
  items:ledger.items,start:starts,stops,volunteerDetails,isVolunteer:i=>vol[i]===true,
  transferDaysByStop:withTransferDates?{1:0,2:0,3:0}:{}});
 const waitPaid=Object.values(ledger.waitPaidByStop).reduce((a,v)=>a+v,0)
   +Object.values(ledger.typedPaidByStop).reduce((a,v)=>a+(v.wait||0),0);
 const budget=globalThis.SouthboundRouteBudget.snapshot({
  items:ledger.items,paid:ledger.extraPaid,paidByStop:ledger.accountedPaidByStop,
  paymentAllocationsByStop:ledger.typedPaidByStop,
  waitingCost:timing.waiting.total,waitingComplete:timing.waiting.complete,waitingPaid:waitPaid,
  timingFeasible:timing.feasible,bookingIntegrity:ledger.bookingIntegrity,
  fixedCosts:{...fixedCosts,return:unknownReturn?null:fixedCosts.return},
  reserve:1200,goal:8000,cap:12000,additionalCosts});
 return {plan,ledger,timing,budget,waitPaid};
}
function makeReport(){
 const out=run();
 const lines=out.budget.lines.map(l=>({category:l.label,remainingEUR:l.amount,quality:l.status}));
 const sums={
  paidAlreadyEUR:out.ledger.extraPaid,
  bookingMatchedCount:out.ledger.matched.length,
  bookingWarnings:out.ledger.warnings,
  remainingWaitingEUR:out.budget.lines.find(l=>l.label==='Wartekosten').amount,
  waitingTotalEUR:out.timing.waiting.total,
  reserveEUR:out.budget.reserve,
  forecastAllInEUR:out.budget.totalEstimate,
  goalEUR:out.budget.goal,
  capEUR:out.budget.cap,
  headroomToGoalEUR:out.budget.budgetHeadroom,
  headroomToCapEUR:out.budget.capHeadroom,
  completeInFixture:out.budget.complete
 };
 return {
  fixture:'synthetic-test-only',providerDataVerified:false,livePriceClaims:false,
  generatedAt:new Date().toISOString(),note:'Synthetic arithmetic and state reconciliation only. Zero modeled transfer days are deliberate test inputs and NOT confirmed schedules. An all-in verified real trip requires external evidence.',
  dates:out.plan.items.map(x=>({stage:x.name,arrive:x.arrival,start:x.start,end:x.end,waitingDays:x.waitingDays})),
  assumptions:{start:starts,bookingIds:bookings.map(b=>b.id),fixedCosts,reserve:1200,goal:8000,hardCap:12000},
  sums,lines,unverifiedWithoutRealProviderEvidence:true,
  unverifiedVariants:{
   unknownTransportDays:run({withTransferDates:false}).budget.incompleteReasons,
   unknownReturnFare:run({unknownReturn:true}).budget.incompleteReasons,
   staleRouteTicket:run({misdatedFlight:true}).budget.incompleteReasons
  }
 };
}
module.exports={run,makeReport,bookings,stops,vol,volunteerDetails,starts,fixedCosts,toMoney};
