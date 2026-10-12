const test=require('node:test');const assert=require('node:assert/strict');require('../wait-costs.js');const {estimate}=globalThis.SouthboundWaitCosts;
test('waiting nights include paid bed and food',()=>{const x=estimate({calendarItems:[{index:0,waitingDays:2}],stages:[{waitBed:15,waitFood:12,waitOther:3}]});assert.equal(x.total,60);assert.equal(x.complete,true)});
test('unknown accommodation does not silently become free',()=>{const x=estimate({calendarItems:[{index:0,waitingDays:2}],stages:[{waitBed:null,waitFood:12}]});assert.equal(x.complete,false);assert.equal(x.lines[0].amount,null)});
test('no waiting nights has no cost',()=>assert.equal(estimate({calendarItems:[{index:0,waitingDays:0}]}).total,0));
