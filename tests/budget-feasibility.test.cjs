const test=require('node:test'),assert=require('node:assert/strict');
const {verdict,alternatives}=require('../budget-feasibility.js');
const base={estimatedTotal:16608.5,snapshot:{paid:0,complete:false,missingCount:5,incompleteReasons:['missing-fixed-costs']}};
test('an over-budget model never becomes an absolute impossibility claim',()=>{
 const r=verdict({baseline:base,goal:8000,alternatives:[{estimatedTotal:7500,snapshot:{complete:false,missingCount:2},warnings:['unconfirmed-host']} ]});
 assert.equal(r.status,'over-model');assert.equal(r.hardImpossible,false);assert.equal(r.supportedGoal,false);
 assert.equal(r.optimisticIncomplete.estimatedTotal,7500);
});
test('only actually paid costs can establish an already breached hard floor',()=>{
 const r=verdict({baseline:{estimatedTotal:13000,snapshot:{paid:9001,complete:false}},goal:8000});
 assert.equal(r.status,'over-committed');assert.equal(r.hardImpossible,true);assert.equal(r.sunkCostFloor,9001);
});
test('hypothetical free host stay does not prove target is reachable',()=>{
 const r=verdict({baseline:base,goal:8000,alternatives:[{estimatedTotal:7800,hasHypotheticalHost:true,evidence:{providerVerified:true},snapshot:{complete:true},warnings:[]} ]});
 assert.equal(r.supportedGoal,false);
});
const stages=[{i:0,name:'Ankunft',days:3,stay:150},{i:1,name:'Teure Stadt',days:5,stay:250},{i:2,name:'Ruhiges Dorf',days:25,stay:250},
 {i:3,name:'Kurzbesuch',days:4,stay:200},{i:4,name:'Rückende',days:3,stay:180}];
test('route alternatives preserve trip length and prevent false free transfer claims',()=>{
 const a=alternatives({stops:stages.map(x=>[x.name]),items:stages});
 assert.ok(a.length>0);const p=a[0];
 assert.equal(p.retainedDays,true);
 const removed=stages.filter(x=>p.excludeIds.includes(x.i)).reduce((a,x)=>a+x.days,0);
 const gained=Object.entries(p.dayOverrides).reduce((a,[i,n])=>a+n-stages.find(x=>x.i===Number(i)).days,0);
 assert.equal(gained,removed);assert.ok(p.requires.includes('Neuer Anschlussfahrpreis'));
});
test('confirmed stay and must-see stages are never removed or changed',()=>{
 const a=alternatives({stops:stages.map(x=>[x.name]),items:stages,
 bookings:[{stageId:1,type:'lodging',status:'confirmed'}],preferences:{mustVisit:'Kurzbesuch'}});
 assert.equal(a.length,0);
});
