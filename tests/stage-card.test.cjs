const test=require('node:test'),assert=require('node:assert/strict');
const card=require('../stage-card.js');
const item={i:1,name:'Salento',start:'2027-01-03',arrival:'2027-01-03',end:'2027-01-06',days:3};
const previous={i:0,name:'Medellín'};
const make=(opts={})=>card.summarize({item,previous,bookings:[],ledger:{matched:[],warnings:[]},...opts});
const status=(x,type)=>x.rows.find(row=>row.type===type);
const ticket={id:'t1',type:'transport',stageId:1,status:'confirmed',totalEUR:42,paidEUR:0,refundedEUR:0};
test('stage shows four accessible booking action rows with outline icons',()=>{
 const x=make(),html=card.render(x);
 assert.deepEqual(x.rows.map(r=>r.type),['transport','lodging','volunteering','activity']);
 assert.equal(status(x,'transport').label,'Offen');
 assert.equal(status(x,'volunteering').label,'Optional');
 assert.match(html,/data-stage-action="transport"/);
 assert.match(html,/viewBox="0 0 24 24"/);
 assert.match(html,/Medellín → Salento/);
 assert.match(html,/aria-label="Transfer:/);
});
test('confirmed transport only appears confirmed if reconciled into current route',()=>{
 const matched=make({bookings:[ticket],ledger:{matched:['t1'],warnings:[]}});
 assert.equal(status(matched,'transport').label,'Bestätigt');
 assert.equal(status(matched,'transport').editId,'t1');
 const stale=make({bookings:[ticket],ledger:{matched:[],warnings:[{id:'t1',reason:'transfer-route-or-date-changed'}]}});
 assert.equal(status(stale,'transport').label,'Prüfen');
 assert.equal(status(stale,'transport').kind,'warning');
});
test('fully paid booking marked paid, refunded and free booking do not claim paid',()=>{
 const src={...ticket,paidEUR:42};
 assert.equal(status(make({bookings:[src],ledger:{matched:['t1']}}),'transport').label,'Bezahlt');
 assert.equal(status(make({bookings:[{...src,refundedEUR:5}],ledger:{matched:['t1']}}),'transport').label,'Bestätigt');
 assert.equal(status(make({bookings:[{...src,totalEUR:0,paidEUR:0}],ledger:{matched:['t1']}}),'transport').label,'Bestätigt');
});
test('unconfirmed price and hostel quote never imply booking',()=>{
 const x=make({manualTicket:true,hostelQuote:true});
 assert.equal(status(x,'transport').label,'Preis geprüft');
 assert.equal(status(x,'lodging').label,'Preis notiert');
});
test('volunteer host acceptance is independent and hours above preference are flagged',()=>{
 const x=make({hostConfirmed:true,hostHours:35,maxVolunteerHours:30});
 assert.equal(status(x,'volunteering').label,'Host bestätigt');
 assert.equal(status(x,'volunteering').exceedsHourPreference,true);
 assert.match(status(x,'volunteering').subtitle,/über Wunschlimit/);
});
test('initial stage has no nonexistent incoming transfer',()=>{
 const x=card.summarize({item:{...item,i:0},previous:null});
 assert.equal(status(x,'transport').label,'Startort');
 assert.equal(status(x,'transport').disabled,true);
});
test('untrusted booking name and provider never injected into HTML',()=>{
 const x=make({item:{...item,name:'<img src=x onerror=alert(1)>'}});
 const markup=card.render(x);
 assert.ok(!markup.includes('name:"<img'));
 assert.match(markup,/&lt;img src=x/);
 assert.doesNotMatch(markup,/<img src=x/);
});
