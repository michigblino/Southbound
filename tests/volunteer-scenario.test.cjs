const test=require('node:test'),assert=require('node:assert/strict');
require('../itinerary.js');require('../trip-calendar.js');require('../wait-costs.js');require('../route-timing.js');require('../budget-engine.js');require('../route-budget.js');require('../volunteer-scenario.js');
const {compare}=globalThis.SouthboundVolunteerScenario;
const stops=[['A','X',0,0,4,20,10,5,2,0,0,'arrival']];
const budget={paid:0,reserve:100,goal:8000,cap:12000,fixedCosts:{return:100,insurance:40,visas:0,equipment:0}};
const host={confirmed:true,night:0,from:'2027-01-01',to:'2027-01-08',extraCosts:0};
const base={stops,start:'2027-01-01',stopId:0,proposedDays:7,budget};
test('confirmed free host with dates and explicit extra expenses recalculates all-in route',()=>{
 const r=compare({...base,host});assert.equal(r.valid,true);assert.equal(r.extraDays,3);assert.equal(r.dateShift,true);assert.equal(r.netImpactCalculable,true);
 assert.equal(r.baseline.budget.totalEstimate,388);assert.equal(r.proposed.budget.totalEstimate,359);assert.equal(r.costDelta,-29);
 assert.equal(r.proposed.timing.schedule.items[0].end,'2027-01-08');
});
test('unconfirmed host cannot claim net savings',()=>{const r=compare({...base,host:{...host,confirmed:false}});assert.equal(r.netImpactCalculable,false);assert.equal(r.costDelta,null)});
test('missing host date makes comparison unverified',()=>{const r=compare({...base,host:{...host,to:undefined}});assert.equal(r.netImpactCalculable,false);assert.ok(r.reasons.includes('missing-host-dates'))});
test('missing additional host fees makes net savings unknown',()=>{const r=compare({...base,host:{...host,extraCosts:undefined}});assert.equal(r.costDelta,null);assert.ok(r.reasons.includes('unknown-host-extra-costs'))});
test('missing transport costs on a second stop prevent verified net claims',()=>{
 const r=compare({...base,stops:[...stops,['B','X',0,1,3,20,10,5,2,0,0]],options:{transferDaysByStop:{1:1}},host});
 assert.equal(r.netImpactCalculable,false);assert.ok(r.reasons.includes('incomplete-all-in-budget'));
});
test('invalid duration is rejected without modifying original itinerary',()=>{const r=compare({...base,host,proposedDays:0});assert.equal(r.valid,false)});

test('explicit host fees are included in proposed all-in total',()=>{const r=compare({...base,host:{...host,extraCosts:50}});assert.equal(r.proposed.budget.totalEstimate,409);assert.equal(r.costDelta,21);assert.equal(r.netImpactCalculable,true)});

test('date shift uses real host waiting, not naive itinerary finish',()=>{const r=compare({...base,proposedDays:2,host:{...host,from:'2027-01-03',to:'2027-01-05'}});assert.equal(r.proposed.timing.schedule.items[0].waitingDays,2);assert.equal(r.baseline.timing.schedule.finish,'2027-01-05');assert.equal(r.proposed.timing.schedule.finish,'2027-01-05');assert.equal(r.dateShift,false)});
