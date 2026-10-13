const test=require('node:test'),assert=require('node:assert/strict');
const {validate,reconcile}=require('../booking-ledger.js');
const stops=[{i:0,name:'A',start:'2027-01-01',arrival:'2027-01-01',end:'2027-01-03',days:2,bed:20,food:10,leisure:5,other:0,stay:70,leg:0},
{i:1,name:'B',start:'2027-01-03',arrival:'2027-01-03',end:'2027-01-06',days:3,bed:20,food:10,leisure:5,other:0,stay:105,leg:80}];
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
 assert.equal(r.items[1].stay,81);assert.equal(r.items[1].bed,12);assert.equal(r.bookingIntegrity,true);
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
