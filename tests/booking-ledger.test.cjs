const test=require('node:test'),assert=require('node:assert/strict');
const {validate,reconcile}=require('../booking-ledger.js');
const stops=[{i:0,name:'A',start:'2027-01-01',arrival:'2027-01-01',end:'2027-01-03',days:2,bed:20,food:10,leisure:5,other:0,stay:70,leg:0},
{i:1,name:'B',start:'2027-01-03',arrival:'2027-01-03',end:'2027-01-06',days:3,daily:35,bed:20,food:10,leisure:5,other:0,stay:105,leg:80}];
const booking=(v={})=>({id:'abc',type:'transport',stageId:1,fromStageId:0,title:'Bus A nach B',provider:'ExampleBus',reference:'ABC123',startDate:'2027-01-03',endDate:'',status:'confirmed',totalEUR:45,paidEUR:20,refundedEUR:0,recordedElsewhere:false,url:'https://example.com',...v});
test('confirmed dated transfer replaces estimate, payment counted only once',()=>{
 const r=reconcile({items:stops,bookings:[booking()],legacyPaidByStop:{1:0}});
 assert.equal(r.items[1].leg,45);assert.equal(r.extraPaid,20);assert.deepEqual(r.paidByStop,{1:20});assert.equal(r.accountedPaidByStop[1],20);assert.equal(r.bookingIntegrity,true);
});
test('requested or tentative bookings do not reprice the itinerary',()=>{
 const r=reconcile({items:stops,bookings:[booking({status:'requested',paidEUR:10,reference:''})]});
 assert.equal(r.items[1].leg,80);assert.equal(r.extraPaid,10);assert.deepEqual(r.paidByStop,{});
});
test('changed origin, trip date or excluded stop makes a confirmed booking unsafe to price',()=>{
 for(const modified of [{fromStageId:2},{startDate:'2027-02-03'},{stageId:4}]){
 const r=reconcile({items:stops,bookings:[booking(modified)]});
 assert.equal(r.items[1].leg,80);assert.equal(r.bookingIntegrity,false);assert.equal(r.extraPaid,20);assert.deepEqual(r.paidByStop,{});
 }
});
test('lodging exact dates replace estimate without touching meals/activities',()=>{
 const r=reconcile({items:stops,bookings:[booking({type:'lodging',fromStageId:null,startDate:'2027-01-03',endDate:'2027-01-06',totalEUR:36})]});
 assert.equal(r.items[1].stay,81);assert.equal(r.items[1].bed,12);assert.equal(r.items[1].daily,35-8);assert.equal(r.bookingIntegrity,true);
});
test('partial lodging dates never overwrite full-stay estimates',()=>{
 const r=reconcile({items:stops,bookings:[booking({type:'lodging',startDate:'2027-01-04',endDate:'2027-01-06'})]});
 assert.equal(r.items[1].stay,105);assert.equal(r.bookingIntegrity,false);
});
test('confirmed volunteering log does not create a free host',()=>{
 const r=reconcile({items:stops,bookings:[booking({type:'volunteering',totalEUR:0,paidEUR:0})]});
 assert.equal(r.items[1].stay,105);assert.equal(r.bookingIntegrity,false);
 assert.equal(r.warnings[0].reason,'host-acceptance-not-confirmed');
});
test('activity within allowance counts bookings once; extras add on top',()=>{
 const a=booking({type:'activity',stageId:1,startDate:'2027-01-04',totalEUR:20,paidEUR:5});
 const b=booking({id:'def',type:'activity',stageId:1,startDate:'2027-01-05',totalEUR:30,paidEUR:0,activityMode:'extra'});
 const r=reconcile({items:stops,bookings:[a,b]});
 // allowance 3x5=15; book of 20 increases forecast by 5. Extra activity adds 30.
 assert.equal(r.items[1].stay,140);assert.equal(r.extraPaid,5);assert.equal(r.paidByStop[1],5);assert.equal(r.bookingIntegrity,true);
});
test('paid bookings that were already logged as actuals are not counted twice',()=>{
 const r=reconcile({items:stops,bookings:[booking({paidEUR:45,recordedElsewhere:true})],legacyPaidByStop:{1:45}});
 assert.equal(r.extraPaid,0);assert.equal(r.accountedPaidByStop[1],45);
});
test('cancelled and refunded bookings keep only non-refunded sunk payments',()=>{
 const r=reconcile({items:stops,bookings:[booking({status:'cancelled',paidEUR:45,refundedEUR:40})]});
 assert.equal(r.items[1].leg,80);assert.equal(r.extraPaid,5);assert.deepEqual(r.paidByStop,{});
});
test('duplicate booking ID, invalid amounts and insecure URL are rejected',()=>{
 const invalid=validate(booking({url:'http://example.com',paidEUR:48,totalEUR:45}));
 assert.equal(invalid.ok,false);
 const r=reconcile({items:stops,bookings:[booking(),booking({title:'Duplicate'})]});
 assert.equal(r.confirmed,1);assert.equal(r.extraPaid,20);assert.equal(r.bookingIntegrity,false);
});
test('no entries preserve original itinerary and payments',()=>{
 const r=reconcile({items:stops,bookings:[]});
 assert.deepEqual(r.items,stops);assert.equal(r.extraPaid,0);assert.equal(r.bookingIntegrity,true);
});

