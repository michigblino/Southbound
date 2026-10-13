const test=require('node:test'),assert=require('node:assert/strict');
require('../itinerary.js');require('../booking-ledger.js');require('../trip-calendar.js');require('../wait-costs.js');
require('../route-timing.js');require('../budget-engine.js');require('../route-budget.js');
const stops=[
 ['A','X',0,0,2,20,10,5,2,0,0],
 ['B','X',0,1,5,20,10,5,2,10,20]
];
const host={confirmed:true,night:0,from:'2027-01-06',to:'2027-01-11',foodPerDay:10,extraCosts:0};
const booking=(id,from,to,total,paid)=>({id,type:'lodging',status:'confirmed',stageId:1,fromStageId:null,title:'Guesthouse '+id,provider:'Provider',reference:'REF-'+id,startDate:from,endDate:to,totalEUR:total,paidEUR:paid,refundedEUR:0,recordedElsewhere:false});
test('two hostels before five free host nights flow into the same all-in budget without double counting',()=>{
 const plan=globalThis.SouthboundItinerary.plan({stops,start:'2027-01-01',vol:{1:true},volunteerDetails:{1:host}});
 assert.equal(plan.items[1].arrival,'2027-01-03');
 assert.equal(plan.items[1].start,'2027-01-06');
 assert.equal(plan.items[1].end,'2027-01-11');
 const bookings=[booking('one','2027-01-03','2027-01-05',30,10),booking('two','2027-01-05','2027-01-06',20,5)];
 const ledger=globalThis.SouthboundBookingLedger.reconcile({items:plan.items,bookings,vol:{1:true},volunteerDetails:{1:host}});
 assert.equal(ledger.bookingIntegrity,true);
 assert.equal(ledger.items[1].waitBookings.length,2);
 assert.equal(ledger.items[1].bed,0);
 assert.equal(ledger.items[1].stay,85);
 assert.equal(ledger.waitPaidByStop[1],15);
 const timing=globalThis.SouthboundRouteTiming.evaluate({start:'2027-01-01',items:ledger.items,stops,volunteerDetails:{1:host},isVolunteer:i=>i===1,transferDaysByStop:{1:0}});
 assert.equal(timing.feasible,true);
 assert.equal(timing.waiting.total,86); // hostel 30+20, meals/other 3*(10+2)
 const budget=globalThis.SouthboundRouteBudget.snapshot({items:ledger.items,paid:ledger.extraPaid,paidByStop:ledger.accountedPaidByStop,waitingCost:timing.waiting.total,waitingPaid:15,waitingComplete:timing.waiting.complete,timingFeasible:timing.feasible,bookingIntegrity:ledger.bookingIntegrity,reserve:0,goal:8000,cap:12000,fixedCosts:{return:0,insurance:0,visas:0,equipment:0}});
 assert.equal(budget.lines.find(x=>x.label==='Wartekosten').amount,71);
 assert.equal(budget.totalEstimate,ledger.items[0].stay+ledger.items[1].stay+ledger.items[1].leg+86);
 assert.equal(budget.complete,true);
});
