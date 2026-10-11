const test=require('node:test'),assert=require('node:assert/strict');require('../budget-engine.js');require('../route-budget.js');const {snapshot}=globalThis.SouthboundRouteBudget;
const base={paid:100,reserve:50,goal:1000,cap:1200,items:[{i:0,stay:200,leg:20}],fixedCosts:{return:100,insurance:30,visas:0,equipment:0},waitingCost:40};
test('single route snapshot reconciles paid, future, reserve, fixed and waiting',()=>{const r=snapshot(base);assert.equal(r.totalEstimate,540);assert.equal(r.missingCount,0)});
test('unknown transfer is explicitly missing',()=>{const r=snapshot({...base,items:[{i:0,stay:200,leg:null}]});assert.equal(r.unknownTransfers.length,1);assert.equal(r.goalStatus,'unverified')});
test('blank fixed cost remains unknown, zero is valid',()=>{const r=snapshot({...base,fixedCosts:{...base.fixedCosts,return:''}});assert.ok(r.incompleteReasons.includes('missing-fixed-costs'))});
test('paid per stop is subtracted only from future, not total paid',()=>{const r=snapshot({...base,paidByStop:{0:60}});assert.equal(r.totalEstimate,480)});
test('completed stages are excluded from future forecast',()=>{const r=snapshot({...base,completed:{0:true}});assert.equal(r.totalEstimate,320)});
test('unrecorded completed stages prevent completeness',()=>{const r=snapshot({...base,unrecorded:1});assert.ok(r.incompleteReasons.includes('unrecorded-completed-stops'))});

test('missing historical spending keeps budget status unverified',()=>{const r=snapshot({...base,unrecorded:1});assert.equal(r.complete,false);assert.equal(r.goalStatus,'unverified')});
test('unknown waiting expenses keep goal status unverified',()=>{const r=snapshot({...base,waitingComplete:false});assert.equal(r.goalStatus,'unverified')});
