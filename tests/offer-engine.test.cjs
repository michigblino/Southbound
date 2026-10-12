const test=require('node:test');const assert=require('node:assert/strict');const offers=require('../offer-engine.js');
const base={type:'lodging',id:'h1',status:'manually-checked',price:19,currency:'EUR',source:{name:'Hostel',url:'https://example.com/room'},checkedAt:'2026-10-12',availableOn:'2026-12-28'};
test('all four offer types supported',()=>{for(const type of offers.types)assert.equal(offers.normalize({...base,type},'2026-10-12').type,type)});
test('sourced price needs valid source and date',()=>{assert.equal(offers.normalize(base,'2026-10-12').priceKind,'sourced');assert.notEqual(offers.normalize({...base,source:{name:'bad',url:'http://example.com'}},'2026-10-12').priceKind,'sourced')});
test('outdated quotes are not sourced prices',()=>{assert.notEqual(offers.normalize(base,'2026-10-13').priceKind,'sourced')});
test('user entries cannot claim live provider availability',()=>{const x=offers.normalize({...base,status:'live'},'2026-10-12');assert.equal(x.providerAvailability,false);assert.notEqual(x.priceKind,'sourced')});
test('unpriced offers remain unknown',()=>{assert.equal(offers.normalize({...base,price:null},'2026-10-12').priceKind,'unknown')});
test('comparisons prefer sourced offers over estimates',()=>{const result=offers.compare([{...base,status:'estimate',price:5},base],'2026-10-12');assert.equal(result[0].priceKind,'sourced')});
