const test=require('node:test'),assert=require('node:assert/strict');
require('../booking-finance.js');
require('../budget-engine.js');require('../route-budget.js');
const {validate,reconcile}=require('../booking-ledger.js');
const incoming={
 id:'munich-sao-paulo-flight',type:'transport',status:'confirmed',stageId:0,fromStageId:null,
 journeyOrigin:true,travelMode:'flight',originPlace:'München (MUC)',destinationAirport:'São Paulo (GRU)',
 arrivalDate:'2026-12-28',startDate:'2026-12-26',endDate:'',
 stopovers:[{place:'Casablanca (CMN)',arrivalDate:'2026-12-26',departureDate:'2026-12-27',overnight:'included'}],
 title:'München → Casablanca → São Paulo',provider:'Example Airline (synthetic)',reference:'TEST-ABC',
 currency:'EUR',totalEUR:650,paidEUR:650,refundedEUR:0,recordedElsewhere:false
};
const first={i:0,name:'São Paulo',start:'2026-12-28',arrival:'2026-12-28',end:'2026-12-31',days:3,bed:20,stay:120,leg:0};
const second={i:1,name:'Rio',start:'2026-12-31',arrival:'2026-12-31',end:'2027-01-04',days:4,bed:20,stay:140,leg:80};
const full={items:[first,second],bookings:[incoming],originRequired:true};
const costs=r=>globalThis.SouthboundRouteBudget.snapshot({
 items:r.items,paid:r.extraPaid,paidByStop:r.accountedPaidByStop,
 paymentAllocationsByStop:r.typedPaidByStop,
 fixedCosts:{return:200,insurance:50,visas:0,equipment:0},
 goal:8000,cap:12000,reserve:500,bookingIntegrity:r.bookingIntegrity
});
test('a booked Munich flight with overnight Casablanca layover is one inbound liability, including payment',()=>{
 const check=validate(incoming);assert.equal(check.ok,true,check.errors.join(','));
 assert.equal(check.record.stopovers.length,1);
 const r=reconcile(full);
 assert.equal(r.items[0].leg,650);
 assert.equal(r.items[1].leg,80);
 assert.equal(r.items[0].bookingInbound.origin,'München (MUC)');
 assert.equal(r.items[0].bookingInbound.stopovers[0].place,'Casablanca (CMN)');
 assert.deepEqual(r.matched,['munich-sao-paulo-flight']);
 assert.equal(r.extraPaid,650);
 assert.equal(r.bookingIntegrity,true,JSON.stringify(r.warnings));
 assert.equal(r.paidByStop[0],undefined);assert.equal(r.typedPaidByStop[0].transfer,650);
 const b=costs(r);assert.equal(b.complete,true,JSON.stringify(b.incompleteReasons));
 assert.equal(b.lines.find(x=>x.label==='Transfer 0').amount,0);
 assert.equal(b.totalEstimate,1740); // paid 650 + stays 260 + Rio transfer 80 + fixed 250 + reserve 500
});
test('missing inbound flight cannot silently show a complete total or free arrival',()=>{
 const r=reconcile({...full,bookings:[]});
 assert.equal(r.items[0].leg,null);
 const b=costs(r);
 assert.equal(b.complete,false);
 assert.ok(b.incompleteReasons.includes('unknown-transfers'));
 assert.equal(b.goalStatus,'unverified');
});
test('unknown or separate Casablanca overnight costs block a verified budget but keep booked flight fare',()=>{
 for(const overnight of ['unknown','separate']){
  const b={...incoming,stopovers:incoming.stopovers.map(x=>({...x,overnight}))};
  const r=reconcile({...full,bookings:[b]});
  assert.equal(r.items[0].leg,650);
  assert.equal(r.bookingIntegrity,false);
  assert.ok(r.warnings.some(w=>w.reason==='layover-overnight-cost-not-confirmed'));
  assert.equal(costs(r).complete,false);
 }
});
test('no hotel needed at layover does not invent lodging cost',()=>{
 const b={...incoming,stopovers:incoming.stopovers.map(x=>({...x,overnight:'none'}))};
 assert.equal(reconcile({...full,bookings:[b]}).bookingIntegrity,true);
});
test('date mismatch, missing origin and overlapping layover schedule never silently reprice first arrival',()=>{
 const dateMismatch={...incoming,arrivalDate:'2026-12-29'};
 const mismatched=reconcile({...full,bookings:[dateMismatch]});
 assert.equal(mismatched.items[0].leg,null);
 assert.equal(mismatched.extraPaid,650);
 assert.equal(mismatched.bookingIntegrity,false);
 assert.ok(mismatched.warnings.some(w=>w.reason==='inbound-arrival-date-or-destination-changed'));
 assert.equal(validate({...incoming,originPlace:''}).ok,false);
 assert.equal(validate({...incoming,stopovers:[{place:'Casablanca',arrivalDate:'2026-12-27',departureDate:'2026-12-29',overnight:'included'}]}).ok,false);
});
test('old intra-trip bus records remain valid without flight-specific fields',()=>{
 const bus={...incoming,id:'bus1',stageId:1,fromStageId:0,journeyOrigin:false,
  travelMode:undefined,originPlace:undefined,arrivalDate:undefined,stopovers:undefined,
  startDate:'2026-12-31',endDate:'',totalEUR:80,paidEUR:20};
 const r=reconcile({items:[first,second],bookings:[bus],originRequired:false});
 assert.equal(r.bookingIntegrity,true,JSON.stringify(r.warnings));
 assert.equal(r.items[1].leg,80);
 assert.equal(r.extraPaid,20);
});
