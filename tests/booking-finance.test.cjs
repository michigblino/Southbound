const test=require('node:test'),assert=require('node:assert/strict');
const {normalize}=require('../booking-finance.js');
const sample={currency:'BRL',totalAmount:500,rateEUR:0.16,rateCheckedAt:'2026-10-13',rateSource:'Manual bank statement',paidEUR:0,refundedEUR:0};
const payment=(v={})=>({id:'p1',kind:'payment',date:'2026-10-13',amount:100,currency:'BRL',rateEUR:0.15,rateCheckedAt:'2026-10-13',rateSource:'Bank',recordedElsewhere:false,...v});
test('EUR legacy values remain unchanged without FX or transaction metadata',()=>{
 const n=normalize({totalEUR:45,paidEUR:20,refundedEUR:5,recordedElsewhere:true});
 assert.equal(n.ok,true);assert.equal(n.totalEUR,45);assert.equal(n.freshNet,0);assert.equal(n.journalNet,15);
});
test('foreign booking quote and actual payment use independent evidenced rates',()=>{
 const n=normalize({...sample,transactions:[payment()]});
 assert.equal(n.ok,true);assert.equal(n.totalEUR,80);assert.equal(n.paidEUR,15);assert.equal(n.freshNet,15);
 assert.equal(n.transactions[0].amountEUR,15);
 assert.equal(n.currency,'BRL');assert.equal(n.rateEUR,0.16);
});
test('an additional foreign-currency refund uses the actual refund rate',()=>{
 const n=normalize({...sample,transactions:[payment({amount:200}),payment({id:'r',kind:'refund',amount:50,rateEUR:0.19})]});
 assert.equal(n.ok,true);assert.equal(n.paidEUR,30);assert.equal(n.refundedEUR,9.5);
 assert.equal(n.freshNet,20.5);
});
test('different currency on the payment is allowed with its own FX',()=>{
 const n=normalize({...sample,transactions:[payment({currency:'USD',amount:30,rateEUR:0.90})]});
 assert.equal(n.ok,true);assert.equal(n.paidEUR,27);assert.equal(n.totalEUR,80);
});
test('missing/manual-only FX metadata never silently treats a foreign price as euros',()=>{
 for(const patch of [{rateEUR:''},{rateCheckedAt:''},{rateSource:''}]){
  const r=normalize({...sample,...patch});assert.equal(r.ok,false);
  assert.ok(r.errors.includes('fx-source-and-date-required'));
 }
 const r=normalize({...sample,transactions:[payment({rateSource:''})]});
 assert.equal(r.ok,false);assert.ok(r.errors.includes('payment-fx-source-and-date-required'));
});
test('journal-paid event needs a manually entered journal reference',()=>{
 const x=normalize({...sample,transactions:[payment({recordedElsewhere:true})]});
 assert.equal(x.ok,false);assert.ok(x.errors.includes('journal-reference-required'));
 const y=normalize({...sample,transactions:[payment({recordedElsewhere:true,journalReference:'Lodging actual in stage journal'})]});
 assert.equal(y.ok,true);assert.equal(y.journalNet,15);assert.equal(y.freshNet,0);
});
test('duplicate payment ids, refunds beyond charges and converted amounts beyond total are blocked',()=>{
 const repeated=normalize({...sample,transactions:[payment(),payment()]});
 assert.equal(repeated.ok,false);assert.ok(repeated.errors.includes('invalid-or-duplicate-payment-id'));
 const refund=normalize({...sample,transactions:[payment(),payment({id:'refund',kind:'refund',amount:200})]});
 assert.equal(refund.ok,false);assert.ok(refund.errors.includes('refund-exceeds-payments'));
 const over=normalize({...sample,transactions:[payment({amount:1000})]});
 assert.equal(over.ok,false);assert.ok(over.errors.includes('payments-exceed-converted-total'));
});
test('adding an event keeps legacy aggregates without inventing their payment dates',()=>{
 const n=normalize({totalEUR:100,transactions:[payment({currency:'EUR',amount:10})],
  legacyPaidEUR:25,legacyRefundedEUR:5,legacyRecordedElsewhere:true});
 assert.equal(n.ok,true);assert.equal(n.paidEUR,35);assert.equal(n.refundedEUR,5);
 assert.equal(n.journalNet,20);assert.equal(n.freshNet,10);assert.equal(n.legacyPaidEUR,25);
});
test('bad currency codes and malformed transaction dates fail',()=>{
 assert.ok(normalize({...sample,currency:'BRL!'}).errors.includes('invalid-currency'));
 assert.ok(normalize({...sample,transactions:[payment({date:'2026-02-30'})]}).errors.includes('invalid-payment-event'));
});
