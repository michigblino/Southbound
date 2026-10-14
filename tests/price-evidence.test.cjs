const test=require('node:test'),assert=require('node:assert/strict');
require('../price-evidence.js');const audit=globalThis.SouthboundPriceEvidence.evaluate;
test('unknown and user-entered fixed prices cannot be reported as confirmed provider fares',()=>{
 const result=audit({items:[{i:0,days:7,regularBed:14}],snapshot:{lines:[
  {label:'Aufenthalt 0',amount:98},{label:'Transfer 1',amount:null},
  {label:'Versicherung',amount:145}]},fixedCosts:{insurance:145},ledger:{records:[],matched:[]}});
 assert.equal(result.totals.booked,0);assert.equal(result.totals.unknown,1);
 assert.equal(result.totals.manual,1);assert.equal(result.providerVerified,false);
});
test('confirmed but partially covered lodging remains mixed estimate',()=>{
 const result=audit({items:[{i:0,days:10,bookingLodgings:[{id:'stay',startDate:'2027-02-01',endDate:'2027-02-04'}]}],
  snapshot:{lines:[{label:'Aufenthalt 0',amount:120}]},
  ledger:{matched:['stay'],records:[{id:'stay',status:'confirmed',provider:'Hostel',type:'lodging'}]}});
 assert.equal(result.rows[0].kind,'manual');
});
test('dated user fare quote is not itself a confirmed booking',()=>{
 const result=audit({items:[{i:1,transportOffer:{operator:'Test rail',checkedAt:'2026-10-14',url:'https://example.org/fare'}}],
  snapshot:{lines:[{label:'Transfer 1',amount:44}]},ledger:{records:[],matched:[]}});
 assert.equal(result.rows[0].kind,'dated-offer');assert.equal(result.rows[0].checkedAt,'2026-10-14');
});
