const test=require('node:test');const assert=require('node:assert/strict');require('../wait-costs.js');const {estimate}=globalThis.SouthboundWaitCosts;
test('waiting nights include paid bed and food',()=>{const x=estimate({calendarItems:[{index:0,waitingDays:2}],stages:[{waitBed:15,waitFood:12,waitOther:3}]});assert.equal(x.total,60);assert.equal(x.complete,true)});
test('unknown accommodation does not silently become free',()=>{const x=estimate({calendarItems:[{index:0,waitingDays:2}],stages:[{waitBed:null,waitFood:12}]});assert.equal(x.complete,false);assert.equal(x.lines[0].amount,null)});
test('no waiting nights has no cost',()=>assert.equal(estimate({calendarItems:[{index:0,waitingDays:0}]}).total,0));

test('a confirmed hostel replaces only selected host waiting nights',()=>{
 const x=estimate({calendarItems:[{index:0,arrival:'2027-01-01',start:'2027-01-04',waitingDays:3}],stages:[{waitBed:20,waitFood:10,waitOther:2,waitBookings:[{id:'b',startDate:'2027-01-01',endDate:'2027-01-03',totalEUR:24}]}]});
 assert.equal(x.total,24+20+3*12);
 assert.equal(x.lines[0].bookedNights,2);
 assert.equal(x.complete,true);
});
test('booked waiting nights do not require a fallback lodging price when full period is booked',()=>{
 const x=estimate({calendarItems:[{index:0,arrival:'2027-01-01',start:'2027-01-03',waitingDays:2}],stages:[{waitBed:null,waitFood:9,waitOther:1,waitBookings:[{id:'b',startDate:'2027-01-01',endDate:'2027-01-03',totalEUR:25}]}]});
 assert.equal(x.complete,true);assert.equal(x.total,45);
});
test('out-of-range host-wait bookings mark pricing incomplete',()=>{
 const x=estimate({calendarItems:[{index:0,arrival:'2027-01-01',start:'2027-01-03',waitingDays:2}],stages:[{waitBed:20,waitFood:9,waitBookings:[{id:'old',startDate:'2027-01-02',endDate:'2027-01-04',totalEUR:25}]}]});
 assert.equal(x.complete,false);assert.equal(x.lines[0].amount,null);
});
