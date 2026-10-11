const test=require('node:test');const assert=require('node:assert/strict');require('../inflation.js');const {latest,estimate,code}=globalThis.SouthboundInflation;
test('recognizes country',()=>{assert.equal(code('Brasilien'),'BRA');assert.equal(code('Chile'),'CHL')});
test('latest ignores missing annual CPI observations',()=>assert.deepEqual(latest([{date:'2026',value:null},{date:'2025',value:4.2},{date:'2024',value:5}]),{year:2025,rate:4.2}));
test('compounds yearly inflation, not a flat surcharge',()=>{const x=estimate({price:100,observedYear:2025,targetYear:2027,annualRate:7});assert.ok(Math.abs(x.price-114.49)<0.01);assert.equal(x.verified,false)});
test('rejects invalid or distant projection',()=>assert.equal(estimate({price:100,observedYear:2020,targetYear:2027,annualRate:7}),null));
