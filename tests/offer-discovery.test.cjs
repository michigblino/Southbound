const test=require('node:test'),assert=require('node:assert/strict');
const discovery=require('../offer-discovery.js');
const route=[
 {i:0,name:'São Paulo',start:'2027-01-02',end:'2027-01-06'},
 {i:1,name:'Rio de Janeiro',start:'2027-01-06',end:'2027-01-12'},
 {i:2,name:'Salvador',start:'2027-01-12',end:'2027-01-20'}
];
const lodge=discovery.context(route,{type:'lodging',stageId:2,people:2});
const transport=discovery.context(route,{type:'transport',stageId:2,people:1});
const now='2026-10-14';
const mockResponse=(body,{status=200,type='application/json'}={})=>({
 ok:status>=200&&status<300,status,
 headers:{get:key=>key==='content-type'?type:key==='content-length'?null:null},
 text:async()=>typeof body==='string'?body:JSON.stringify(body)
});
const providerOffer={
 type:'lodging',stageId:2,fromStageId:null,startDate:'2027-01-12',endDate:'2027-01-20',people:2,
 title:'Hostel aus Testfixture',provider:'Anbieter-Test (keine Echtpreise)',baseEUR:140,feesEUR:23,
 totalEUR:163,currency:'EUR',checkedAt:now,sourceUrl:'https://example.org/room',
 providerRequestId:'synthetic-request-only',availabilityConfirmed:true,sourceMethod:'provider-api'
};
const envelope=offers=>({status:'ok',verifiedByServer:true,query:lodge.query,offers});
test('derives dates, correct origin and count from existing trip stages',()=>{
 assert.equal(lodge.ok,true);assert.equal(lodge.query.startDate,'2027-01-12');
 assert.equal(lodge.query.endDate,'2027-01-20');assert.equal(lodge.query.people,2);
 assert.equal(transport.ok,true);assert.equal(transport.query.fromStageId,1);
 assert.equal(transport.query.fromName,'Rio de Janeiro');
 assert.equal(transport.query.startDate,transport.query.endDate);
 assert.equal(discovery.context(route,{type:'transport',stageId:0}).ok,false);
 assert.equal(discovery.context(route,{type:'lodging',stageId:2,people:0}).ok,false);
});
test('booking search link copies destination, check-in/out and guests, bus partner links do not pretend to pre-fill',()=>{
 const links=discovery.searchLinks(lodge.query);
 const u=new URL(links[0].url);
 assert.equal(u.hostname,'www.booking.com');assert.equal(u.searchParams.get('ss'),'Salvador');
 assert.equal(u.searchParams.get('checkin'),'2027-01-12');assert.equal(u.searchParams.get('checkout'),'2027-01-20');
 assert.equal(u.searchParams.get('group_adults'),'2');
 assert.deepEqual(discovery.searchLinks(transport.query).map(x=>x.name),['Busbud','Omio']);
});
test('static hosting 404, missing fetch or HTML cannot invent a price or call it bookable',async()=>{
 const a=await discovery.search(lodge.query,{now,fetchFn:async()=>mockResponse('',{status:404})});
 assert.equal(a.status,'unavailable');assert.deepEqual(a.offers,[]);
 const b=await discovery.search(lodge.query,{now,fetchFn:async()=>mockResponse('<html>','text/html')});
 assert.equal(b.status,'unavailable');assert.deepEqual(b.offers,[]);
 const c=await discovery.search(lodge.query,{now,fetchFn:null});
 assert.equal(c.status,'unavailable');assert.deepEqual(c.offers,[]);
});
test('server must return exact requested itinerary and verified envelope',async()=>{
 for(const bad of [
  {...envelope([providerOffer]),verifiedByServer:false},
  {...envelope([providerOffer]),query:{...lodge.query,people:1}},
  {...envelope([providerOffer]),query:{...lodge.query,destination:'Another city'}},
  {...envelope([providerOffer]),status:'error'}
 ]){
  const x=await discovery.search(lodge.query,{now,fetchFn:async()=>mockResponse(bad)});
  assert.equal(x.status,'unavailable');assert.deepEqual(x.offers,[]);
 }
});
test('rejects inaccurate, stale, cross-route, unpriced and unconfirmed synthetic offers',()=>{
 const cases=[
  {...providerOffer,startDate:'2027-01-13'},
  {...providerOffer,stageId:0},
  {...providerOffer,fromStageId:1},
  {...providerOffer,people:3},
  {...providerOffer,totalEUR:140},
  {...providerOffer,feesEUR:null},
  {...providerOffer,checkedAt:'2026-10-11'},
  {...providerOffer,sourceUrl:'javascript:alert(1)'},
  {...providerOffer,sourceMethod:'manual'},
  {...providerOffer,providerRequestId:''},
  {...providerOffer,availabilityConfirmed:false},
  {...providerOffer,currency:'USD'}
 ];
 for(const x of cases)assert.equal(discovery.validateProviderOffer(x,lodge.query,now),null);
});
test('only matching validated responses are displayed, sorted, never saved as bookings',async()=>{
 const second={...providerOffer,provider:'Günstiger Testanbieter',baseEUR:100,feesEUR:20,totalEUR:120,providerRequestId:'fake-2'};
 const r=await discovery.search(lodge.query,{now,fetchFn:async(uri,opts)=>{
  assert.equal(uri,'/api/offers/v1/search');assert.equal(opts.method,'POST');
  assert.deepEqual(JSON.parse(opts.body),lodge.query);
  return mockResponse(envelope([providerOffer,second,{...providerOffer,sourceMethod:'manual'}]));
 }});
 assert.equal(r.status,'ok');assert.equal(r.offers.length,2);assert.equal(r.rejected,1);
 assert.equal(r.offers[0].totalEUR,120);assert.equal(r.offers[0].booked,undefined);
 assert.equal(r.offers[0].availabilityConfirmed,true);
});
test('untrusted provider title and URLs are escaped from the result HTML',()=>{
 const html=discovery.resultMarkup({status:'ok',message:'Prüfung',offers:[{
  ...providerOffer,title:'<img src=x onerror=alert(1)>',provider:'Bad <b>name</b>',
  totalEUR:163
 }]});
 assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x onerror'));
 assert.ok(html.includes('&lt;b&gt;name'));
});
