const test=require('node:test');const assert=require('node:assert/strict');require('../uncertainty.js');const {calculate}=globalThis.SouthboundUncertainty;
test('fixed costs never fluctuate',()=>{const r=calculate({fixed:1000,exposure:{lodging:100},rates:{lodging:20}});assert.equal(r.low,1080);assert.equal(r.center,1100);assert.equal(r.high,1120)});
test('no uncertainty if no future variable expenses',()=>{const r=calculate({fixed:300,exposure:{},goal:500,cap:600});assert.equal(r.low,300);assert.equal(r.high,300)});
test('upper and lower ranges combine categories',()=>{const r=calculate({fixed:100,exposure:{lodging:100,transport:200},rates:{lodging:10,transport:50}});assert.equal(r.low,290);assert.equal(r.high,510)});
test('rates are clamped and costs cannot be negative',()=>{const r=calculate({fixed:0,exposure:{transport:100},rates:{transport:200}});assert.equal(r.low,0);assert.equal(r.high,200)});
test('alerts if high scenario breaches budget cap',()=>{const r=calculate({fixed:1000,exposure:{transport:200},rates:{transport:50},goal:1100,cap:1250});assert.equal(r.capAtRisk,true);assert.equal(r.bufferToCap,-50)});
