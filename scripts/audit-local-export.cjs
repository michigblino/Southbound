/* Local-only export audit. NEVER upload the JSON backup to GitHub or network. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const mod of ['transport-estimate','cost-references','itinerary','booking-finance','booking-ledger','trip-calendar','wait-costs','route-timing','budget-engine','route-budget','route-budget-variants','trip-reprice','price-evidence'])require(path.join(root,mod+'.js'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf('const STOPS='),end=html.indexOf('];',start);
if(start<0||end<0)throw Error('Public stop definitions not found');
const stops=JSON.parse(html.slice(start+'const STOPS='.length,end+1));
const file=process.argv[2];
if(!file){process.stderr.write('Usage: node scripts/audit-local-export.cjs /path/to/southbound-backup.json\n');process.exitCode=2;}
else {
 const exportData=JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));
 if(!exportData||typeof exportData.state!=='object'||Array.isArray(exportData.state))throw Error('Invalid export structure');
 const s=exportData.state,chosen=Array.isArray(s.routeOrder)&&s.routeOrder.length?s.routeOrder:stops.map((_,i)=>i);
 if(chosen.some(i=>!Number.isInteger(i)||i<0||i>=stops.length))throw Error('Export contains route IDs that require a newer stop catalog');
 const inputs={stops,start:s.tripStart||'2026-12-28',fx:Number(s.fx?.usdEur)||0,quotes:s.hostelQuotes||{},
  transportOffers:s.transportOffers||{},vol:s.vol||{},volunteerDetails:s.volunteerDetails||{},
  days:s.days||{},order:chosen,excluded:s.excluded||{},bookings:s.bookingLedger||{},actuals:s.actuals||{},
  extraPaid:(s.extraStops||[]).reduce((a,x)=>a+(Number(x.cost)||0),0),
  reserve:Number(s.reserve)||0,goal:Number(s.goal)||8000,cap:Number(s.cap)||12000,
  fixedCosts:s.fixedCosts||{},completed:s.visited||{},transferDaysByStop:s.transferDaysByStop||{},
  originRequired:!!s.tripOrigin};
 const current=globalThis.SouthboundTripReprice.reprice(inputs);
 const advice=globalThis.SouthboundBudgetVariants.optimize({
   items:current.items,bookings:inputs.bookings,vol:inputs.vol,
   volunteerDetails:inputs.volunteerDetails,completed:inputs.completed,
   preferences:s.travelPreferences||{},goal:inputs.goal,baselineTotal:current.estimatedTotal});
 const alternatives=globalThis.SouthboundTripReprice.compare(inputs,advice.options).alternatives;
 const source=globalThis.SouthboundPriceEvidence.evaluate({items:current.items,ledger:current.ledger,
  snapshot:current.snapshot,quotes:inputs.quotes,fixedCosts:current.priceInputs.fixedCosts,fx:inputs.fx});
 const report={localOnly:true,stages:current.items.length,tripDays:current.items.filter(x=>!x.isReturn).reduce((n,x)=>n+x.days,0),
  referenceBaselineEUR:current.estimatedTotal,missingCostItems:current.snapshot.missingCount,
  sourceCounts:source.totals,unverified:current.warnings,
  routes:alternatives.map(x=>({mode:x.mode,estimateEUR:x.forecast,modeledSavingsEUR:x.hypotheticalSaving,
   daysChange:x.daysDelta,unconfirmedHostNights:x.hostNights,unverified:x.warnings.length>0}))};
 console.log(JSON.stringify(report,null,2));
}
