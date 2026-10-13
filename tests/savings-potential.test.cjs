const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../savings-potential.js');
const I=(i,days,bed,opts={})=>({i,name:'Stop '+i,days,regularBed:bed,leg:null,legMin:null,...opts});
test('21–28 day hypothetical host windows cap gross lodging only',()=>{
 const p=analyze({items:[I(0,20,15),I(1,28,20),I(2,60,10)]});
 assert.equal(p.eligibleNights,56);assert.equal(p.grossAccommodationCeiling,840);
 assert.equal(p.averagedPerVolunteerNight,15);assert.equal(p.verifiedAdditionalSaving,null);
 assert.equal(p.routeReoptimizationSaving,null);assert.equal(p.assumptions.extraDaysAdded,0);
});
test('existing volunteer, booked lodging, completed stages and return never double counted',()=>{
 const p=analyze({items:[I(0,28,20),I(1,28,40),I(2,28,20),I(3,28,99,{isReturn:true})],
  vol:{0:true},volunteerDetails:{0:{confirmed:true}},bookings:[{type:'lodging',stageId:1,status:'confirmed'}],
  completed:{2:true}});
 assert.equal(p.grossAccommodationCeiling,0);assert.equal(p.candidateCount,0);
});
test('known >30 h/week excluded; unknown hours stays hypothetical, not verified',()=>{
 const p=analyze({items:[I(0,28,10),I(1,25,14)],volunteerDetails:{0:{hoursPerWeek:32}}},
 );
 assert.equal(p.grossAccommodationCeiling,350);assert.equal(p.candidates[0].i,1);
 assert.equal(p.candidates[0].hoursKnown,false);assert.equal(p.assumptions.hourLimit,30);
});
test('invalid and unknown beds never interpreted as free or positive savings',()=>{
 const p=analyze({items:[I(0,25,null),I(1,25,-5),I(2,25,0)]});
 assert.equal(p.grossAccommodationCeiling,0);assert.equal(p.candidateCount,1);
 assert.ok(p.reasons.length>=2);
});
test('leg range is labeled price spread; never merged into host gross or verified route savings',()=>{
 const p=analyze({items:[I(0,22,10,{leg:100,legMin:70}),I(1,22,20,{leg:80,legMin:60,transportOffer:{price:80}})]});
 assert.equal(p.grossAccommodationCeiling,660);assert.equal(p.priceSpreadIndicator,30);assert.equal(p.verifiedAdditionalSaving,null);
});

test('maximum voluntary host weeks below three disallows 21-day blocks',()=>{
 const p=analyze({items:[I(0,28,20)],preferences:{maxVolunteerWeeks:2}});
 assert.equal(p.grossAccommodationCeiling,0);assert.equal(p.eligibleNights,0);
});
