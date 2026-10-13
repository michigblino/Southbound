const test=require('node:test'),assert=require('node:assert/strict');
require('../booking-finance.js');
require('../budget-engine.js');require('../route-budget.js');
const {reconcile,validate}=require('../booking-ledger.js');
const route=[
 {i:0,name:'São Paulo',start:'2027-01-01',arrival:'2027-01-01',end:'2027-01-06',days:5,stay:300,leg:0},
 {i:1,name:'Buenos Aires',start:'2027-01-06',arrival:'2027-01-06',end:'2027-01-10',days:4,stay:200,leg:80}
];
const returning={
 id:'home-flight',type:'transport',status:'confirmed',stageId:1,fromStageId:null,
 journeyReturn:true,journeyOrigin:false,travelMode:'flight',originPlace:'Buenos Aires',
 destinationPlace:'München (MUC)',destinationAirport:'MUC',
 startDate:'2027-01-10',arrivalDate:'2027-01-12',endDate:'',
 stopovers:[{place:'Lissabon (LIS)',arrivalDate:'2027-01-11',departureDate:'2027-01-12',overnight:'included'}],
 title:'Buenos Aires → Lissabon → München',provider:'Synthetic test airline',reference:'TEST-RETURN',
 currency:'EUR',totalEUR:600,paidEUR:250,refundedEUR:0,recordedElsewhere:false
};
const estimate=(r,other={})=>globalThis.SouthboundRouteBudget.snapshot({
 items:r.items,paid:r.extraPaid,paymentAllocationsByStop:r.typedPaidByStop,paidByStop:r.accountedPaidByStop,
 fixedCosts:{return:r.returnBooking?r.returnBooking.totalEUR:800,insurance:0,visas:0,equipment:0},
 returnPaymentEUR:r.returnPaymentEUR,
 waitingCost:0,goal:8000,cap:12000,reserve:0,bookingIntegrity:r.bookingIntegrity,...other
});
test('return fare replaces old 800 EUR estimate and booked deposit offsets only return',()=>{
 const v=validate(returning);assert.equal(v.ok,true,v.errors.join(','));
 const r=reconcile({items:route,bookings:[returning]});
 assert.equal(r.bookingIntegrity,true,JSON.stringify(r.warnings));
 assert.deepEqual(r.matched,['home-flight']);
 assert.equal(r.returnBooking.totalEUR,600);
 assert.equal(r.returnPaymentEUR,250);
 assert.equal(r.extraPaid,250);
 assert.equal(r.items[1].stay,200);
 assert.equal(r.items[1].leg,80);
 const b=estimate(r);
 assert.equal(b.complete,true,JSON.stringify(b.incompleteReasons));
 assert.equal(b.lines.find(x=>x.label==='Rückreise').amount,350);
 assert.equal(b.lines.find(x=>x.label==='Aufenthalt 1').amount,200);
 assert.equal(b.totalEstimate,1180); // 250 already paid + 350 outstanding + 500 stays + 80 internal transfer
});
test('an explicit return marker has no duplicate transfer fare when return ticket is booked',()=>{
 const marked=route.concat([{i:2,name:'München',isReturn:true,days:0,start:'2027-01-10',end:'2027-01-10',arrival:'2027-01-10',stay:0,leg:700}]);
 const r=reconcile({items:marked,bookings:[returning]});
 assert.equal(r.returnBooking.totalEUR,600);
 assert.equal(r.items[2].leg,0);
 const b=estimate(r);
 assert.equal(b.totalEstimate,1180);
 assert.equal(b.complete,true);
});
test('without a booked flight the existing rough return estimate survives',()=>{
 const r=reconcile({items:route,bookings:[]});
 assert.equal(r.returnBooking,null);
 assert.equal(r.returnPaymentEUR,0);
 assert.equal(estimate(r).lines.find(x=>x.label==='Rückreise').amount,800);
});
test('dated layover where accommodation is unknown remains a flagged cost',()=>{
 const b={...returning,stopovers:returning.stopovers.map(x=>({...x,overnight:'unknown'}))};
 const r=reconcile({items:route,bookings:[b]});
 assert.equal(r.returnBooking.totalEUR,600);
 assert.equal(r.bookingIntegrity,false);
 assert.ok(r.warnings.some(x=>x.reason==='layover-overnight-cost-not-confirmed'));
 assert.equal(estimate(r).complete,false);
});
test('changing final trip day or destination stage never replaces fixed estimate silently',()=>{
 const wrongDay={...returning,startDate:'2027-01-09'};
 const wrongStage={...returning,stageId:0};
 for(const b of [wrongDay,wrongStage]){
  const r=reconcile({items:route,bookings:[b]});
  assert.equal(r.returnBooking,null);
  assert.equal(r.extraPaid,250); // sunk payment persists independently
  assert.equal(r.bookingIntegrity,false);
  assert.ok(r.warnings.some(x=>x.reason==='return-departure-date-or-origin-changed'));
 }
});
test('return model rejects missing home destination and conflicting journey directions',()=>{
 assert.equal(validate({...returning,destinationPlace:''}).ok,false);
 assert.equal(validate({...returning,journeyOrigin:true}).ok,false);
 assert.equal(validate({...returning,arrivalDate:'2027-01-09'}).ok,false);
});
test('already paid return fare never becomes an extra hotel advance',()=>{
 const r=reconcile({items:route,bookings:[{...returning,paidEUR:600}]});
 const b=estimate(r);
 assert.equal(r.extraPaid,600);
 assert.equal(b.lines.find(x=>x.label==='Rückreise').amount,0);
 assert.equal(b.lines.find(x=>x.label==='Aufenthalt 1').amount,200);
 assert.equal(b.totalEstimate,1180);
});