test('only matching confirmed host charges offset payments already included in itinerary',()=>{
 const host={confirmed:true,night:0,from:'2027-01-03',to:'2027-01-06',extraCosts:35};
 const current=[stops[0],{...stops[1],bed:0,hostExtras:35,stay:80}];
 const b=booking({type:'volunteering',startDate:host.from,endDate:host.to,totalEUR:35,paidEUR:20});
 const yes=reconcile({items:current,bookings:[b],vol:{1:true},volunteerDetails:{1:host}});
 assert.equal(yes.bookingIntegrity,true);assert.equal(yes.paidByStop[1],20);
 const no=reconcile({items:current,bookings:[{...b,startDate:'2027-02-03'}],vol:{1:true},volunteerDetails:{1:host}});
 assert.equal(no.bookingIntegrity,false);assert.deepEqual(no.paidByStop,{});
});

test('two non-overlapping hostels replace only reserved nights and leave gap estimated',()=>{
 const first=booking({id:'hostel-a',type:'lodging',startDate:'2027-01-03',endDate:'2027-01-04',totalEUR:10,paidEUR:10});
 const second=booking({id:'hostel-b',type:'lodging',startDate:'2027-01-05',endDate:'2027-01-06',totalEUR:35,paidEUR:20});
 const r=reconcile({items:stops,bookings:[first,second]});
 assert.equal(r.items[1].stay,110); // 105 - 2 estimated nights *20 + actual 10+35
 assert.equal(r.items[1].bed,21.67); // replaced lodging subtotal = 10 + 20 (gap) + 35
 assert.equal(r.items[1].bookingLodgings.length,2);
 assert.deepEqual(r.matched,['hostel-a','hostel-b']);
 assert.equal(r.paidByStop[1],30);
 assert.equal(r.extraPaid,30);
 assert.equal(r.bookingIntegrity,true);
});
test('overlapping hostels are both flagged without changing original projected stay',()=>{
 const a=booking({id:'a',type:'lodging',startDate:'2027-01-03',endDate:'2027-01-05',totalEUR:30,paidEUR:10});
 const b=booking({id:'b',type:'lodging',startDate:'2027-01-04',endDate:'2027-01-06',totalEUR:25,paidEUR:10});
 const r=reconcile({items:stops,bookings:[a,b]});
 assert.equal(r.items[1].stay,105);
 assert.equal(r.extraPaid,20);
 assert.equal(r.paidByStop[1],undefined);
 assert.equal(r.bookingIntegrity,false);
 assert.ok(r.warnings.some(x=>x.reason==='overlapping-lodging-bookings'));
});
test('one out-of-range booking blocks repricing of other entries in the same stage',()=>{
 const a=booking({id:'a',type:'lodging',startDate:'2027-01-03',endDate:'2027-01-04',totalEUR:25,paidEUR:10});
 const b=booking({id:'b',type:'lodging',startDate:'2027-01-06',endDate:'2027-01-07',totalEUR:25,paidEUR:10});
 const r=reconcile({items:stops,bookings:[a,b]});
 assert.equal(r.items[1].stay,105);
 assert.equal(r.bookingIntegrity,false);
 assert.equal(r.matched.length,0);
});
test('cancelled hostel and refund leave only non-refunded sunk spending',()=>{
 const confirmed=booking({id:'confirmed',type:'lodging',startDate:'2027-01-03',endDate:'2027-01-04',totalEUR:12,paidEUR:7});
 const cancelled=booking({id:'cancelled',type:'lodging',status:'cancelled',startDate:'2027-01-04',endDate:'2027-01-06',totalEUR:40,paidEUR:25,refundedEUR:20});
 const r=reconcile({items:stops,bookings:[confirmed,cancelled]});
 assert.equal(r.items[1].stay,97); // 105 - 20 estimated + 12
 assert.equal(r.extraPaid,12); // 7 reservation + 5 non-refunded cancellation
 assert.equal(r.paidByStop[1],7);
 assert.equal(r.bookingIntegrity,true);
});
test('hostel nights before confirmed host are stored as waiting and never replace free host bed',()=>{
 const host={confirmed:true,night:0,from:'2027-01-05',to:'2027-01-08',extraCosts:0,foodPerDay:10};
 const stage={...stops[1],arrival:'2027-01-03',start:'2027-01-05',end:'2027-01-08',days:3,bed:0,regularBed:20,hostExtras:0,stay:51,waitingDays:2};
 const a=booking({id:'wait-hostel',type:'lodging',startDate:'2027-01-03',endDate:'2027-01-05',totalEUR:26,paidEUR:10});
 const r=reconcile({items:[stops[0],stage],bookings:[a],vol:{1:true},volunteerDetails:{1:host}});
 assert.equal(r.bookingIntegrity,true);
 assert.equal(r.items[1].stay,51);
 assert.equal(r.items[1].bed,0);
 assert.equal(r.items[1].waitBookings.length,1);
 assert.equal(r.items[1].waitBookings[0].totalEUR,26);
 assert.equal(r.paidByStop[1],undefined);
 assert.equal(r.waitPaidByStop[1],10);
 assert.equal(r.extraPaid,10);
});
test('hostel nights overlapping confirmed host are not billed as separate rooms silently',()=>{
 const host={confirmed:true,night:0,from:'2027-01-05',to:'2027-01-08',extraCosts:0,foodPerDay:10};
 const stage={...stops[1],arrival:'2027-01-03',start:'2027-01-05',end:'2027-01-08',days:3,bed:0,regularBed:20,hostExtras:0,stay:51,waitingDays:2};
 const a=booking({id:'wait-hostel',type:'lodging',startDate:'2027-01-04',endDate:'2027-01-06',totalEUR:26,paidEUR:10});
 const r=reconcile({items:[stops[0],stage],bookings:[a],vol:{1:true},volunteerDetails:{1:host}});
 assert.equal(r.bookingIntegrity,false);
 assert.equal(r.items[1].stay,51);
 assert.equal(r.items[1].waitBookings,undefined);
 assert.equal(r.extraPaid,10);
});
test('confirmed lodging needs a valid checkout date, but draft transfers stay unchanged',()=>{
 const bad=validate(booking({type:'lodging',endDate:''}));
 assert.equal(bad.ok,false);
 assert.ok(bad.errors.includes('lodging-checkout-required'));
 assert.equal(validate(booking({status:'planned',reference:''})).ok,true);
});
