const test=require('node:test'),assert=require('node:assert/strict');
const {parse,serialize,MAX_BYTES}=require('../state-backup.js');
const booking={id:'bus-001',type:'transport',stageId:1,fromStageId:0,title:'Bus',
  totalEUR:45,paidEUR:20,refundedEUR:0,currency:'EUR',transactions:[{id:'payment-1',kind:'payment',amount:20,currency:'EUR'}]};
const trip={goal:8000,cap:12000,reserve:2200,days:{1:4},actuals:{1:{transport:20}},
  bookingLedger:[booking],baseCurrency:'BRL',travelPreferences:{maxVolunteerHours:30},dailyRatesCache:{date:'2026-10-13',eur:{eur:1,brl:6}}};
test('current beta backups round-trip booking payments, user FX base and preferences',()=>{
 const json=serialize(trip),restored=parse(json);
 assert.equal(JSON.parse(json).version,4);
 assert.deepEqual(restored,trip);assert.equal(restored.bookingLedger[0].transactions[0].id,'payment-1');
});
test('legacy version 3 backups can be imported without inventing newer booking fields',()=>{
 const legacy={version:3,state:{goal:8000,cap:12000,days:{0:3},vol:{0:false}}};
 const state=parse(JSON.stringify(legacy));
 assert.deepEqual(state,legacy.state);
 assert.equal('bookingLedger' in state,false);
});
test('new plan replaces old plan: absent booking ledger is not merged with stale browser records',()=>{
 const old={goal:8000,cap:12000,bookingLedger:[booking]};
 const replacement=parse(JSON.stringify({version:4,state:{goal:7400,cap:12000,days:{1:5}}}));
 assert.equal('bookingLedger' in replacement,false);
 assert.equal(replacement.goal,7400);
 assert.equal(old.bookingLedger.length,1);
});
test('non-backup file and future unsupported version cannot mutate stored state',()=>{
 for(const input of ['','not-json','{}','{"state":{}}',JSON.stringify({version:99,state:{goal:8000}})]){
  assert.throws(()=>parse(input));
 }
});
test('invalid budget, ledger and nested state shapes are rejected',()=>{
 const invalid=[
  {goal:-1},{goal:12000,cap:8000},{days:[]},{actuals:'invalid'},
  {bookingLedger:{id:'not-an-array'}},{bookingLedger:[{id:'bad',type:'unknown'}]},
  {baseCurrency:'EURO'},{departures:['array-when-map-expected']}
 ];
 for(const state of invalid){
  assert.throws(()=>parse(JSON.stringify({version:4,state})),JSON.stringify(state));
 }
});
test('JSON prototype pollution keys and excessively nested documents are rejected',()=>{
 assert.throws(()=>parse('{"version":4,"state":{"__proto__":{"admin":true}}}'),/__proto__/);
 assert.throws(()=>parse(JSON.stringify({version:4,state:{actuals:{1:{constructor:{evil:true}}}}})),/constructor/);
 const nested={};let current=nested;
 for(let i=0;i<28;i++){current.x={};current=current.x}
 assert.throws(()=>parse(JSON.stringify({version:4,state:{actuals:nested}})),/verschachtelt/);
});
test('oversized exports are blocked before parsing or starting a download',()=>{
 assert.throws(()=>parse(' '.repeat(MAX_BYTES+1)),/8 MB/);
 assert.throws(()=>serialize({goal:8000,cap:12000,notes:'x'.repeat(MAX_BYTES)}),/8 MB/);
});
