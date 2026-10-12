const test=require('node:test'),assert=require('node:assert/strict');
require('../transport-estimate.js');require('../itinerary.js');
const stops=[['A','X',0,0,2,20,10,0,0,0,0],['B','X',0,1,3,20,10,0,0,0,0]];
const offer={verified:true,operator:'Example Bus',url:'https://example.com/ticket',departureDate:'2027-01-03',checkedAt:'2026-10-12',currency:'EUR',price:42};
const plan=transportOffers=>globalThis.SouthboundItinerary.plan({stops,start:'2027-01-01',transportOffers});
test('dated sourced EUR offer overrides distance heuristic',()=>{const leg=plan({1:offer}).items[1];assert.equal(leg.leg,42);assert.equal(leg.legMin,42);assert.equal(leg.legMax,42);assert.equal(leg.quality,'user-verified-offer');assert.equal(leg.transportOffer.operator,'Example Bus')});
test('unknown currency must not be mistaken for EUR',()=>{const leg=plan({1:{...offer,currency:'BRL'}}).items[1];assert.equal(leg.quality,'distance-model');assert.equal(leg.transportOffer,null)});
test('missing provenance and invalid price use clearly labeled heuristic',()=>{for(const bad of [{...offer,url:''},{...offer,checkedAt:''},{...offer,price:-5},{...offer,price:''},{...offer,verified:false}]){const leg=plan({1:bad}).items[1];assert.equal(leg.quality,'distance-model');assert.equal(leg.transportOffer,null)}});
test('without offers estimates remain unchanged',()=>{const leg=plan({}).items[1];assert.equal(leg.quality,'distance-model');assert.ok(leg.leg>0)});
