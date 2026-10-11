const test=require('node:test');const assert=require('node:assert/strict');require('../itinerary.js');const {plan}=globalThis.SouthboundItinerary;const s=[['A','X',0,0,4,15,10,5,3,0,0,'Ankunft'],['B','X',0,1,4,15,10,5,3,20,40,'Bus'],['C','X',0,2,4,15,10,5,3,25,45,'Bus']];
test('recalculates dates when stop removed',()=>{const p=plan({stops:s,start:'2026-12-28',excluded:{1:true}});assert.equal(p.items[1].start,'2027-01-01');assert.equal(p.items[1].leg,null);assert.equal(p.unknown,1)});
test('changing days shifts subsequent calendar dates',()=>{const p=plan({stops:s,days:{0:7}});assert.equal(p.items[1].start,'2027-01-04')});
test('volunteering removes only lodging, not food or activities',()=>{const p=plan({stops:s,vol:{0:true}});assert.equal(p.items[0].daily,18)});
test('inserting stop in custom order flags unpriced onward connection',()=>{const p=plan({stops:s,order:[0,2,1]});assert.equal(p.unknown,2)});
