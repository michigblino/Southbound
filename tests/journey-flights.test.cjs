const test=require('node:test'),assert=require('node:assert/strict');const {airportFrom,flightDisplay}=require('../journey-flights.js');
const airports=[['MUC','München',48.3538,11.775],['GRU','São Paulo',-23.4356,-46.4731],['EZE','Buenos Aires',-34.8222,-58.5358]];
const stages=[{i:0,name:'São Paulo',lat:-23.55,lng:-46.63},{i:1,name:'Buenos Aires',lat:-34.6,lng:-58.38}];
const flight=(attrs={})=>({type:'transport',travelMode:'flight',status:'planned',startDate:'2026-12-28',arrivalDate:'2026-12-29',provider:'Test',...attrs});
test('map flights include ONLY explicitly saved incoming and return transport records',()=>{
 const r=flightDisplay({stages,airports,bookings:[
  flight({id:'incoming',journeyOrigin:true,stageId:0,originPlace:'München (MUC)'}),
  flight({id:'home',journeyReturn:true,stageId:1,originPlace:'Buenos Aires',destinationPlace:'Munich',status:'confirmed'}),
  flight({id:'cancel',journeyOrigin:true,stageId:0,originPlace:'Frankfurt',status:'cancelled'})]});
 assert.equal(r.length,2);assert.deepEqual(r.map(x=>x.key),['inbound','return']);assert.ok(r.every(x=>x.drawable&&x.arc));
 assert.equal(r[0].from.lat,48.3538);assert.equal(r[0].to.lat,-23.55);assert.equal(r[1].to.lng,11.775);
 assert.equal(r[0].verified,false);assert.equal(r[1].verified,true);
});
test('unknown airport displays saved journey without generating coordinates or price',()=>{
 const r=flightDisplay({stages,airports,bookings:[flight({id:'x',stageId:0,journeyOrigin:true,originPlace:'Private airfield X'})]});
 assert.equal(r[0].drawable,false);assert.equal(r[0].amount,null);assert.match(r[0].warning,/nicht zugeordnet/);
});
test('cancelled journey absent; ordinary internal transport absent',()=>{
 assert.deepEqual(flightDisplay({stages,airports,bookings:[flight({status:'cancelled',journeyReturn:true}),flight({stageId:1})]}),[]);
});
