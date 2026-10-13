const test=require('node:test'),assert=require('node:assert/strict');
const {run,makeReport}=require('./beta-journey-fixture.cjs');
const lines=r=>Object.fromEntries(r.budget.lines.map(x=>[x.label,x.amount]));
test('synthetic four-city journey reconciles check-in/out, host waiting, foreign flight and activity',()=>{
 const {plan,ledger,timing,budget,waitPaid}=run();
 assert.equal(plan.items.length,4);
 assert.equal(plan.items[2].arrival,'2027-02-08');
 assert.equal(plan.items[2].start,'2027-02-11');
 assert.equal(plan.items[2].end,'2027-02-16');
 assert.equal(plan.items[3].start,'2027-02-16');
 assert.equal(timing.waiting.total,93);
 assert.equal(timing.waiting.complete,true);
 assert.equal(timing.feasible,true);
 assert.equal(ledger.bookingIntegrity,true,JSON.stringify(ledger.warnings));
 assert.equal(ledger.items[0].stay,220);
 assert.equal(ledger.items[1].stay,139);
 assert.equal(ledger.items[1].leg,75);
 assert.equal(ledger.items[2].stay,95);
 assert.equal(ledger.items[2].leg,110);
 assert.equal(ledger.items[3].stay,214);
 assert.equal(ledger.items[3].leg,90);
 assert.equal(ledger.items[2].waitBookings.length,2);
 assert.equal(waitPaid,25);
 assert.equal(ledger.typedPaidByStop[1].stay,50);
 assert.equal(ledger.typedPaidByStop[1].transfer,20);
 assert.equal(ledger.typedPaidByStop[2].wait,25);
 assert.equal(ledger.typedPaidByStop[3].transfer,27.6);
 assert.equal(ledger.extraPaid,132.6);
 assert.equal(budget.goal,8000);
 assert.equal(budget.cap,12000);
 assert.equal(budget.reserve,1200);
 assert.equal(budget.totalEstimate,3306);
 assert.equal(budget.complete,true,JSON.stringify(budget.incompleteReasons));
 assert.equal(budget.allInVerified,false); // NEVER call illustrative prices independently provider-verified.
});
test('independent line-by-line oracle: paid + outstanding + fixed + reserve == forecast',()=>{
 const {budget}=run();const l=lines({budget});
 assert.deepEqual({
  rioStay:l['Aufenthalt 0'],salvadorStay:l['Aufenthalt 1'],salvadorTransfer:l['Transfer 1'],
  medellinStay:l['Aufenthalt 2'],medellinTransfer:l['Transfer 2'],
  cuscoStay:l['Aufenthalt 3'],cuscoTransfer:l['Transfer 3'],waiting:l['Wartekosten']
 },{rioStay:220,salvadorStay:89,salvadorTransfer:55,medellinStay:95,medellinTransfer:110,cuscoStay:214,cuscoTransfer:62.4,waiting:68});
 const fixed=800+180+0+80;
 const actualPaid=30+20+20+15+10+27.6+(30-20); // include non-refundable cancelled cost
 const unpaidRoute=220+89+55+95+110+214+62.4+68;
 assert.equal(actualPaid,132.6);
 assert.equal(Number((actualPaid+unpaidRoute+fixed+1200).toFixed(2)),3306);
 assert.equal(budget.totalEstimate,actualPaid+unpaidRoute+fixed+1200);
 assert.equal(budget.goalGap,0);
 assert.equal(budget.budgetHeadroom,4694);
 assert.equal(budget.capHeadroom,8694);
});
test('higher real-world extras cross 8k target then 12k hard cap without mislabeling headroom',()=>{
 const overGoal=run({additionalCosts:5200}).budget;
 assert.equal(overGoal.totalEstimate,8506);
 assert.equal(overGoal.budgetVerdict,'over-estimate');
 assert.equal(overGoal.minimumGoalOverrun,506);
 assert.equal(overGoal.minimumCapOverrun,0);
 const overCap=run({additionalCosts:9000}).budget;
 assert.equal(overCap.totalEstimate,12306);
 assert.equal(overCap.minimumCapOverrun,306);
});
test('unknown return fare is never classified as a complete affordable trip',()=>{
 const r=run({unknownReturn:true});
 assert.equal(r.budget.complete,false);
 assert.ok(r.budget.incompleteReasons.includes('missing-fixed-costs'));
 assert.equal(r.budget.goalStatus,'unverified');
 assert.equal(r.budget.budgetVerdict,'incomplete');
});
test('missing transfer durations mean the cost estimate cannot certify route timing',()=>{
 const r=run({withTransferDates:false});
 assert.equal(r.timing.feasible,false);
 assert.deepEqual(r.timing.unknownTransferDays,[1,2,3]);
 assert.equal(r.budget.complete,false);
 assert.ok(r.budget.incompleteReasons.includes('unverified-route-dates'));
});
test('a changed flight date retains paid funds but does not silently replace a new leg',()=>{
 const r=run({misdatedFlight:true});
 assert.equal(r.ledger.bookingIntegrity,false);
 assert.equal(r.ledger.items[3].leg,150); // original estimated fare, no stale booking price reuse
 assert.equal(r.ledger.extraPaid,132.6); // already paid charge still sunk
 assert.equal(r.budget.complete,false);
 assert.ok(r.budget.incompleteReasons.includes('booking-records-need-review'));
 assert.equal(r.budget.goalStatus,'unverified');
});
test('machine-readable beta audit report explicitly declares its synthetic provenance',()=>{
 const x=makeReport();
 assert.equal(x.fixture,'synthetic-test-only');
 assert.equal(x.providerDataVerified,false);
 assert.equal(x.livePriceClaims,false);
 assert.equal(x.sums.forecastAllInEUR,3306);
 assert.equal(x.sums.completeInFixture,true);
 assert.equal(x.unverifiedWithoutRealProviderEvidence,true);
 assert.equal(x.dates.length,4);
});
