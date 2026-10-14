const test=require('node:test'),assert=require('node:assert/strict');
const mod=require('../offer-shortlist.js');
const route=[{i:1,name:'Rio',start:'2027-01-03',end:'2027-01-08'},{i:2,name:'Salvador',start:'2027-01-08',end:'2027-01-18'}];
const offer={id:'a',type:'lodging',stageId:2,fromStageId:null,people:1,startDate:'2027-01-08',endDate:'2027-01-13',
 provider:'Hostel A',sourceUrl:'https://example.org/hostel',baseEUR:100,feesEUR:12,checkedAt:'2026-10-14'};
const today='2026-10-14';
test('valid manual quote captures full fees but never provider availability or booking',()=>{
 const x=mod.validate(offer,{route,now:today});assert.equal(x.ok,true);assert.equal(x.record.totalEUR,112);
 assert.equal(x.record.sourceMethod,'manual');assert.equal(x.record.availabilityConfirmed,false);assert.equal(x.record.booked,false);
});
test('non-HTTPS URL, negative fees, date mismatch and future checkedAt are rejected',()=>{
 for(const input of [{...offer,sourceUrl:'javascript:alert(1)'},{...offer,feesEUR:-1},{...offer,startDate:'2027-02-01'},{...offer,checkedAt:'2026-10-15'}]){
  assert.equal(mod.validate(input,{route,now:today}).ok,false);
 }
});
test('transport binds to actual preceding stage, allows same-day arrival, warns on reroute',()=>{
 const b={...offer,type:'transport',stageId:2,fromStageId:1,startDate:'2027-01-08',endDate:'2027-01-08'};
 assert.equal(mod.validate(b,{route,now:today}).ok,true);
 const changed=[{i:3,name:'Paraty',start:'2027-01-03',end:'2027-01-08'},route[1]];
 const x=mod.evaluate([b],{route:changed,now:today})[0];assert.equal(x.valid,false);
 assert.equal(x.status,'Nicht mehr passend');
});
test('only same-party same-period fresh quotes are price-ranked; stale quotes never live',()=>{
 const rows=mod.evaluate([offer,{...offer,id:'b',provider:'Hostel B',baseEUR:75,feesEUR:20},
  {...offer,id:'c',people:2,baseEUR:40},{...offer,id:'d',checkedAt:'2026-10-11',baseEUR:2}],
  {route,now:today});
 assert.equal(rows.find(r=>r.id==='b').lowest,true);
 assert.equal(rows.find(r=>r.id==='c').lowest,false);
 assert.equal(rows.find(r=>r.id==='d').fresh,false);
 assert.equal(rows.find(r=>r.id==='d').status,'Preisstand veraltet');
});
test('HTML escapes provider input and renders no implied bookable action',()=>{
 const text=mod.render({route,offers:[{...offer,provider:'<img src=x onerror=alert(1)>'}]});
 assert.ok(text.includes('&lt;img'));assert.ok(!text.includes('<img src=x onerror'));
 assert.ok(text.includes('keine Live-Abfrage'));
 assert.ok(!text.includes('data-oq-book'));
});
