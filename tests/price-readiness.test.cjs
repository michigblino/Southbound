const test=require('node:test'),assert=require('node:assert/strict');
const {auditOffer,readiness}=require('../price-readiness.js');
const base={type:'lodging',totalEUR:125,baseEUR:110,feesEUR:15,currency:'EUR',startDate:'2027-01-04',endDate:'2027-01-09',
 people:1,provider:'Example Hotel',url:'https://example.org/stay',checkedAt:'2026-10-14'};
const opts={type:'lodging',start:'2027-01-04',end:'2027-01-09',people:1,today:'2026-10-14'};
test('documented manual offer is not live provider availability',()=>{
 const a=auditOffer(base,opts);assert.equal(a.sourced,true);assert.equal(a.providerConfirmed,false);assert.equal(a.priceEUR,125);
});
test('mismatch, missing fees, stale checkedAt and future source are invalid',()=>{
 for(const x of [{...base,endDate:'2027-01-10'},{...base,totalEUR:110},{...base,feesEUR:null},{...base,checkedAt:'2026-10-01'},{...base,url:'http://example.org'}]){
  assert.equal(auditOffer(x,opts).sourced,false);
 }
});
test('real-time API claim needs provider request ID and explicit confirmed availability',()=>{
 assert.equal(auditOffer({...base,sourceMethod:'provider-api',availabilityConfirmed:true},opts).providerConfirmed,false);
 assert.equal(auditOffer({...base,sourceMethod:'provider-api',availabilityConfirmed:true,providerRequestId:'request-1'},opts).providerConfirmed,true);
});
test('missing ticket or lodging remains work to check and is never zero priced',()=>{
 const r=readiness({today:'2026-10-14',items:[{i:0,name:'Rio',days:4,start:'2027-01-01',end:'2027-01-05',bed:24,leg:0},
  {i:1,name:'Salvador',days:25,start:'2027-01-05',end:'2027-01-30',bed:13,leg:null}],fixedCosts:{insurance:null,visas:null,equipment:null,return:null}});
 assert.equal(r.quoteGap,2);assert.equal(r.transferGap,1);assert.equal(r.providerCoverage,0);
 assert.ok(r.tasks.some(x=>x.name==='Salvador'&&x.type==='transport'));
});
