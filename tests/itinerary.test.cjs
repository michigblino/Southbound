const test=require('node:test');const assert=require('node:assert/strict');require('../itinerary.js');const {plan}=globalThis.SouthboundItinerary;const s=[['A','X',0,0,4,15,10,5,3,0,0,'Ankunft'],['B','X',0,1,4,15,10,5,3,20,40,'Bus'],['C','X',0,2,4,15,10,5,3,25,45,'Bus']];
test('recalculates dates when stop removed',()=>{const p=plan({stops:s,start:'2026-12-28',excluded:{1:true}});assert.equal(p.items[1].start,'2027-01-01');assert.equal(p.items[1].leg,null);assert.equal(p.unknown,1)});
test('changing days shifts subsequent calendar dates',()=>{const p=plan({stops:s,days:{0:7}});assert.equal(p.items[1].start,'2027-01-04')});
test('unconfirmed volunteering keeps lodging; confirmed free host keeps food and activities',()=>{const pending=plan({stops:s,vol:{0:true}});assert.equal(pending.items[0].daily,33);const confirmed=plan({stops:s,vol:{0:true},volunteerDetails:{0:{confirmed:true,night:0}}});assert.equal(confirmed.items[0].daily,18)});
test('inserting stop in custom order flags unpriced onward connection',()=>{const p=plan({stops:s,order:[0,2,1]});assert.equal(p.unknown,2)});

test('unconfirmed volunteering location with zero legacy bed price still costs lodging',()=>{const v=[['Salvador','Brasilien',-12.97,-38.51,21,0,12,6,4,0,0]];const p=plan({stops:v,vol:{0:false}});assert.ok(p.items[0].bed>0);assert.ok(p.items[0].stay>21*(12+6+4))});
test('only confirmed host reduces lodging and keeps meals and activities',()=>{const v=[['Salvador','Brasilien',-12.97,-38.51,21,0,12,6,4,0,0]];const p=plan({stops:v,vol:{0:true},volunteerDetails:{0:{confirmed:true,night:0}}});assert.equal(p.items[0].bed,0);assert.equal(p.items[0].daily,22)});
test('return-home stop has zero stay but unknown incoming fare remains unverified',()=>{const v=[...s,['Home','Germany',1,2,30,50,20,10,4,0,0,'flight','','','return']];const p=plan({stops:v});assert.equal(p.items.at(-1).days,0);assert.equal(p.items.at(-1).stay,0);assert.equal(p.items.at(-1).leg,null);assert.equal(p.items.at(-1).quality,'connection-unknown');assert.ok(p.unknown>=1)});

test('confirmed host without a quoted nightly cost is not silently free',()=>{const p=plan({stops:s,vol:{0:true},volunteerDetails:{0:{confirmed:true}}});assert.equal(p.items[0].bed,15);assert.equal(p.items[0].daily,33)});
test('confirmed host with explicit zero nightly cost can be free',()=>{const p=plan({stops:s,vol:{0:true},volunteerDetails:{0:{confirmed:true,night:0}}});assert.equal(p.items[0].bed,0);assert.equal(p.items[0].daily,18)});

test('zero placeholder transport fares remain unknown on a normal consecutive leg',()=>{const p=plan({stops:s.map((row,i)=>i===1?[...row.slice(0,9),0,0,...row.slice(11)]:row)});assert.equal(p.items[1].leg,null);assert.equal(p.items[1].quality,'connection-unknown')});
test('explicit positive transport range remains an estimate, not a free transfer',()=>{const p=plan({stops:s});assert.equal(p.items[1].leg,30);assert.equal(p.items[1].legMin,20);assert.equal(p.items[1].legMax,40)});

test('confirmed host start shifts visible stage dates and later stops',()=>{
 const p=plan({stops:s,start:'2027-01-01',vol:{1:true},volunteerDetails:{1:{confirmed:true,night:0,from:'2027-01-10',to:'2027-01-14',foodPerDay:10,extraCosts:0}}});
 assert.equal(p.items[1].arrival,'2027-01-05');
 assert.equal(p.items[1].start,'2027-01-10');
 assert.equal(p.items[1].waitingDays,5);
 assert.equal(p.items[1].end,'2027-01-14');
 assert.equal(p.items[2].arrival,'2027-01-14');
 assert.equal(p.finish,'2027-01-18');
});
test('confirmed host expenses are added once to itinerary stay',()=>{
 const p=plan({stops:s,vol:{1:true},volunteerDetails:{1:{confirmed:true,night:0,foodPerDay:10,extraCosts:60}}});
 assert.equal(p.items[1].hostExtras,60);
 assert.equal(p.items[1].stay,p.items[1].days*p.items[1].daily+60);
 assert.equal(p.known,p.items.reduce((sum,item)=>sum+item.stay+(item.leg||0),0));
});
test('unknown confirmed host fees are visible as unknown',()=>{
 const p=plan({stops:s,vol:{1:true},volunteerDetails:{1:{confirmed:true,night:0,foodPerDay:10}}});
 assert.equal(p.items[1].hostExtras,null);
});
