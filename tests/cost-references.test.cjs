const test=require('node:test');const assert=require('node:assert/strict');require('../cost-references.js');const {sample,compare,refreshFx}=globalThis.SouthboundCostReferences;
test('maps specific itinerary stops to source city data',()=>{assert.equal(sample(0).name,'São Paulo');assert.equal(sample(15).name,'Arequipa');assert.equal(sample(23).name,'Bariloche');assert.equal(sample(24),null)});
test('does not invent data for unsupported cities',()=>{const x=compare([{id:24,active:true}],{usdEur:.9});assert.equal(x.matched,0);assert.equal(x.items[0].quality,'app-estimate')});
test('uses external reference only with valid FX',()=>{const x=compare([{id:14,active:true,volunteering:false}],{usdEur:.9});assert.equal(x.items[0].daily,41*.9);assert.equal(compare([{id:14}],{}).matched,0)});
test('FX parser rejects invalid rate',async()=>{await assert.rejects(refreshFx(async()=>({ok:true,json:async()=>({rate:0})})))});
