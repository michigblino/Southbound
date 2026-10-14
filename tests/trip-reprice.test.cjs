const test=require('node:test'),assert=require('node:assert/strict');
require('../transport-estimate.js');require('../cost-references.js');require('../itinerary.js');require('../booking-finance.js');require('../booking-ledger.js');
require('../budget-engine.js');require('../route-budget.js');require('../trip-calendar.js');require('../wait-costs.js');require('../route-timing.js');
const {reprice,compare}=require('../trip-reprice.js');
const stops=[['City A','BR',0,0,4,20,10,5,2,0,0],['City B','BR',1,1,28,25,10,5,2,10,20],['City C','BR',2,2,5,20,10,5,2,10,20]];
const defaults={stops,start:'2027-01-01',days:{},order:[0,1,2],goal:8000,cap:12000,reserve:500,
 fixedCosts:{return:400,insurance:100,visas:0,equipment:120},transferDaysByStop:{1:0,2:0}};
test('full route is re-priced, including paid, return, equipment, fees, reserve and waiting',()=>{
 const x=compare(defaults,[{mode:'balanced',name:'Shorter',actions:[{i:1,to:10,hostNights:0}]}]);
 assert.equal(x.baseline.snapshot.paid,0);assert.equal(x.alternatives[0].snapshot.reserve,500);
 assert.equal(x.alternatives[0].snapshot.lines.find(x=>x.label==='Versicherung').amount,100);
 assert.equal(x.alternatives[0].snapshot.lines.find(x=>x.label==='Rückreise').amount,400);
 assert.equal(x.alternatives[0].items[1].days,10);
 assert.equal(x.alternatives[0].estimatedTotal,Math.round((x.alternatives[0].snapshot.paid+x.alternatives[0].snapshot.estimatedFuture+x.alternatives[0].snapshot.verifiedFuture+500)*100)/100);
 assert.equal(x.alternatives[0].hypotheticalSaving,Math.round((x.baseline.estimatedTotal-x.alternatives[0].estimatedTotal)*100)/100);
});
test('unpriced transfers stay unknown and cannot mean free tickets',()=>{
 const unknown={...defaults,stops:stops.map(x=>[...x]),order:[0,2],transportOffers:{}};
 // Intentionally changed stop connection makes fare data uncertain if no valid model.
 const r=reprice(unknown);assert.ok(r.snapshot.lines.some(x=>x.label==='Transfer 2'));
 assert.equal(r.verifiedTotal,false);
});
test('21-28 host nights reduce only accommodation, never meals and never verified result',()=>{
 const proposal={mode:'volunteer',constraints:{maxHostDays:28},actions:[{i:1,to:28,hostNights:21}]};
 const base=reprice(defaults),v=reprice({...defaults,proposal});
 assert.equal(v.hostNights,21);assert.equal(v.hasHypotheticalHost,true);assert.equal(v.complete,false);
 assert.equal(base.items[1].stay-v.items[1].stay,21*25);
 assert.equal(v.items[1].food,10);assert.equal(v.verifiedTotal,false);
 assert.ok(v.warnings.includes('volunteer-host-offers-unconfirmed'));
});
test('paid or confirmed booking prevents hypothetical modification and spending remains',()=>{
 const data={...defaults,bookings:[{type:'lodging',status:'confirmed',stageId:1,paidEUR:80,refundedEUR:0}]};
 const v=reprice({...data,proposal:{mode:'volunteer',actions:[{i:1,to:21,hostNights:21}]}});
 assert.equal(v.items[1].days,28);assert.equal(v.hostNights,0);assert.ok(v.warnings.some(x=>/bereits gebucht/.test(x)));
});
test('repricing is pure; identical plans reconcile to identical totals',()=>{
 const x=JSON.stringify(defaults),a=reprice(defaults),b=reprice({...defaults,proposal:{mode:'current',actions:[]}});
 assert.equal(a.estimatedTotal,b.estimatedTotal);assert.equal(JSON.stringify(defaults),x);
});

test('skipping a stop preserves days, changes connection, and keeps new ticket price unknown',()=>{
 const base=reprice(defaults),rerouted=reprice({...defaults,proposal:{
  mode:'redistribute',excludeIds:[1],dayOverrides:{2:33},actions:[]
 }});
 assert.deepEqual(rerouted.items.map(x=>x.i),[0,2]);
 assert.equal(rerouted.items.reduce((a,x)=>a+x.days,0),base.items.reduce((a,x)=>a+x.days,0));
 assert.equal(rerouted.items[1].leg,null);
 assert.equal(rerouted.connectionUnpriced,true);
 assert.ok(rerouted.snapshot.unknownTransfers.includes(2));
 assert.equal(rerouted.complete,false);
 assert.ok(rerouted.warnings.some(w=>String(w).includes('new-connection-unpriced')));
 assert.equal(defaults.days[2],undefined);
});
test('cannot omit booked or initial/final stages for a misleading saving',()=>{
 const bookings=[{stageId:1,type:'transport',status:'confirmed',paidEUR:50,refundedEUR:0}];
 const r=reprice({...defaults,bookings,proposal:{mode:'reroute',excludeIds:[0,1,2]}});
 assert.deepEqual(r.items.map(x=>x.i),[0,1,2]);
 assert.equal(r.connectionUnpriced,false);
 assert.ok(r.warnings.some(x=>/kann nicht ausgelassen/.test(x)));
});
