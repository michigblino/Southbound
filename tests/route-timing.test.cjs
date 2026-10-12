const test=require('node:test'),assert=require('node:assert/strict');require('../trip-calendar.js');require('../wait-costs.js');require('../route-timing.js');const {evaluate}=globalThis.SouthboundRouteTiming;
test('both current and hypothetical route use priced waiting nights',()=>{const opts={start:'2027-01-01',stops:[['Place','X',0,0,4,20]],items:[{i:0,name:'Place',days:4,food:10,other:2}],volunteerDetails:{0:{from:'2027-01-03',to:'2027-01-07'}},isVolunteer:()=>true};const x=evaluate(opts);assert.equal(x.waiting.total,64);assert.equal(x.schedule.items[0].waitingDays,2)});
test('missing bed is not assumed free',()=>{const x=evaluate({start:'2027-01-01',stops:[['Place','X',0,0,4,0]],items:[{i:0,days:4,food:10}],volunteerDetails:{0:{from:'2027-01-03',to:'2027-01-07'}},isVolunteer:()=>true});assert.equal(x.waiting.complete,false)});
test('confirmed host collision is flagged',()=>{const x=evaluate({start:'2027-01-05',stops:[['Place','X',0,0,4,20]],items:[{i:0,days:4,food:10}],volunteerDetails:{0:{from:'2027-01-03',to:'2027-01-07'}},isVolunteer:()=>true});assert.equal(x.schedule.feasible,false)});

test('unknown transfer duration is flagged rather than claimed zero',()=>{const x=evaluate({start:'2027-01-01',stops:[[ 'A','X',0,0,2,20],['B','X',0,0,2,20]],items:[{i:0,days:2,food:10},{i:1,days:2,food:10}]});assert.deepEqual(x.unknownTransferDays,[1]);assert.equal(x.transferDaysVerified,false)});
test('confirmed transfer duration shifts downstream arrival',()=>{const x=evaluate({start:'2027-01-01',stops:[[ 'A','X',0,0,2,20],['B','X',0,0,2,20]],items:[{i:0,days:2,food:10},{i:1,days:2,food:10}],transferDaysByStop:{1:2}});assert.equal(x.schedule.items[1].arrival,'2027-01-05');assert.equal(x.transferDaysVerified,true)});

test('confirmed volunteering without host dates cannot verify route feasibility',()=>{const x=evaluate({start:'2027-01-01',stops:[['A','X',0,0,4,20]],items:[{i:0,days:4,food:10,other:2}],volunteerDetails:{0:{confirmed:true,night:0}},isVolunteer:()=>true});assert.deepEqual(x.unverifiedHostDates,[0]);assert.equal(x.hostDatesVerified,false);assert.equal(x.feasible,false)});
test('complete confirmed host window verifies date constraint when no transfers are missing',()=>{const x=evaluate({start:'2027-01-01',stops:[['A','X',0,0,4,20]],items:[{i:0,days:4,food:10,other:2}],volunteerDetails:{0:{confirmed:true,night:0,from:'2027-01-01',to:'2027-01-05'}},isVolunteer:()=>true});assert.deepEqual(x.unverifiedHostDates,[]);assert.equal(x.hostDatesVerified,true);assert.equal(x.feasible,true)});

test('waiting for host uses normal food and lodging instead of confirmed free meals',()=>{
 const opts={start:'2027-01-01',
  stops:[['A','X',0,0,2,22,10,5,2,0,0],['B','X',0,1,3,22,10,5,2,0,0]],
  items:[{i:0,days:2,food:10,other:2},{i:1,days:3,food:0,regularBed:22,other:2}],
  volunteerDetails:{1:{confirmed:true,night:0,from:'2027-01-10',to:'2027-01-13'}},
  isVolunteer:i=>i===1,transferDaysByStop:{1:0}};
 const r=evaluate(opts);assert.equal(r.schedule.items[1].waitingDays,7);
 assert.equal(r.waiting.total,7*(22+10+2));
});
