const test=require('node:test');const assert=require('node:assert/strict');
require('../budget-engine.js');const {calculate}=globalThis.SouthboundBudgetEngine;
test('all-in costs include paid costs, future items, fixed costs and reserve once',()=>{
 const x=calculate({paid:1000,reserve:500,goal:3000,cap:4000,items:[{stay:300},{stay:400,leg:100}],fixedCosts:[{label:'insurance',amount:200,status:'verified'}]});
 assert.equal(x.totalEstimate,2500);assert.equal(x.goalGap,0);assert.equal(x.complete,true);
});
test('unknown transfer prevents a claim that budget is verified',()=>{
 const x=calculate({goal:8000,items:[{stay:300},{stay:400,leg:null}]});
 assert.equal(x.missingCount,1);assert.equal(x.complete,false);assert.equal(x.goalStatus,'unverified');
});
test('goal and cap are separate thresholds',()=>{
 const x=calculate({goal:8000,cap:12000,paid:9000});
 assert.equal(x.goalGap,1000);assert.equal(x.capGap,0);assert.equal(x.goalStatus,'over');
});
test('zero-valued confirmed costs are not unknown',()=>{
 const x=calculate({goal:100,items:[{stay:0}]});
 assert.equal(x.complete,true);assert.equal(x.totalEstimate,0);
});
