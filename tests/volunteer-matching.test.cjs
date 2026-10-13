const test=require('node:test');const assert=require('node:assert/strict');
require('../volunteer-matching.js');const {evaluate,match}=globalThis.SouthboundVolunteerMatching;
test('hours above preferred limit remain selectable but flagged',()=>{const x=evaluate({hoursPerWeek:31,distanceKm:1,minStayDays:7,availabilityConfirmed:true});assert.equal(x.status,'needs-verification');assert.ok(x.unknown.includes('hours-over-preference'))});
test('unknown hours never count as confirmed eligible',()=>{const x=evaluate({distanceKm:1,minStayDays:7,availabilityConfirmed:true});assert.equal(x.status,'needs-verification');assert.ok(x.unknown.includes('hours'))});
test('outside radius is excluded',()=>assert.ok(evaluate({hoursPerWeek:20,distanceKm:20.1,minStayDays:7,availabilityConfirmed:true}).reasons.includes('outside-radius')));
test('20 km boundary qualifies',()=>assert.equal(evaluate({hoursPerWeek:20,distanceKm:20,minStayDays:7,availabilityConfirmed:true}).status,'eligible'));
test('deduplicates same canonical host',()=>assert.equal(match([{canonicalHostId:'x',id:'1'},{canonicalHostId:'x',id:'2'}]).length,1));
test('required meals are a hard filter',()=>assert.ok(evaluate({hoursPerWeek:20,distanceKm:1,minStayDays:7,availabilityConfirmed:true,mealsIncluded:false},{food:'required'}).reasons.includes('meals-not-included')));
