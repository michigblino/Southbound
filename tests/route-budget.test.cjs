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

test('unverified travel dates cannot pass all-in completion',()=>{const r=snapshot({...base,timingFeasible:false});assert.equal(r.complete,false);assert.equal(r.goalStatus,'unverified');assert.ok(r.incompleteReasons.includes('unverified-route-dates'))});

test('unknown lodging does not erase known transfer estimate',()=>{const r=snapshot({...base,items:[{i:0,stay:null,leg:45}]});assert.equal(r.totalEstimate,365);assert.equal(r.missingCount,1);assert.equal(r.complete,false);assert.ok(r.lines.some(x=>x.label==='Transfer 0'&&x.amount===45))});
test('unknown transfer does not erase known lodging',()=>{const r=snapshot({...base,items:[{i:0,stay:200,leg:null}]});assert.equal(r.totalEstimate,520);assert.equal(r.missingCount,1);assert.ok(r.lines.some(x=>x.label==='Aufenthalt 0'&&x.amount===200))});
test('prepayment beyond lodging offsets the remaining transfer once',()=>{const r=snapshot({...base,paidByStop:{0:210}});assert.equal(r.totalEstimate,330);assert.ok(r.lines.some(x=>x.label==='Transfer 0'&&x.amount===10))});
test('prepayment with unknown lodging cannot be silently allocated',()=>{const r=snapshot({...base,items:[{i:0,stay:null,leg:45}],paidByStop:{0:20}});assert.equal(r.totalEstimate,365);assert.ok(r.incompleteReasons.includes('unallocated-prepayments'))});

test('invalid negative stop prepayment is not silently accepted as verified',()=>{const r=snapshot({...base,paidByStop:{0:-20}});assert.equal(r.complete,false);assert.ok(r.incompleteReasons.includes('invalid-stop-prepayments'));assert.deepEqual(r.invalidPrepayments,[0])});
test('non-numeric stop prepayment is explicitly flagged',()=>{const r=snapshot({...base,paidByStop:{0:'unknown'}});assert.equal(r.goalStatus,'unverified');assert.ok(r.incompleteReasons.includes('invalid-stop-prepayments'))});


test('incomplete budget cannot claim to be under goal even with positive headroom',()=>{
 const r=snapshot({...base,items:[{i:0,stay:200,leg:null}]});
 assert.equal(r.complete,false);
 assert.equal(r.budgetVerdict,'incomplete');
 assert.equal(r.minimumKnownEstimate,520);
 assert.equal(r.budgetHeadroom,480);
 assert.equal(r.minimumGoalOverrun,0);
 assert.equal(r.goalStatus,'unverified');
});
test('known costs over goal are a minimum overrun when other costs are unknown',()=>{
 const r=snapshot({...base,goal:400,cap:500,items:[{i:0,stay:200,leg:null}]});
 assert.equal(r.complete,false);
 assert.equal(r.minimumGoalOverrun,120);
 assert.equal(r.minimumCapOverrun,20);
 assert.equal(r.budgetVerdict,'incomplete');
});
test('complete budget exposes estimated status and consistent headroom',()=>{
 const r=snapshot(base);
 assert.equal(r.complete,true);
 assert.equal(r.budgetVerdict,'within-estimate');
 assert.equal(r.minimumKnownEstimate,r.totalEstimate);
 assert.equal(r.budgetHeadroom,460);
});

test('missing additional host fees are unknown, not silently zero',()=>{
 const r=snapshot({...base,items:[{i:0,stay:200,leg:20,hostExtras:null,hostFoodKnown:false}]});
 assert.equal(r.goalStatus,'unverified');
 assert.ok(r.incompleteReasons.includes('unknown-host-extra-costs'));
 assert.ok(r.incompleteReasons.includes('unknown-host-meals'));
});
test('priced host extras already included in stay are not charged a second time',()=>{
 const r=snapshot({...base,items:[{i:0,stay:250,leg:20,hostExtras:50,hostFoodKnown:true}]});
 assert.equal(r.totalEstimate,590);
});
